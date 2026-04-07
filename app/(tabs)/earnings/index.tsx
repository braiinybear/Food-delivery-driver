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

export default function EarningsScreen() {
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
          <Ionicons name="wallet-outline" size={48} color={Colors.muted} />
          <Text style={styles.emptyText}>No earnings data yet</Text>
          <Text style={styles.emptySubtext}>
            Complete deliveries to start building your rider stats.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Rider Summary</Text>
            <Text style={styles.heroValue}>{earnings.totalDeliveries || 0}</Text>
            <Text style={styles.heroSubtext}>completed deliveries</Text>
          </View>

          <View style={styles.grid}>
            <View style={styles.metricCard}>
              <Ionicons name="star" size={22} color="#FFB800" />
              <Text style={styles.metricValue}>{(earnings.rating || 0).toFixed(1)}</Text>
              <Text style={styles.metricLabel}>Average Rating</Text>
            </View>

            <View style={styles.metricCard}>
              <Ionicons name="people" size={22} color="#FF6B35" />
              <Text style={styles.metricValue}>{earnings.ratingCount || 0}</Text>
              <Text style={styles.metricLabel}>Customer Reviews</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Backend Limitation</Text>
            <Text style={styles.infoText}>
              The rider backend currently returns only deliveries, rating, and review count for this screen.
              Daily, weekly, and monthly earnings are not exposed yet.
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
  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: 18,
    padding: 24,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  heroValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 10,
  },
  heroSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 6,
  },
  grid: {
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
    fontSize: 20,
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
  infoCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9A3412',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#9A3412',
  },
});
