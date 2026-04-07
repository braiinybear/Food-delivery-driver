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
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAcceptDelivery, useDeclineDelivery } from '@/hooks/useDriverDeliveries';
import { AvailableOrder, useAvailableOrders } from '@/hooks/useDriverOrders';
import { OrderOffer, useSocketStore } from '@/store/useSocketStore';

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
  const { data: response, isLoading, refetch } = useAvailableOrders();
  const { mutate: acceptDelivery } = useAcceptDelivery();
  const { mutate: declineDelivery } = useDeclineDelivery();
  const orderOffers = useSocketStore((state) => state.orderOffers);
  const removeOrderOffer = useSocketStore((state) => state.removeOrderOffer);
  const markOffersSeen = useSocketStore((state) => state.markOffersSeen);

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
        (order) =>
          !orderOffers.some(
            (offer) => offer.orderId === order.id || offer.orderId === order.orderId
          )
      ),
    [orderOffers, orders]
  );

  const selectedOrder = useMemo(
    () => fallbackOrders.find((order) => order.id === selectedOrderId) ?? null,
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
      setPendingOrderAction({ orderId, type: 'accept' });
      acceptDelivery(orderId, {
        onSuccess: () => {
          removeOrderOffer(orderId);
          setSelectedOrderId(null);
          setPendingOrderAction(null);
        },
        onError: () => {
          setPendingOrderAction(null);
        },
      });
    },
    [acceptDelivery, removeOrderOffer]
  );

  const handleDeclineOrder = useCallback(
    (orderId: string) => {
      setPendingOrderAction({ orderId, type: 'decline' });
      declineDelivery(orderId, {
        onSuccess: () => {
          removeOrderOffer(orderId);
          setSelectedOrderId(null);
          setPendingOrderAction(null);
        },
        onError: () => {
          setPendingOrderAction(null);
        },
      });
    },
    [declineDelivery, removeOrderOffer]
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
          <Ionicons name="radio-outline" size={48} color={Colors.muted} />
          <Text style={styles.emptyText}>No live offers right now</Text>
          <Text style={styles.emptySubtext}>
            Go online and keep the app active to receive driver-specific offers.
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

          {orderOffers.map((offer) => (
            <LiveOfferCard
              key={offer.orderId}
              offer={offer}
              onAccept={handleAcceptOrder}
              onDecline={handleDeclineOrder}
              isAccepting={
                pendingOrderAction?.orderId === offer.orderId &&
                pendingOrderAction.type === 'accept'
              }
              isDeclining={
                pendingOrderAction?.orderId === offer.orderId &&
                pendingOrderAction.type === 'decline'
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

              {fallbackOrders.map((order) => (
                <FallbackOrderCard
                  key={order.id}
                  order={order}
                  onOpen={() => setSelectedOrderId(order.id)}
                  onAccept={handleAcceptOrder}
                  onDecline={handleDeclineOrder}
                  isAccepting={
                    pendingOrderAction?.orderId === order.id &&
                    pendingOrderAction.type === 'accept'
                  }
                  isDeclining={
                    pendingOrderAction?.orderId === order.id &&
                    pendingOrderAction.type === 'decline'
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
          <Text style={styles.liveOfferEyebrow}>Live Socket Offer</Text>
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
            <Text style={styles.cardTitle}>{order.restaurantName || 'Restaurant'}</Text>
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
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="chevron-down" size={28} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Order Details</Text>
            <View style={{ width: 28 }} />
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
    backgroundColor: '#F9F9F9',
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
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 36,
  },
  headerInfo: {
    marginBottom: 12,
  },
  availableCount: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSubtext: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 2,
    lineHeight: 18,
  },
  sectionHeader: {
    marginTop: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  sectionSubtext: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 2,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  liveOfferCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  liveOfferHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  liveOfferEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B35',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  liveOfferCountdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  liveOfferCountdownText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  fallbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
  },
  metricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  metricBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B35',
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  metricText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  addressBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
  },
  actionButtonPrimary: {
    backgroundColor: '#FF6B35',
  },
  actionButtonSecondary: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionButtonTextPrimary: {
    color: '#FFF',
  },
  actionButtonTextSecondary: {
    color: '#666',
  },
  tapHint: {
    fontSize: 10,
    color: '#A3A3A3',
    textAlign: 'center',
    marginTop: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  modalScroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  routeCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 16,
  },
  routeStop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: '#E0E0E0',
    marginLeft: 5,
    marginVertical: 6,
  },
  routeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
  },
  routeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 4,
  },
  detailGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  detailCard: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 6,
  },
  detailLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  infoBlock: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 10,
  },
  infoBlockLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    marginBottom: 6,
  },
  infoBlockValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
});
