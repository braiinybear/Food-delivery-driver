import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, Pressable, RefreshControl } from "react-native";
import RazorpayCheckout from "react-native-razorpay";
import { useTheme } from "@/context/ThemeContext";
import { FontSize, Fonts } from "@/constants/typography";
import { useDriverEarnings } from "@/hooks/useDriverOrders";
import { useUser } from "@/hooks/useUser";
import { SafeAreaView } from "react-native-safe-area-context";
import { useWithdrawalRequests, useRequestWithdrawal, useWalletTransactions, useWalletTopUp, useVerifyWalletTopUp } from "@/hooks/useWallet";

const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? "rzp_test_XXXXXXXX";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

function txLabel(type: string): string {
  const t = type.toUpperCase();
  if (t === 'TOPUP') return 'Wallet Top-up';
  if (t.startsWith('ORDER_PAYMENT')) return 'Order Payment';
  if (t.startsWith('WITHDRAWAL_HOLD')) return 'Withdrawal (On Hold)';
  if (t.startsWith('WITHDRAWAL_REJECTED')) return 'Withdrawal Refund';
  if (t.startsWith('WITHDRAWAL')) return 'Withdrawal Paid';
  if (t.startsWith('RESTAURANT_PAYOUT')) return 'Earnings Settlement';
  if (t.startsWith('COD_RESTAURANT_PAYOUT')) return 'COD Settlement';
  if (t.startsWith('DELIVERY_EARNING')) return 'Delivery Earning';
  if (t.startsWith('COD_COLLECTION')) return 'Cash Remittance';
  return type;
}


