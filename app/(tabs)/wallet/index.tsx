import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView, ActivityIndicator } from "react-native";
import { Colors } from "@/constants/colors";
import { FontSize, Fonts } from "@/constants/typography";
import { useDriverEarnings } from "@/hooks/useDriverOrders";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function WalletScreen() {
  const { data: earnings, isLoading: earningsLoading } = useDriverEarnings();

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
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.dashboardContainer}>
          {/* ── Hero: Today's Earnings Card ── */}
          <View style={styles.heroEarningsCard}>
            <View style={styles.heroCardBg}>
              <View style={styles.heroTopRow}>
                <View>
                  <Text style={styles.heroLabel}>Today's Earnings</Text>
                  <Text style={styles.heroAmount}>₹{(earnings.todayEarnings || 0).toFixed(0)}</Text>
                </View>
                <View style={styles.heroIconCircle}>
                  <Ionicons name="trending-up" size={26} color="#FFF" />
                </View>
              </View>
              <View style={styles.heroBreakdownRow}>
                <View style={styles.heroBreakdownItem}>
                  <Ionicons name="bicycle-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.heroBreakdownText}>₹{(earnings.todayDeliveryPay || 0).toFixed(0)} delivery</Text>
                </View>
                <View style={styles.heroBreakdownDivider} />
                <View style={styles.heroBreakdownItem}>
                  <Ionicons name="heart-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.heroBreakdownText}>₹{(earnings.todayTips || 0).toFixed(0)} tips</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── Quick Stats Grid ── */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="today-outline" size={18} color={Colors.success} />
              </View>
              <Text style={styles.statValue}>{earnings.todayDeliveries || 0}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="calendar-outline" size={18} color={Colors.warning} />
              </View>
              <Text style={styles.statValue}>{earnings.weeklyDeliveries || 0}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: '#FFF8E1' }]}>
                <Ionicons name="star" size={18} color={Colors.secondary} />
              </View>
              <Text style={styles.statValue}>{(earnings.rating || 0).toFixed(1)}</Text>
              <Text style={styles.statLabel}>{earnings.ratingCount || 0} ratings</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="checkmark-done" size={18} color="#1976D2" />
              </View>
              <Text style={styles.statValue}>{earnings.totalDeliveries || 0}</Text>
              <Text style={styles.statLabel}>Lifetime</Text>
            </View>
          </View>

          {/* ── Wallet & Weekly Earnings Row ── */}
          <View style={styles.walletWeeklyRow}>
            <View style={styles.walletCard}>
              <View style={styles.walletLeft}>
                <View style={styles.walletIconCircle}>
                  <Ionicons name="wallet-outline" size={18} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.walletLabel}>Wallet Balance</Text>
                  <Text style={styles.walletAmount}>₹{(earnings.walletBalance || 0).toFixed(0)}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
            </View>
          </View>

          <View style={styles.walletWeeklyRow}>
            <View style={styles.weeklyCard}>
              <View style={styles.walletLeft}>
                <View style={[styles.walletIconCircle, { backgroundColor: Colors.warning + '15' }]}>
                  <Ionicons name="bar-chart-outline" size={18} color={Colors.warning} />
                </View>
                <View>
                  <Text style={styles.walletLabel}>This Week</Text>
                  <Text style={styles.walletAmount}>₹{(earnings.weeklyEarnings || 0).toFixed(0)}</Text>
                </View>
              </View>
              <View style={styles.weeklyBadge}>
                <Text style={styles.weeklyBadgeText}>{earnings.weeklyDeliveries || 0} orders</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 5,
  },
  dashboardContainer: {
    marginBottom: 16,
    gap: 12,
  },
  heroEarningsCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  heroCardBg: {
    backgroundColor: Colors.primary,
    padding: 22,
    borderRadius: 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  heroLabel: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.brandMedium,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  heroAmount: {
    fontSize: 38,
    fontFamily: Fonts.brandBold,
    color: '#FFF',
    letterSpacing: -0.5,
  },
  heroIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  heroBreakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  heroBreakdownText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.brandMedium,
    color: 'rgba(255,255,255,0.85)',
  },
  heroBreakdownDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 62) / 2,
    backgroundColor: Colors.background,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.brandBold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.muted,
    marginTop: 2,
    fontFamily: Fonts.brand,
  },
  walletWeeklyRow: {
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  weeklyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  walletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  walletIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletLabel: {
    fontSize: 11,
    fontFamily: Fonts.brand,
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  walletAmount: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.brandBold,
    color: Colors.text,
    marginTop: 1,
  },
  weeklyBadge: {
    backgroundColor: Colors.warning + '18',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  weeklyBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.brandBold,
    color: Colors.warning,
  },
});