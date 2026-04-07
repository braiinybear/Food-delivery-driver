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
    backgroundColor: '#F9F9F9',
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
    paddingHorizontal: 28,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 14,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  content: {
    padding: 14,
    paddingBottom: 30,
  },
  ratingCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  ratingCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#FFB800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingValue: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFF',
  },
  ratingMax: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.82)',
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginTop: 14,
  },
  ratingSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginTop: 10,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
  },
  noteCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  noteTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#1E40AF',
  },
});
