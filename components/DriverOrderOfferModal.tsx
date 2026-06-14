import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { OrderOffer } from '@/store/useSocketStore';

interface DriverOrderOfferModalProps {
  offer: OrderOffer | null;
  isAccepting: boolean;
  isDeclining: boolean;
  onAccept: (orderId: string) => void;
  onDecline: (orderId: string) => void;
  onExpire: (orderId: string) => void;
}

export default function DriverOrderOfferModal({
  offer,
  isAccepting,
  isDeclining,
  onAccept,
  onDecline,
  onExpire,
}: DriverOrderOfferModalProps) {
  const { Colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);
  const expiryHandledRef = useRef<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const expiresAt = useMemo(() => {
    if (!offer) return 0;
    const ttlMs = (offer.expiresInSeconds ?? 45) * 1000;
    return offer.receivedAt + ttlMs;
  }, [offer]);

  useEffect(() => {
    if (!offer) {
      setSecondsLeft(0);
      expiryHandledRef.current = null;
      return;
    }

    expiryHandledRef.current = null;

    const updateCountdown = () => {
      const remainingMs = Math.max(0, expiresAt - Date.now());
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      setSecondsLeft(remainingSeconds);

      if (remainingMs <= 0 && expiryHandledRef.current !== offer.orderId) {
        expiryHandledRef.current = offer.orderId;
        onExpire(offer.orderId);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 250);
    return () => clearInterval(interval);
  }, [offer, expiresAt, onExpire]);

  if (!offer) return null;

  const distanceValue =
    typeof offer.distanceKm === 'number'
      ? offer.distanceKm
      : typeof offer.distanceKm === 'string'
        ? Number(offer.distanceKm)
        : null;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => onDecline(offer.orderId)}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.headerBadge}>
              <Ionicons name="flash" size={18} color={isDark ? Colors.background : "#FFF"} />
              <Text style={styles.headerBadgeText}>New Delivery Offer</Text>
            </View>
            <Text style={styles.countdown}>{secondsLeft}s</Text>
          </View>

          <Text style={styles.restaurantName}>{offer.restaurantName || 'Restaurant'}</Text>

          <View style={styles.metricRow}>
            <View style={styles.metricCard}>
              <Ionicons name="navigate" size={18} color={Colors.primary} />
              <Text style={styles.metricValue}>
                {distanceValue !== null && Number.isFinite(distanceValue)
                  ? `${distanceValue.toFixed(1)} km`
                  : 'Distance pending'}
              </Text>
              <Text style={styles.metricLabel}>Distance</Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="cash" size={18} color={Colors.success} />
              <Text style={styles.metricValue}>
                {typeof offer.earning === 'number' ? `Rs ${offer.earning}` : 'TBD'}
              </Text>
              <Text style={styles.metricLabel}>Earning</Text>
            </View>
          </View>

          <Text style={styles.orderId}>Order #{offer.orderId.slice(0, 8).toUpperCase()}</Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => onDecline(offer.orderId)}
              disabled={isAccepting || isDeclining}
            >
              {isDeclining ? (
                <ActivityIndicator size="small" color={Colors.textSecondary} />
              ) : (
                <>
                  <Ionicons name="close" size={18} color={Colors.text} />
                  <Text style={styles.secondaryButtonText}>Decline</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => onAccept(offer.orderId)}
              disabled={isAccepting || isDeclining}
            >
              {isAccepting ? (
                <ActivityIndicator size="small" color={isDark ? Colors.background : "#FFF"} />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={18} color={isDark ? Colors.background : "#FFF"} />
                  <Text style={styles.primaryButtonText}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (Colors: any, isDark: boolean) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 24, 40, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: isDark ? Colors.background : '#FFF',
  },
  countdown: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.danger,
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: isDark ? Colors.background : '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 10,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 4,
  },
  orderId: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: Colors.muted,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.light,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: isDark ? Colors.background : '#FFF',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
});
