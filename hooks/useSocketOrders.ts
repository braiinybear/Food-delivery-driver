import { useEffect } from 'react';
import { Platform } from 'react-native';
import { showAlert } from '@/store/useAlertStore';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSocketStore } from '@/store/useSocketStore';
import { getSocket } from '@/lib/socket-client';

export function useSocketOrderOffers() {
  const queryClient = useQueryClient();
  const router = useRouter();
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
      console.log('[Driver] New Order Offer arrived:', data);
      
      // Vibrate the phone
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Trigger local notification sound
        Notifications.scheduleNotificationAsync({
          content: {
            title: "New Delivery Offer! 🍔",
            body: `You have a new offer from ${data.restaurantName || 'a nearby restaurant'}.`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
          },
          trigger: null, // trigger immediately
        });
      }

      addOrderOffer(data);
      // Refresh available orders list since a new offer means new orders are available
      queryClient.invalidateQueries({ queryKey: ['driver-available-orders'] });
    };

    const handleOrderOfferExpired = (data: { orderId: string }) => {
      console.log('[Driver] Order Offer Expired:', data?.orderId);
      if (data?.orderId) {
        removeOrderOffer(data.orderId);
        // Refresh available orders list since an expired offer changes availability
        queryClient.invalidateQueries({ queryKey: ['driver-available-orders'] });
      }
    };

    const handleOrderStatusUpdate = (data: { orderId?: string; status?: string }) => {
      if (!data?.status) {
        return;
      }

      console.log(`[Driver] Status update received for ${data.orderId}: ${data.status}`);
      
      // Update global tracking state
      updateTrackingStatus(data.status);
      
      // Force refresh all relevant data
      queryClient.invalidateQueries({ queryKey: ['driver-current-delivery'] });
      queryClient.invalidateQueries({ queryKey: ['driver-available-orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-profile'] });

      // If an order is no longer READY, it shouldn't be in any driver's available list
      if (data.orderId && data.status !== 'READY') {
        removeOrderOffer(data.orderId);
      }

      if (
        data.orderId &&
        acceptedOrderId === data.orderId &&
        ['DELIVERED', 'CANCELLED', 'REFUSED'].includes(data.status)
      ) {
        if (data.status === 'CANCELLED' || data.status === 'REFUSED') {
          showAlert(
            'Order Update', 
            `Order #${data.orderId.slice(-6)} has been ${data.status.toLowerCase()}.`
          );
        }
        setAcceptedOrder(null);
      }
    };

    const handleOrderAssigned = (data: { orderId: string }) => {
      console.log('[Driver] Order ASSIGNED to me via socket:', data.orderId);
      setAcceptedOrder(data.orderId);
      
      // Force refresh data
      queryClient.invalidateQueries({ queryKey: ['driver-current-delivery'] });
      
      // Instant switch to Home/Map
      router.replace('/(tabs)');
      
      showAlert(
        'New Assignment 🚚',
        'An order has been assigned to you. Navigation started.'
      );
    };

    const handleOrderCancelledByOthers = (data: { orderId: string; reason: string }) => {
      console.log('[Driver] Order VOIDED by others:', data);
      if (acceptedOrderId === data.orderId) {
        showAlert(
          'Order VOIDED ❌',
          `Order #${data.orderId.slice(-6)} was cancelled. Reason: ${data.reason || 'Not provided'}`
        );
        setAcceptedOrder(null);
        queryClient.invalidateQueries({ queryKey: ['driver-current-delivery'] });
        queryClient.invalidateQueries({ queryKey: ['delivery-profile'] });
      }
    };

    const registerListeners = () => {
      socket.off('order_offered', handleOrderOffered);
      socket.off('order_offer_expired', handleOrderOfferExpired);
      socket.off('order_status_update', handleOrderStatusUpdate);
      socket.off('order_cancelled', handleOrderCancelledByOthers);
      socket.off('order_assigned', handleOrderAssigned);
      
      socket.on('order_offered', handleOrderOffered);
      socket.on('order_offer_expired', handleOrderOfferExpired);
      socket.on('order_status_update', handleOrderStatusUpdate);
      socket.on('order_cancelled', handleOrderCancelledByOthers);
      socket.on('order_assigned', handleOrderAssigned);
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
      socket.off('order_cancelled', handleOrderCancelledByOthers);
      socket.off('order_assigned', handleOrderAssigned);
    };
  }, [
    acceptedOrderId,
    addOrderOffer,
    isConnected,
    queryClient,
    removeOrderOffer,
    setAcceptedOrder,
    updateTrackingStatus,
    router,
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
