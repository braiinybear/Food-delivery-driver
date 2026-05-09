import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { showAlert } from '@/store/useAlertStore';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAcceptDelivery, useDeclineDelivery } from '@/hooks/useDriverDeliveries';
import { AvailableOrder, useAvailableOrders, useCurrentDelivery } from '@/hooks/useDriverOrders';
import { OrderOffer, useSocketStore } from '@/store/useSocketStore';
import { Fonts } from '@/constants/typography';

const formatDistance = (km: number | null | undefined) => {
  if (typeof km !== 'number' || !Number.isFinite(km)) {
    return 'N/A';
  }
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
};

const formatTime = (minutes: number | null | undefined) => {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) {
    return 'N/A';
  }
  if (minutes < 60) {
    return `${minutes}min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}min`;
};

export default function DriverOrdersScreen() {
  const router = useRouter();
  const { data: response, isLoading, refetch } = useAvailableOrders();
  const { data: activeDeliveryData } = useCurrentDelivery();
  const { mutate: acceptDelivery } = useAcceptDelivery();
  const { mutate: declineDelivery } = useDeclineDelivery();
  const { removeOrderOffer, clearOffers, markOffersSeen, orderOffers } = useSocketStore();
  const queryClient = useQueryClient();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [pendingOrderAction, setPendingOrderAction] = useState<{
    orderId: string;
    type: 'accept' | 'decline';
  } | null>(null);

  const orders = response ?? [];

  const fallbackOrders = useMemo(
    () =>
      orders.filter(
        (order: AvailableOrder) =>
          // 1. Must be in READY status (Safety check)
          order.status === 'READY' &&
          // 2. Must not already be in the live socket offers
          !orderOffers.some(
            (offer) => offer.orderId === order.id || offer.orderId === order.orderId
          )
      ),
    [orderOffers, orders]
  );

  const selectedOrder = useMemo(
    () => fallbackOrders.find((order: AvailableOrder) => order.id === selectedOrderId) ?? null,
    [fallbackOrders, selectedOrderId]
  );

  useEffect(() => {
    markOffersSeen();
  }, [markOffersSeen]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleAcceptOrder = useCallback(
    (orderId: string) => {
      // Defensive check: Prevent acceptance if already on a delivery
      if (activeDeliveryData?.order) {
        showAlert(
          "Already on Delivery",
          "Please complete your current delivery before accepting a new one."
        );
        return;
      }

      setPendingOrderAction({ orderId, type: 'accept' });
      acceptDelivery(orderId, {
        onSuccess: () => {
          // 🎉 Clean state: Clear ALL other offers immediately
          clearOffers();
          setSelectedOrderId(null);
          setPendingOrderAction(null);

          // Force refresh the active delivery state across the app
          queryClient.invalidateQueries({ queryKey: ['driver-current-delivery'] });

          // Switch to the Home tab so tracking starts immediately
          router.replace('/(tabs)');
        },
        onError: (err: any) => {
          setPendingOrderAction(null);
          showAlert(
            "Order Unavailable",
            err.response?.data?.message || "This order may have been taken by another rider or cancelled.",
            [{ text: "OK", onPress: () => refetch() }]
          );
        },
      });
    },
    [acceptDelivery, clearOffers, refetch, activeDeliveryData]
  );

  const handleDeclineOrder = useCallback(
    (orderId: string) => {
      setPendingOrderAction({ orderId, type: 'decline' });
      declineDelivery(orderId, {
        onSuccess: () => {
          // Force removal from ALL local sources immediately
          removeOrderOffer(orderId);
          setSelectedOrderId(null);
          setPendingOrderAction(null);

          // Manually update the 'orders' cache locally so it vanishes from fallbackOrders too
          queryClient.setQueryData(['driver-available-orders'], (old: any) => {
            if (!old) return old;
            return old.filter((o: any) => o.id !== orderId);
          });

          // Also trigger a background refetch for safety
          refetch();
        },
        onError: () => {
          setPendingOrderAction(null);
          refetch();
        },
      });
    },
    [declineDelivery, removeOrderOffer, refetch, queryClient]
  );

  const isInitialLoading = isLoading && orderOffers.length === 0 && fallbackOrders.length === 0;
  const isEmpty = !isInitialLoading && orderOffers.length === 0 && fallbackOrders.length === 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {isInitialLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : isEmpty ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBg}>
            <Ionicons name="radio-outline" size={42} color={Colors.primary} />
          </View>
          <Text style={styles.emptyText}>No live offers right now</Text>
          <Text style={styles.emptySubtext}>
            Go online and stay active to receive the best delivery offers in real-time.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        >
          <View style={styles.headerInfo}>
            <Text style={styles.availableCount}>
              {orderOffers.length} live offer{orderOffers.length !== 1 ? 's' : ''}
            </Text>
            <Text style={styles.headerSubtext}>
              These come from the socket and should be your primary accept flow.
            </Text>
          </View>

          {orderOffers.map((offer: OrderOffer) => (
            <LiveOfferCard
              key={offer.orderId}
              offer={offer}
              onAccept={handleAcceptOrder}
              onDecline={handleDeclineOrder}
              isAccepting={
                pendingOrderAction?.orderId === offer.orderId &&
                pendingOrderAction?.type === 'accept'
              }
              isDeclining={
                pendingOrderAction?.orderId === offer.orderId &&
                pendingOrderAction?.type === 'decline'
              }
            />
          ))}

          {fallbackOrders.length > 0 ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {fallbackOrders.length} fallback order
                  {fallbackOrders.length !== 1 ? 's' : ''}
                </Text>
                <Text style={styles.sectionSubtext}>
                  Legacy REST list kept temporarily while the rider flow is being finished.
                </Text>
              </View>

              {fallbackOrders.map((order: AvailableOrder) => (
                <FallbackOrderCard
                  key={order.id}
                  order={order}
                  onOpen={() => setSelectedOrderId(order.id)}
                  onAccept={handleAcceptOrder}
                  onDecline={handleDeclineOrder}
                  isAccepting={
                    pendingOrderAction?.orderId === order.id &&
                    pendingOrderAction?.type === 'accept'
                  }
                  isDeclining={
                    pendingOrderAction?.orderId === order.id &&
                    pendingOrderAction?.type === 'decline'
                  }
                />
              ))}
            </>
          ) : null}
        </ScrollView>
      )}

      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrderId(null)}
        onAccept={handleAcceptOrder}
        onDecline={handleDeclineOrder}
        isAccepting={
          pendingOrderAction?.orderId === selectedOrder?.id &&
          pendingOrderAction?.type === 'accept'
        }
        isDeclining={
          pendingOrderAction?.orderId === selectedOrder?.id &&
          pendingOrderAction?.type === 'decline'
        }
      />
    </View>
  );
}

