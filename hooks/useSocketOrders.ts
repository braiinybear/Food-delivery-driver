import { useEffect } from 'react';
import { useSocketStore } from '@/store/useSocketStore';
import { getSocket } from '@/lib/socket-client';

export function useSocketOrderOffers() {
  const { addOrderOffer, removeOrderOffer } = useSocketStore();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Listen for new order offers
    socket.on('order_offered', (data) => {
      console.log('[Driver] New Order Offer:', data);
      addOrderOffer(data);
    });

    return () => {
      socket.off('order_offered');
    };
  }, [addOrderOffer]);
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
