import { create } from 'zustand';

export interface OrderOffer {
  orderId: string;
  customerId: string;
  restaurantId: string;
  amount: number;
  pickupLocation: { lat: number; lng: number };
  deliveryLocation: { lat: number; lng: number };
  timestamp: string;
}

interface SocketState {
  // Connection state
  isConnected: boolean;
  connectionError: string | null;

  // Delivery tracking
  acceptedOrderId: string | null;
  trackingStatus: string | null;

  // Order offers
  orderOffers: OrderOffer[];
  unreadOffers: number;

  // Methods
  setConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
  setAcceptedOrder: (orderId: string | null) => void;
  updateTrackingStatus: (status: string) => void;
  addOrderOffer: (offer: OrderOffer) => void;
  removeOrderOffer: (orderId: string) => void;
  clearOffers: () => void;
  reset: () => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  isConnected: false,
  connectionError: null,
  acceptedOrderId: null,
  trackingStatus: null,
  orderOffers: [],
  unreadOffers: 0,

  setConnected: (connected) => set({ isConnected: connected }),
  setConnectionError: (error) => set({ connectionError: error }),

  setAcceptedOrder: (orderId) =>
    set({
      acceptedOrderId: orderId,
      trackingStatus: null,
    }),

  updateTrackingStatus: (status) =>
    set({
      trackingStatus: status,
    }),

  addOrderOffer: (offer) =>
    set((state) => ({
      orderOffers: [offer, ...state.orderOffers],
      unreadOffers: state.unreadOffers + 1,
    })),

  removeOrderOffer: (orderId) =>
    set((state) => ({
      orderOffers: state.orderOffers.filter((o) => o.orderId !== orderId),
    })),

  clearOffers: () =>
    set({
      orderOffers: [],
      unreadOffers: 0,
    }),

  reset: () =>
    set({
      isConnected: false,
      connectionError: null,
      acceptedOrderId: null,
      trackingStatus: null,
      orderOffers: [],
      unreadOffers: 0,
    }),
}));