interface LiveOfferCardProps {
  offer: OrderOffer;
  isAccepting: boolean;
  isDeclining: boolean;
  onAccept: (orderId: string) => void;
  onDecline: (orderId: string) => void;
}

function LiveOfferCard({
  offer,
  isAccepting,
  isDeclining,
  onAccept,
  onDecline,
}: LiveOfferCardProps) {
  const distance =
    typeof offer.distanceKm === 'number'
      ? offer.distanceKm
      : typeof offer.distanceKm === 'string'
        ? Number(offer.distanceKm)
        : null;

  return (
    <View style={[styles.card, styles.liveOfferCard]}>
      <View style={styles.liveOfferHeader}>
        <View>
          <Text style={styles.liveOfferEyebrow}>Live Socket Offer #{offer.orderId.slice(-6).toUpperCase()}</Text>
          <Text style={styles.cardTitle}>{offer.restaurantName || 'Restaurant'}</Text>
        </View>
        <View style={styles.liveOfferCountdown}>
          <Ionicons name="timer-outline" size={14} color="#B45309" />
          <Text style={styles.liveOfferCountdownText}>{offer.expiresInSeconds ?? 45}s</Text>
        </View>
      </View>

      <View style={styles.metricRow}>
        <View style={styles.metricPill}>
          <Ionicons name="navigate-outline" size={14} color="#FF6B35" />
          <Text style={styles.metricText}>
            {distance !== null && Number.isFinite(distance)
              ? `${distance.toFixed(1)}km away`
              : 'Distance pending'}
          </Text>
        </View>
        <View style={styles.metricPill}>
          <Ionicons name="cash-outline" size={14} color="#16A34A" />
          <Text style={styles.metricText}>
            {typeof offer.earning === 'number' ? `Rs ${offer.earning}` : 'Earning TBD'}
          </Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <ActionButton
          variant="secondary"
          label="Decline"
          icon="close"
          loading={isDeclining}
          disabled={isAccepting || isDeclining}
          onPress={() => onDecline(offer.orderId)}
        />
        <ActionButton
          variant="primary"
          label="Accept"
          icon="checkmark"
          loading={isAccepting}
          disabled={isAccepting || isDeclining}
          onPress={() => onAccept(offer.orderId)}
        />
      </View>
    </View>
  );
}

