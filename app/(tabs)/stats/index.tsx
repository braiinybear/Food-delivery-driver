import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { useDriverEarnings } from '@/hooks/useDriverOrders';

export default function StatsScreen() {
  const { data: earnings, isLoading } = useDriverEarnings();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : !earnings ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="stats-chart-outline" size={48} color={Colors.muted} />
          <Text style={styles.emptyText}>No stats available</Text>
          <Text style={styles.emptySubtext}>
            Deliver a few orders to populate your rider stats.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  ratingValue: {
    fontSize: 36,
    fontFamily: Fonts.brandBlack,
    color: '#FFF',
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
    backgroundColor: Colors.background,
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
});
