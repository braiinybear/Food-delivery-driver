import React, { useEffect, useState, useMemo } from 'react';
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
import { useTheme } from '@/context/ThemeContext';

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
  const { Colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);
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
            if (onDismiss) onDismiss();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [visible, order?.orderId]);

  return (
    <Modal visible={visible && !!order} transparent animationType="slide">
      {order ? (
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
                <Ionicons name="close-circle" size={32} color={isDark ? Colors.muted : "#D1D5DB"} />
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
                  <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
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
                <Ionicons name="arrow-forward" size={20} color={isDark ? Colors.background : "#FFF"} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </Modal>
  );
}

const createStyles = (Colors: any, isDark: boolean) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.surface,
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
    backgroundColor: isDark ? 'rgba(255, 107, 53, 0.15)' : '#FFF1EB',
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
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  queueBadge: {
    marginTop: 4,
    backgroundColor: isDark ? 'rgba(255, 107, 53, 0.15)' : '#FFF1EB',
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
    backgroundColor: Colors.light,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newBadge: {
    backgroundColor: Colors.danger,
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
    backgroundColor: Colors.light,
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
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  earningValue: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.text,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? Colors.background : '#F9FAFB',
    padding: 20,
    borderRadius: 24,
    width: '100%',
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  infoSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
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
    color: Colors.textSecondary,
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
    backgroundColor: Colors.light,
  },
  rejectBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
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
    color: isDark ? Colors.background : '#FFF',
  },
});