interface FallbackOrderCardProps {
  order: AvailableOrder;
  isAccepting: boolean;
  isDeclining: boolean;
  onOpen: () => void;
  onAccept: (orderId: string) => void;
  onDecline: (orderId: string) => void;
}

function FallbackOrderCard({
  order,
  isAccepting,
  isDeclining,
  onOpen,
  onAccept,
  onDecline,
}: FallbackOrderCardProps) {
  return (
    <View style={styles.card}>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [pressed && { opacity: 0.9 }]}
      >
        <View style={styles.fallbackHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{order.restaurantName || 'Restaurant'} (#{order.id.slice(-6).toUpperCase()})</Text>
            <Text style={styles.cardSubtitle}>
              {order.itemCount} item{order.itemCount !== 1 ? 's' : ''} for {order.customerName}
            </Text>
          </View>
          <View style={styles.metricBadge}>
            <Ionicons name="location" size={13} color="#FF6B35" />
            <Text style={styles.metricBadgeText}>{formatDistance(order.estimatedDistance)}</Text>
          </View>
        </View>

        <View style={styles.addressBlock}>
          <Ionicons name="radio-button-on" size={12} color="#FF9800" />
          <Text style={styles.addressText} numberOfLines={1}>
            {order.pickupLocation}
          </Text>
        </View>

        <View style={styles.addressBlock}>
          <Ionicons name="radio-button-on" size={12} color="#4CAF50" />
          <Text style={styles.addressText} numberOfLines={1}>
            {order.dropoffLocation}
          </Text>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metricPill}>
            <Ionicons name="time-outline" size={13} color="#666" />
            <Text style={styles.metricText}>{formatTime(order.estimatedTime)}</Text>
          </View>
          <View style={styles.metricPill}>
            <Ionicons name="cash-outline" size={13} color="#16A34A" />
            <Text style={styles.metricText}>Rs {order.totalAmount}</Text>
          </View>
          <View style={styles.metricPill}>
            <Ionicons name="wallet-outline" size={13} color="#666" />
            <Text style={styles.metricText}>{order.paymentMode}</Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.actionButtons}>
        <ActionButton
          variant="secondary"
          label="Decline"
          icon="close"
          loading={isDeclining}
          disabled={isAccepting || isDeclining}
          onPress={() => onDecline(order.id)}
        />
        <ActionButton
          variant="primary"
          label="Accept"
          icon="checkmark"
          loading={isAccepting}
          disabled={isAccepting || isDeclining}
          onPress={() => onAccept(order.id)}
        />
      </View>

      <Text style={styles.tapHint}>Tap the card for more details</Text>
    </View>
  );
}

interface ActionButtonProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
  variant: 'primary' | 'secondary';
}