export default function WalletScreen() {
  const { Colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);
  const { data: earnings, isLoading: earningsLoading, refetch: refetchEarnings } = useDriverEarnings();

  const [isWithdrawModalVisible, setIsWithdrawModalVisible] = React.useState(false);
  const [modalTab, setModalTab] = React.useState<"request" | "history">("request");

  // Form states
  const [amount, setAmount] = React.useState("");
  const [bankAccountName, setBankAccountName] = React.useState("");
  const [bankAccountNumber, setBankAccountNumber] = React.useState("");
  const [ifscCode, setIfscCode] = React.useState("");

  // History query and mutate
  const { data: withdrawalsData, isLoading: historyLoading, refetch: refetchWithdrawals } = useWithdrawalRequests(1, 20);
  const { 
    data: txPagedData, 
    isLoading: txLoading,
    fetchNextPage: txFetchNextPage,
    hasNextPage: txHasNextPage,
    isFetchingNextPage: txFetchingMore,
    refetch: refetchTransactions
  } = useWalletTransactions(10);
  const transactionsList = React.useMemo(() => txPagedData?.pages.flatMap((p) => p.data) ?? [], [txPagedData]);
  const requestWithdrawal = useRequestWithdrawal();

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchEarnings(),
        refetchWithdrawals(),
        refetchTransactions(),
      ]);
    } catch (error) {
      console.error("Error refreshing wallet data:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchEarnings, refetchWithdrawals, refetchTransactions]);

  const handleSubmitWithdrawal = () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid positive number.");
      return;
    }
    if (earnings && amt > earnings.walletBalance) {
      Alert.alert("Insufficient Balance", "You cannot withdraw more than your wallet balance.");
      return;
    }
    if (amt < 100) {
      Alert.alert("Minimum Limit", "The minimum withdrawal amount is ₹100.");
      return;
    }
    if (!bankAccountName.trim()) {
      Alert.alert("Missing Field", "Please enter the bank account holder's name.");
      return;
    }
    if (!bankAccountNumber.trim() || bankAccountNumber.length < 8) {
      Alert.alert("Invalid Account Number", "Please enter a valid bank account number.");
      return;
    }
    if (!ifscCode.trim()) {
      Alert.alert("Missing Field", "Please enter the IFSC code.");
      return;
    }

    requestWithdrawal.mutate({
      amount: amt,
      bankAccountName: bankAccountName.trim(),
      bankAccountNumber: bankAccountNumber.trim(),
      ifscCode: ifscCode.toUpperCase().trim(),
    }, {
      onSuccess: () => {
        Alert.alert("Success", "Your payout request has been successfully submitted.");
        setAmount("");
        setBankAccountName("");
        setBankAccountNumber("");
        setIfscCode("");
        setModalTab("history");
      },
      onError: (err: any) => {
        const msg = err.response?.data?.message || err.message || "Failed to request withdrawal. Please try again.";
        Alert.alert("Request Failed", msg);
      }
    });
  };

  // Top-Up states and mutations
  const { data: user } = useUser();
  const topUpMutation = useWalletTopUp();
  const verifyMutation = useVerifyWalletTopUp();

  const [isTopUpModalVisible, setIsTopUpModalVisible] = React.useState(false);
  const [topUpAmount, setTopUpAmount] = React.useState("");
  const [topUpStep, setTopUpStep] = React.useState<"idle" | "creating" | "awaiting" | "verifying" | "success" | "failed">("idle");
  const [topUpError, setTopUpError] = React.useState<string | null>(null);

  const handleTopUp = async () => {
    const amt = parseFloat(topUpAmount);
    if (isNaN(amt) || amt < 10) {
      Alert.alert("Invalid Amount", "Minimum top up amount is ₹10.");
      return;
    }
    setTopUpError(null);
    try {
      setTopUpStep("creating");
      const topUpData = await topUpMutation.mutateAsync({ amount: amt });
      const { razorpayOrder } = topUpData;

      setTopUpStep("awaiting");
      const options = {
        description: "Driver Wallet Top-up",
        currency: razorpayOrder.currency ?? "INR",
        key: RAZORPAY_KEY_ID,
        amount: String(razorpayOrder.amount),
        name: "Braiiny Food",
        order_id: razorpayOrder.id,
        prefill: {
          email: user?.email ?? "",
          contact: user?.phoneNumber ?? "",
          name: user?.name ?? "",
        },
        theme: { color: Colors.primary },
      };

      const response = await RazorpayCheckout.open(options);
      setTopUpStep("verifying");
      await verifyMutation.mutateAsync({
        razorpayPaymentId: response.razorpay_payment_id,
        razorpayOrderId: response.razorpay_order_id,
        razorpaySignature: response.razorpay_signature,
      });
      setTopUpStep("success");
      setTimeout(() => {
        setIsTopUpModalVisible(false);
        setTopUpStep("idle");
        setTopUpAmount("");
      }, 1500);
    } catch (err: any) {
      setTopUpStep("failed");
      setTopUpError(err?.description ?? err?.message ?? "Top-up failed.");
    }
  };

  if (earningsLoading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (!earnings) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background }}>
        <Text style={{ fontFamily: Fonts.brand, fontSize: FontSize.md, color: Colors.muted }}>No earnings data available.</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Fixed Wallet Card at top */}
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 }}>
        <View style={[styles.walletCard, { flexDirection: 'column', alignItems: 'stretch', overflow: 'hidden' }]}>
          {/* Background Decorative Circles */}
          <View style={{
            position: 'absolute',
            top: -60,
            right: -40,
            width: 150,
            height: 150,
            borderRadius: 75,
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
          }} />
          <View style={{
            position: 'absolute',
            bottom: -50,
            left: -20,
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
          }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={styles.walletLeft}>
              <View style={styles.walletIconCircle}>
                <Ionicons name="wallet-outline" size={18} color="#EAB308" />
              </View>
              <View>
                <Text style={styles.walletLabel}>Wallet Balance</Text>
                <Text style={[styles.walletAmount, { color: (earnings.walletBalance || 0) < 0 ? '#F87171' : '#EAB308' }]}>
                  ₹{(earnings.walletBalance || 0).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.walletCardActions}>
            <TouchableOpacity 
              style={styles.walletActionBtn} 
              onPress={() => setIsWithdrawModalVisible(true)}
            >
              <Ionicons name="cash-outline" size={16} color="#FFF" />
              <Text style={styles.walletActionBtnText}>Withdraw</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.walletActionBtn, styles.walletActionBtnPrimary]} 
              onPress={() => setIsTopUpModalVisible(true)}
            >
              <Ionicons name="add-circle-outline" size={16} color="#0F172A" />
              <Text style={styles.walletActionBtnTextPrimary}>Top Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Scrollable Transactions Area */}
      <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 12 }}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {txLoading ? (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : transactionsList.length === 0 ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.statCard, { paddingVertical: 30, alignItems: "center", width: "100%", flexGrow: 1, justifyContent: "center" }]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.primary]}
                tintColor={Colors.primary}
              />
            }
          >
            <Ionicons name="swap-horizontal-outline" size={32} color={Colors.muted} />
            <Text style={{ fontFamily: Fonts.brand, fontSize: FontSize.sm, color: Colors.muted, marginTop: 8 }}>No transaction history found.</Text>
          </ScrollView>
        ) : (
          <View style={[styles.statCard, { alignItems: "stretch", paddingVertical: 0, paddingHorizontal: 0, width: "100%", overflow: 'hidden', flex: 1 }]}>
            <ScrollView 
              contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 16 }}
              showsVerticalScrollIndicator={true}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[Colors.primary]}
                  tintColor={Colors.primary}
                />
              }
            >
              {transactionsList.map((item, index) => {
                const isLast = index === transactionsList.length - 1;
                const credit = item.direction === "CREDIT";
                return (
                  <View key={item.id} style={isLast ? styles.lastTxRow : styles.txRow}>
                    <View style={[styles.iconContainer, { backgroundColor: credit ? (isDark ? '#1B2E1E' : '#E8F5E9') : (isDark ? '#2E1010' : '#FFEBEE') }]}>
                      <Ionicons
                        name={credit ? "arrow-down-circle-outline" : "arrow-up-circle-outline"}
                        size={20}
                        color={credit ? (isDark ? '#4ADE80' : Colors.success) : (isDark ? '#F87171' : '#D32F2F')}
                      />
                    </View>
                    <View style={styles.txMeta}>
                      <Text style={styles.txTitle} numberOfLines={1}>{txLabel(item.type)}</Text>
                      <Text style={styles.txDate}>
                        {new Date(item.createdAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </Text>
                    </View>
                    <Text style={[styles.txAmount, { color: credit ? (isDark ? '#4ADE80' : Colors.success) : (isDark ? '#F87171' : '#D32F2F') }]}>
                      {credit ? "+" : "-"}₹{item.amount.toFixed(0)}
                    </Text>
                  </View>
                );
              })}

              {txFetchingMore && (
                <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                </View>
              )}

              {!txFetchingMore && txHasNextPage && (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={() => txFetchNextPage()}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chevron-down" size={14} color={Colors.primary} />
                  <Text style={styles.loadMoreText}>Load More</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        )}
      </View>

      {/* ── Top Up Modal ── */}
      <Modal
        visible={isTopUpModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsTopUpModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setIsTopUpModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Top Up Wallet</Text>
              <TouchableOpacity onPress={() => setIsTopUpModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {topUpStep === "idle" ? (
              <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
                <View style={[styles.statCard, { padding: 16, marginBottom: 16, width: '100%', alignItems: 'center' }]}>
                  <Text style={{ fontSize: 13, color: Colors.muted, fontFamily: Fonts.brand }}>Current Balance</Text>
                  <Text style={{ fontSize: 24, fontFamily: Fonts.brandBlack, color: (earnings.walletBalance || 0) < 0 ? '#EF4444' : Colors.text, marginTop: 4 }}>
                    ₹{(earnings.walletBalance || 0).toFixed(2)}
                  </Text>
                </View>

                {/* Amount Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Amount to Deposit (₹)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 500"
                    placeholderTextColor={Colors.muted}
                    keyboardType="numeric"
                    value={topUpAmount}
                    onChangeText={setTopUpAmount}
                  />
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.submitButton, { marginTop: 16 }]}
                  onPress={handleTopUp}
                >
                  <Text style={styles.submitButtonText}>Pay with Razorpay</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <View style={styles.statusContainer}>
                {topUpStep === "creating" && <ActivityIndicator size="large" color={Colors.primary} />}
                {topUpStep === "awaiting" && <ActivityIndicator size="large" color={Colors.primary} />}
                {topUpStep === "verifying" && <ActivityIndicator size="large" color={Colors.primary} />}
                {topUpStep === "success" && <Ionicons name="checkmark-circle" size={56} color="#22C55E" />}
                {topUpStep === "failed" && <Ionicons name="close-circle" size={56} color="#EF4444" />}
                
                <Text style={styles.statusTextState}>
                  {topUpStep === "creating" && "Creating payment order..."}
                  {topUpStep === "awaiting" && "Opening payment gateway..."}
                  {topUpStep === "verifying" && "Verifying payment..."}
                  {topUpStep === "success" && "Top up successful!"}
                  {topUpStep === "failed" && (topUpError ?? "Payment failed.")}
                </Text>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Withdrawal Modal ── */}
      <Modal
        visible={isWithdrawModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsWithdrawModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setIsWithdrawModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payouts & Withdrawals</Text>
              <TouchableOpacity onPress={() => setIsWithdrawModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* Segmented Control / Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, modalTab === "request" && styles.activeTabButton]}
                onPress={() => setModalTab("request")}
              >
                <Text style={[styles.tabText, modalTab === "request" && styles.activeTabText]}>Request Payout</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, modalTab === "history" && styles.activeTabButton]}
                onPress={() => setModalTab("history")}
              >
                <Text style={[styles.tabText, modalTab === "history" && styles.activeTabText]}>History</Text>
              </TouchableOpacity>
            </View>

            {modalTab === "request" ? (
              <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
                <View style={styles.balanceInfoBox}>
                  <Text style={styles.balanceInfoLabel}>Available Balance</Text>
                  <Text style={styles.balanceInfoValue}>₹{(earnings.walletBalance || 0).toFixed(2)}</Text>
                </View>

                {/* Amount Input */}
                <View style={styles.inputGroup}>
                  <View style={styles.inputHeaderRow}>
                    <Text style={styles.inputLabel}>Withdrawal Amount (₹)</Text>
                    <TouchableOpacity onPress={() => setAmount(Math.floor(earnings.walletBalance).toString())}>
                      <Text style={styles.quickActionText}>Withdraw All</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Min. ₹100"
                    placeholderTextColor={Colors.muted}
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                  />
                </View>

                {/* Account Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Bank Account Holder Name</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter Account Holder Name"
                    placeholderTextColor={Colors.muted}
                    value={bankAccountName}
                    onChangeText={setBankAccountName}
                  />
                </View>

                {/* Account Number */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Bank Account Number</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter Bank Account Number"
                    placeholderTextColor={Colors.muted}
                    keyboardType="numeric"
                    value={bankAccountNumber}
                    onChangeText={setBankAccountNumber}
                  />
                </View>

                {/* IFSC Code */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>IFSC Code</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. HDFC0001234"
                    placeholderTextColor={Colors.muted}
                    autoCapitalize="characters"
                    value={ifscCode}
                    onChangeText={setIfscCode}
                  />
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleSubmitWithdrawal}
                  disabled={requestWithdrawal.isPending}
                >
                  {requestWithdrawal.isPending ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Request</Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.disclaimerText}>
                  * Payouts are processed within 24-48 business hours. Please verify your banking details before submitting.
                </Text>
              </ScrollView>
            ) : (
              <View style={{ flex: 1 }}>
                {historyLoading ? (
                  <View style={styles.centeredLoading}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                  </View>
                ) : !withdrawalsData?.data || withdrawalsData.data.length === 0 ? (
                  <View style={styles.emptyHistoryContainer}>
                    <Ionicons name="receipt-outline" size={48} color={Colors.muted} />
                    <Text style={styles.emptyHistoryText}>No withdrawal history found.</Text>
                  </View>
                ) : (
                  <ScrollView contentContainerStyle={styles.historyList}>
                    {withdrawalsData.data.map((item) => (
                      <View key={item.id} style={styles.historyCard}>
                        <View style={styles.historyCardHeader}>
                          <View>
                            <Text style={styles.historyAmountText}>₹{item.amount.toFixed(0)}</Text>
                            <Text style={styles.historyDateText}>
                              {new Date(item.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Text>
                          </View>
                          <View style={[
                            styles.statusBadge,
                            item.status === 'APPROVED' && styles.statusApproved,
                            item.status === 'REJECTED' && styles.statusRejected,
                            item.status === 'HELD' && styles.statusHeld,
                            item.status === 'PENDING' && styles.statusPending,
                          ]}>
                            <Text style={[
                              styles.statusBadgeText,
                              item.status === 'APPROVED' && styles.statusApprovedText,
                              item.status === 'REJECTED' && styles.statusRejectedText,
                              item.status === 'HELD' && styles.statusHeldText,
                              item.status === 'PENDING' && styles.statusPendingText,
                            ]}>
                              {item.status}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.historyCardDivider} />
                        <View style={styles.historyCardBody}>
                          <View style={styles.historyDetailRow}>
                            <Text style={styles.historyDetailLabel}>Bank:</Text>
                            <Text style={styles.historyDetailValue} numberOfLines={1}>
                              {item.bankAccountName} ({item.bankAccountNumber.slice(-4).padStart(item.bankAccountNumber.length, '*')})
                            </Text>
                          </View>
                          <View style={styles.historyDetailRow}>
                            <Text style={styles.historyDetailLabel}>IFSC:</Text>
                            <Text style={styles.historyDetailValue}>{item.ifscCode}</Text>
                          </View>
                          {item.rejectionReason && (
                            <View style={[styles.historyDetailRow, { marginTop: 4 }]}>
                              <Text style={[styles.historyDetailLabel, { color: '#EF4444' }]}>Reason:</Text>
                              <Text style={[styles.historyDetailValue, { color: '#EF4444' }]} numberOfLines={2}>
                                {item.rejectionReason}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (Colors: any, isDark: boolean) => StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  dashboardContainer: {
    gap: 16,
  },
  heroEarningsCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: isDark ? Colors.primary : Colors.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  heroCardBg: {
    backgroundColor: isDark ? Colors.primary : Colors.secondary,
    padding: 24,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  heroLabel: {
    fontSize: 12,
    fontFamily: Fonts.brandBold,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  heroAmount: {
    fontSize: 40,
    fontFamily: Fonts.brandBlack,
    color: isDark ? Colors.background : '#FFF',
    letterSpacing: -0.5,
  },
  heroIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  heroBreakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  heroBreakdownText: {
    fontSize: 13,
    fontFamily: Fonts.brandBold,
    color: 'rgba(255,255,255,0.9)',
  },
  heroBreakdownDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: Colors.background,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 22,
    fontFamily: Fonts.brandBlack,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    fontFamily: Fonts.brandBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  walletWeeklyRow: {
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  weeklyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  walletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  walletIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletLabel: {
    fontSize: 12,
    fontFamily: Fonts.brandBold,
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  walletAmount: {
    fontSize: 26,
    fontFamily: Fonts.brandBlack,
    color: '#EAB308',
    marginTop: 6,
  },
  weeklyBadge: {
    backgroundColor: Colors.warning.slice(0, 7) + '12',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.warning.slice(0, 7) + '20',
  },
  weeklyBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.brandBlack,
    color: Colors.warning,
    textTransform: 'uppercase',
  },
  withdrawButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  withdrawBtnText: {
    fontSize: 13,
    fontFamily: Fonts.brandBold,
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '85%',
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Fonts.brandBlack,
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: isDark ? '#1C2938' : '#F1F5F9',
  },
  activeTabButton: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontFamily: Fonts.brandBold,
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: '#FFF',
  },
  formContainer: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  balanceInfoBox: {
    backgroundColor: Colors.primary.slice(0, 7) + '08',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary.slice(0, 7) + '15',
  },
  balanceInfoLabel: {
    fontSize: 12,
    fontFamily: Fonts.brandBold,
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceInfoValue: {
    fontSize: 28,
    fontFamily: Fonts.brandBlack,
    color: Colors.text,
    marginTop: 4,
  },
  inputGroup: {
    gap: 8,
  },
  inputHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: Fonts.brandBold,
    color: Colors.text,
  },
  quickActionText: {
    fontSize: 12,
    fontFamily: Fonts.brandBold,
    color: Colors.primary,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: isDark ? '#111E2E' : '#FAFAFA',
    fontFamily: Fonts.brand,
  },
  submitButton: {
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: Fonts.brandBlack,
    color: '#FFF',
  },
  disclaimerText: {
    fontSize: 11,
    color: Colors.muted,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 4,
  },
  centeredLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyHistoryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyHistoryText: {
    fontSize: 14,
    color: Colors.muted,
    fontFamily: Fonts.brand,
    textAlign: 'center',
  },
  historyList: {
    padding: 20,
    gap: 12,
    paddingBottom: 40,
  },
  historyCard: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyAmountText: {
    fontSize: 18,
    fontFamily: Fonts.brandBlack,
    color: Colors.text,
  },
  historyDateText: {
    fontSize: 11,
    color: Colors.muted,
    marginTop: 2,
    fontFamily: Fonts.brand,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.brandBlack,
    textTransform: 'uppercase',
  },
  statusApproved: {
    backgroundColor: isDark ? '#1B2E1E' : '#E8F5E9',
  },
  statusApprovedText: {
    color: isDark ? '#4ADE80' : Colors.success,
  },
  statusRejected: {
    backgroundColor: isDark ? '#2E1010' : '#FFEBEE',
  },
  statusRejectedText: {
    color: isDark ? '#F87171' : '#D32F2F',
  },
  statusHeld: {
    backgroundColor: isDark ? '#2E2210' : '#FFF3E0',
  },
  statusHeldText: {
    color: isDark ? '#FB923C' : '#F57C00',
  },
  statusPending: {
    backgroundColor: isDark ? '#1C2938' : '#F1F5F9',
  },
  statusPendingText: {
    color: isDark ? '#94A3B8' : '#64748B',
  },
  historyCardDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  historyCardBody: {
    gap: 6,
  },
  historyDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDetailLabel: {
    fontSize: 12,
    color: Colors.muted,
    fontFamily: Fonts.brand,
  },
  historyDetailValue: {
    fontSize: 12,
    color: Colors.text,
    fontFamily: Fonts.brandBold,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts.brandBlack,
    color: Colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  lastTxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txMeta: {
    flex: 1,
    gap: 4,
  },
  txTitle: {
    fontSize: 14,
    fontFamily: Fonts.brandBold,
    color: Colors.text,
  },
  txDate: {
    fontSize: 11,
    color: Colors.muted,
    fontFamily: Fonts.brand,
  },
  txAmount: {
    fontSize: 14,
    fontFamily: Fonts.brandBlack,
    textAlign: 'right',
  },
  walletCardActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    width: '100%',
  },
  walletActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  walletActionBtnPrimary: {
    borderColor: '#EAB308',
    backgroundColor: '#EAB308',
  },
  walletActionBtnText: {
    fontSize: 14,
    fontFamily: Fonts.brandBold,
    color: '#FFF',
  },
  walletActionBtnTextPrimary: {
    fontSize: 14,
    fontFamily: Fonts.brandBold,
    color: '#0F172A',
  },
  statusContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 16,
    minHeight: 200,
  },
  statusTextState: {
    fontSize: 16,
    fontFamily: Fonts.brandBold,
    color: Colors.text,
    textAlign: "center",
  },
  loadMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    marginTop: 4,
  },
  loadMoreText: {
    fontFamily: Fonts.brandMedium,
    fontSize: 14,
    color: Colors.primary,
  },
});