import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketStore } from '@/store/useSocketStore';
import { getSocket } from '@/lib/socket-client';

export function useSocketOrderOffers() {
  const queryClient = useQueryClient();
  const {
    addOrderOffer,
    removeOrderOffer,
    isConnected,
    acceptedOrderId,
    setAcceptedOrder,
    updateTrackingStatus,
  } = useSocketStore();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      console.log('[Driver] Socket not initialized yet - offer listeners skipped');
      return;
    }

    const handleOrderOffered = (data: any) => {
      console.log('[Driver] New Order Offer:', data);
      addOrderOffer(data);
    };

    const handleOrderOfferExpired = (data: { orderId: string }) => {
      console.log('[Driver] Order Offer Expired:', data?.orderId);
      if (data?.orderId) {
        removeOrderOffer(data.orderId);
      }
    };

    const handleOrderStatusUpdate = (data: { orderId?: string; status?: string }) => {
      if (!data?.status) {
        return;
      }

      updateTrackingStatus(data.status);
      queryClient.invalidateQueries({ queryKey: ['driver-current-delivery'] });
      queryClient.invalidateQueries({ queryKey: ['driver-available-orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-profile'] });

      if (
        data.orderId &&
        acceptedOrderId === data.orderId &&
        ['READY', 'DELIVERED', 'CANCELLED', 'REFUSED'].includes(data.status)
      ) {
        setAcceptedOrder(null);
      }
    };

    const registerListeners = () => {
      socket.off('order_offered', handleOrderOffered);
      socket.off('order_offer_expired', handleOrderOfferExpired);
      socket.off('order_status_update', handleOrderStatusUpdate);
      socket.on('order_offered', handleOrderOffered);
      socket.on('order_offer_expired', handleOrderOfferExpired);
      socket.on('order_status_update', handleOrderStatusUpdate);
      console.log('[Driver] Offer listeners registered');
    };

    if (socket.connected || isConnected) {
      registerListeners();
    }

    socket.on('connect', registerListeners);

    return () => {
      socket.off('connect', registerListeners);
      socket.off('order_offered', handleOrderOffered);
      socket.off('order_offer_expired', handleOrderOfferExpired);
      socket.off('order_status_update', handleOrderStatusUpdate);
    };
  }, [
    acceptedOrderId,
    addOrderOffer,
    isConnected,
    queryClient,
    removeOrderOffer,
    setAcceptedOrder,
    updateTrackingStatus,
  ]);
}

export function useDeliveryTracking(orderId: string | null) {
  const { setAcceptedOrder, updateTrackingStatus } = useSocketStore();
  const socket = getSocket();

  useEffect(() => {
    if (!socket || !orderId) return;

    setAcceptedOrder(orderId);

    // Join order room for tracking updates
    socket.emit('join_order_tracking', orderId);

    console.log(`[Driver] Tracking delivery for order: ${orderId}`);

    return () => {
      socket.emit('leave_order_tracking', orderId);
      setAcceptedOrder(null);
    };
  }, [orderId, socket, setAcceptedOrder]);
}

export function useEmitDriverLocation() {
  const socket = getSocket();
  const { acceptedOrderId } = useSocketStore();

  const emitLocation = (lat: number, lng: number) => {
    if (!socket || !acceptedOrderId) return;

    socket.emit('driver_location_update', {
      orderId: acceptedOrderId,
      lat,
      lng,
    });
  };

  return { emitLocation };
}