function ActionButton({
  label,
  icon,
  loading,
  disabled,
  onPress,
  variant,
}: ActionButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        isPrimary ? styles.actionButtonPrimary : styles.actionButtonSecondary,
        disabled && { opacity: 0.6 },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isPrimary ? '#FFF' : '#666'} />
      ) : (
        <>
          <Ionicons name={icon} size={16} color={isPrimary ? '#FFF' : '#666'} />
          <Text
            style={[
              styles.actionButtonText,
              isPrimary ? styles.actionButtonTextPrimary : styles.actionButtonTextSecondary,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

interface OrderDetailModalProps {
  order: AvailableOrder | null;
  isAccepting: boolean;
  isDeclining: boolean;
  onClose: () => void;
  onAccept: (orderId: string) => void;
  onDecline: (orderId: string) => void;
}

function OrderDetailModal({
  order,
  isAccepting,
  isDeclining,
  onClose,
  onAccept,
  onDecline,
}: OrderDetailModalProps) {
  if (!order) {
    return null;
  }

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Order Details</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            <View style={styles.routeCard}>
              <View style={styles.routeStop}>
                <View style={[styles.routeDot, { backgroundColor: '#FF9800' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeLabel}>Pickup</Text>
                  <Text style={styles.routeText}>{order.pickupLocation}</Text>
                </View>
              </View>

              <View style={styles.routeLine} />

              <View style={styles.routeStop}>
                <View style={[styles.routeDot, { backgroundColor: '#4CAF50' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeLabel}>Dropoff</Text>
                  <Text style={styles.routeText}>{order.dropoffLocation}</Text>
                </View>
              </View>
            </View>

            <View style={styles.detailGrid}>
              <View style={styles.detailCard}>
                <Ionicons name="navigate-circle-outline" size={20} color="#FF6B35" />
                <Text style={styles.detailValue}>{formatDistance(order.estimatedDistance)}</Text>
                <Text style={styles.detailLabel}>Distance</Text>
              </View>
              <View style={styles.detailCard}>
                <Ionicons name="time-outline" size={20} color="#FF9800" />
                <Text style={styles.detailValue}>{formatTime(order.estimatedTime)}</Text>
                <Text style={styles.detailLabel}>Est. Time</Text>
              </View>
              <View style={styles.detailCard}>
                <Ionicons name="cash-outline" size={20} color="#16A34A" />
                <Text style={styles.detailValue}>Rs {order.totalAmount}</Text>
                <Text style={styles.detailLabel}>Earning</Text>
              </View>
            </View>

            <InfoBlock label="Restaurant" value={order.restaurantName} />
            <InfoBlock label="Customer" value={order.customerName} />
            <InfoBlock
              label="Items"
              value={`${order.itemCount} item${order.itemCount !== 1 ? 's' : ''}`}
            />
            <InfoBlock label="Payment" value={order.paymentMode} />
          </ScrollView>

          <View style={styles.modalActions}>
            <ActionButton
              variant="secondary"
              label="Decline"
              icon="close"
              loading={isDeclining}
              disabled={isAccepting || isDeclining}
              onPress={() => onDecline(order.id)}
            />
            <ActionButton
              variant="primary"
              label="Accept Order"
              icon="checkmark-done"
              loading={isAccepting}
              disabled={isAccepting || isDeclining}
              onPress={() => onAccept(order.id)}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoBlock}>
      <Text style={styles.infoBlockLabel}>{label}</Text>
      <Text style={styles.infoBlockValue}>{value}</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary.slice(0, 7) + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontFamily: Fonts.brandBlack,
    color: Colors.text,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
    fontFamily: Fonts.brandMedium,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  headerInfo: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  availableCount: {
    fontSize: 18,
    fontFamily: Fonts.brandBlack,
    color: Colors.text,
  },
  headerSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    fontFamily: Fonts.brandMedium,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts.brandBlack,
    color: Colors.text,
  },
  sectionSubtext: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 4,
    fontFamily: Fonts.brandMedium,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  liveOfferCard: {
    borderColor: Colors.primary.slice(0, 7) + '30',
    backgroundColor: '#FFFFFF',
  },
  liveOfferHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  liveOfferEyebrow: {
    fontSize: 10,
    fontFamily: Fonts.brandBlack,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  liveOfferCountdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary.slice(0, 7) + '10',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  liveOfferCountdownText: {
    fontSize: 12,
    fontFamily: Fonts.brandBold,
    color: Colors.primary,
  },
  fallbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: Fonts.brandBlack,
    color: Colors.text,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    fontFamily: Fonts.brandMedium,
  },
  metricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary.slice(0, 7) + '10',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metricBadgeText: {
    fontSize: 12,
    fontFamily: Fonts.brandBold,
    color: Colors.primary,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricText: {
    fontSize: 12,
    fontFamily: Fonts.brandBold,
    color: Colors.text,
  },
  addressBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 12,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: Fonts.brandMedium,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonPrimary: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
  },
  actionButtonSecondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: Fonts.brandBold,
  },
  actionButtonTextPrimary: {
    color: '#FFF',
  },
  actionButtonTextSecondary: {
    color: Colors.textSecondary,
  },
  tapHint: {
    fontSize: 11,
    color: Colors.muted,
    fontFamily: Fonts.brandMedium,
    textAlign: 'center',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '90%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Fonts.brandBlack,
    color: Colors.text,
  },
  modalScroll: {
    padding: 20,
  },
  routeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  routeStop: {
    flexDirection: 'row',
    gap: 15,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  routeLabel: {
    fontSize: 10,
    fontFamily: Fonts.brandBlack,
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  routeText: {
    fontSize: 14,
    fontFamily: Fonts.brandMedium,
    color: Colors.text,
    lineHeight: 20,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: Colors.border,
    marginLeft: 5,
    marginVertical: 4,
  },
  detailGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  detailCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: Fonts.brandBlack,
    color: Colors.text,
    marginTop: 8,
  },
  detailLabel: {
    fontSize: 10,
    fontFamily: Fonts.brandMedium,
    color: Colors.muted,
    marginTop: 2,
  },
  infoBlock: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  infoBlockLabel: {
    fontSize: 12,
    fontFamily: Fonts.brandBold,
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoBlockValue: {
    fontSize: 15,
    fontFamily: Fonts.brandBold,
    color: Colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 10,
  },
});
