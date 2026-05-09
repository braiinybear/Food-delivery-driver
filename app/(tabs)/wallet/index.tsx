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
                <View style={[styles.walletIconCircle, { backgroundColor: Colors.warning.slice(0, 7) + '15' }]}>
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
    padding: 16,
    paddingBottom: 40,
  },
  dashboardContainer: {
    gap: 16,
  },
  heroEarningsCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  heroCardBg: {
    backgroundColor: Colors.primary,
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
    color: '#FFF',
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
    backgroundColor: Colors.primary.slice(0, 7) + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletLabel: {
    fontSize: 11,
    fontFamily: Fonts.brandBold,
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  walletAmount: {
    fontSize: 20,
    fontFamily: Fonts.brandBlack,
    color: Colors.text,
    marginTop: 2,
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
});