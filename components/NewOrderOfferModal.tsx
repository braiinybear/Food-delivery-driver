import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

const { width, height } = Dimensions.get('window');

interface NewOrderOfferModalProps {
  visible: boolean;
  order: {
    orderId: string;
    restaurantName?: string;
    distanceKm?: number | string;
    earning?: number;
    expiresInSeconds?: number;
  } | null;
  onAccept: (orderId: string) => void;
  onReject: (orderId: string) => void;
  totalOffers?: number;
  onDismiss?: () => void;
}

export function NewOrderOfferModal({ 
  visible, 
  order, 
  onAccept, 
  onReject,
  totalOffers = 1,
  onDismiss
}: NewOrderOfferModalProps) {
  const [timeLeft, setTimeLeft] = useState(30);
  const progressAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible && order) {
      const duration = order.expiresInSeconds || 30;
      setTimeLeft(duration);
      progressAnim.setValue(1);

      Animated.timing(progressAnim, {
        toValue: 0,
        duration: duration * 1000,
        useNativeDriver: false,
      }).start();

      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // On timeout, just dismiss so it stays in the "Orders" list
            if (onDismiss) onDismiss();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Flash effect when a new order arriving while modal is open
      return () => clearInterval(timer);
    }
  }, [visible, order?.orderId]); // Only reset on new orderId

  if (!order) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.timerChip}>
              <Ionicons name="timer-outline" size={16} color="#FF6B35" />
              <Text style={styles.timerText}>{timeLeft}s</Text>
            </View>
            
            <View style={styles.headerTitleContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.typeLabel}>New Delivery Request</Text>
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW!</Text>
                </View>
              </View>
              {totalOffers > 1 && (
                <View style={styles.queueBadge}>
                  <Text style={styles.queueLabel}>{totalOffers} offers waiting</Text>
                </View>
              )}
            </View>

            <TouchableOpacity 
              style={styles.closeBtn} 
              onPress={onDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={32} color="#D1D5DB" />
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarBg}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          {/* Order Details */}
          <View style={styles.content}>
            <View style={styles.earningBox}>
              <Text style={styles.earningLabel}>Estimated Earning</Text>
              <Text style={styles.earningValue}>₹{(order.earning || 45).toFixed(2)}</Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="restaurant" size={24} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>{order.restaurantName || "Nearby Restaurant"}</Text>
                <Text style={styles.infoSub}>{order.distanceKm ? `${order.distanceKm} km away` : "Calculating distance..."}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.perksRow}>
              <View style={styles.perk}>
                <Ionicons name="flash" size={16} color="#FFD700" />
                <Text style={styles.perkText}>Instant Payout</Text>
              </View>
              <View style={styles.perk}>
                <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
                <Text style={styles.perkText}>Safe Trip</Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.rejectBtn}
              onPress={() => onReject(order.orderId)}
            >
              <Text style={styles.rejectBtnText}>Decline</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.acceptBtn}
              onPress={() => onAccept(order.orderId)}
            >
              <Text style={styles.acceptBtnText}>Accept</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  timerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF6B35',
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  queueBadge: {
    marginTop: 4,
    backgroundColor: '#FFF1EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  queueLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF6B35',
  },
  closeBtn: {
    padding: 2,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    marginBottom: 28,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
  },
  content: {
    alignItems: 'center',
    marginBottom: 32,
  },
  earningBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  earningLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 6,
  },
  earningValue: {
    fontSize: 48,
    fontWeight: '900',
    color: '#111827',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
    borderRadius: 24,
    width: '100%',
    gap: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  infoIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  infoSub: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    width: '100%',
    marginVertical: 24,
  },
  perksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
  },
  perk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  perkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  footer: {
    flexDirection: 'row',
    gap: 16,
  },
  rejectBtn: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  rejectBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4B5563',
  },
  acceptBtn: {
    flex: 2,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#FF6B35',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  acceptBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
});
