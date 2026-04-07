import { create } from 'zustand';

export interface OrderOffer {
  orderId: string;
  restaurantName?: string;
  distanceKm?: number | string;
  earning?: number;
  expiresInSeconds?: number;
  timestamp?: string;
  receivedAt: number;
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
  markOffersSeen: () => void;
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
    set((state) => {
      const alreadyExists = state.orderOffers.some((existing) => existing.orderId === offer.orderId);
      if (alreadyExists) {
        return state;
      }

      return {
        orderOffers: [{ ...offer, receivedAt: Date.now() }, ...state.orderOffers],
        unreadOffers: state.unreadOffers + 1,
      };
    }),

  removeOrderOffer: (orderId) =>
    set((state) => {
      const existed = state.orderOffers.some((o) => o.orderId === orderId);
      return {
        orderOffers: state.orderOffers.filter((o) => o.orderId !== orderId),
        unreadOffers: existed ? Math.max(0, state.unreadOffers - 1) : state.unreadOffers,
      };
    }),

  markOffersSeen: () =>
    set({
      unreadOffers: 0,
    }),

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
