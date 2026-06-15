import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Fonts } from '@/constants/typography';
import { useDriverEarnings } from '@/hooks/useDriverOrders';

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function StatsScreen() {
  const { Colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);
  const { data: earnings, isLoading, refetch } = useDriverEarnings();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error("Error refetching earnings stats:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? Colors.background : Colors.secondary} />

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : !earnings ? (
        <ScrollView
          contentContainerStyle={[styles.emptyContainer, { flexGrow: 1 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
          <Ionicons name="stats-chart-outline" size={48} color={Colors.muted} />
          <Text style={styles.emptyText}>No stats available</Text>
          <Text style={styles.emptySubtext}>
            Deliver a few orders to populate your rider stats.
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
          {/* ── Hero: Today's Earnings Card ── */}
          <View style={styles.heroEarningsCard}>
            <View style={[styles.heroCardBg, { overflow: 'hidden' }]}>
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
              <View style={[styles.statIconBg, { backgroundColor: isDark ? '#1B2E1E' : '#E8F5E9' }]}>
                <Ionicons name="today-outline" size={18} color={isDark ? '#4ADE80' : Colors.success} />
              </View>
              <Text style={styles.statValue}>{earnings.todayDeliveries || 0}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: isDark ? '#2E1E10' : '#FFF3E0' }]}>
                <Ionicons name="calendar-outline" size={18} color={isDark ? '#FB923C' : Colors.warning} />
              </View>
              <Text style={styles.statValue}>{earnings.weeklyDeliveries || 0}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: isDark ? 'rgba(212, 175, 55, 0.15)' : '#FFF8E1' }]}>
                <Ionicons name="star" size={18} color="#EAB308" />
              </View>
              <Text style={styles.statValue}>{(earnings.rating || 0).toFixed(1)}</Text>
              <Text style={styles.statLabel}>{earnings.ratingCount || 0} ratings</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: isDark ? '#101E2E' : '#E3F2FD' }]}>
                <Ionicons name="checkmark-done" size={18} color={isDark ? '#60A5FA' : "#1976D2"} />
              </View>
              <Text style={styles.statValue}>{earnings.totalDeliveries || 0}</Text>
              <Text style={styles.statLabel}>Lifetime</Text>
            </View>
          </View>

          <View style={styles.ratingCard}>
            <View style={styles.ratingCircle}>
              <Text style={styles.ratingValue}>{(earnings.rating || 0).toFixed(1)}</Text>
              <Text style={styles.ratingMax}>/5</Text>
            </View>
            <Text style={styles.ratingTitle}>Customer Rating</Text>
            <Text style={styles.ratingSubtext}>
              based on {earnings.ratingCount || 0} review{earnings.ratingCount === 1 ? '' : 's'}
            </Text>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Ionicons name="checkmark-done" size={22} color="#16A34A" />
              <Text style={styles.metricValue}>{earnings.totalDeliveries || 0}</Text>
              <Text style={styles.metricLabel}>Total Deliveries</Text>
            </View>

            <View style={styles.metricCard}>
              <Ionicons name="chatbubble-ellipses" size={22} color="#F97316" />
              <Text style={styles.metricValue}>{earnings.ratingCount || 0}</Text>
              <Text style={styles.metricLabel}>Reviews</Text>
            </View>
          </View>

          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>Current Backend Output</Text>
            <Text style={styles.noteText}>
              This tab now reflects the real rider stats API. Advanced metrics like on-time rate,
              cancellation rate, and rating distribution are not being returned by the backend yet.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (Colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: Fonts.brandBlack,
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
    fontFamily: Fonts.brandMedium,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  ratingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ratingCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: isDark ? Colors.primary : Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: isDark ? Colors.primary : Colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  ratingValue: {
    fontSize: 36,
    fontFamily: Fonts.brandBlack,
    color: isDark ? Colors.background : '#FFF',
  },
  ratingMax: {
    fontSize: 12,
    fontFamily: Fonts.brandBold,
    color: 'rgba(255,255,255,0.7)',
    position: 'absolute',
    bottom: 20,
  },
  ratingTitle: {
    fontSize: 18,
    fontFamily: Fonts.brandBlack,
    color: Colors.text,
    marginTop: 20,
  },
  ratingSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: Fonts.brandMedium,
    marginTop: 6,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricValue: {
    fontSize: 24,
    fontFamily: Fonts.brandBlack,
    color: Colors.text,
    marginTop: 12,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: Fonts.brandBold,
    marginTop: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noteCard: {
    backgroundColor: Colors.primary.slice(0, 7) + '08',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.primary.slice(0, 7) + '20',
  },
  noteTitle: {
    fontSize: 13,
    fontFamily: Fonts.brandBlack,
    color: Colors.primary,
    marginBottom: 6,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
    fontFamily: Fonts.brandMedium,
  },
  heroEarningsCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 16,
  },
  heroCardBg: {
    backgroundColor: '#0F172A',
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
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: Colors.surface,
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
});
