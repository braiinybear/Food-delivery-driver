import apiClient from '@/lib/axios';
import { useQuery } from '@tanstack/react-query';

export interface AvailableOrder {
  id: string;
  orderId: string;
  restaurantName: string;
  customerName: string;
  pickupLocation: string;
  dropoffLocation: string;
  estimatedDistance: number;
  estimatedTime: number;
  itemCount: number;
  totalAmount: number;
  paymentMode: string;
  status: string;
  createdAt: string;
}

export interface DriverCurrentDeliveryOrder {
  id: string;
  status: string;
  otp?: string | null;
  restaurant?: {
    name?: string | null;
    address?: string | null;
    lat?: number | null;
    lng?: number | null;
    image?: string | null;
  } | null;
  customer?: {
    name?: string | null;
    phoneNumber?: string | null;
  } | null;
  items?: Array<unknown>;
  totalAmount?: number | null;
  paymentMode?: string | null;
}

export interface DriverCurrentDeliveryResponse {
  message?: string;
  order?: DriverCurrentDeliveryOrder | null;
}

export interface DriverOrderRouteResponse {
  orderId: string;
  status: string;
  distanceKm: string;
  pickup: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
  dropoff: {
    name: string;
    phone: string | null;
    address: string;
    landmark?: string | null;
    lat: number;
    lng: number;
  };
}

export interface DriverEarningsResponse {
  // Lifetime
  totalDeliveries: number;
  rating: number;
  ratingCount: number;
  // Today
  todayDeliveries: number;
  todayEarnings: number;
  todayDeliveryPay: number;
  todayTips: number;
  // This Week
  weeklyDeliveries: number;
  weeklyEarnings: number;
  // Wallet
  walletBalance: number;
}

interface AvailableOrderApiResponse {
  id: string;
  status?: string;
  totalAmount?: number;
  paymentMode?: string;
  placedAt?: string;
  createdAt?: string;
  distanceToRestaurantKm?: number | string;
  itemCount?: number;
  items?: Array<unknown>;
  restaurant?: {
    name?: string | null;
    address?: string | null;
  } | null;
  customer?: {
    name?: string | null;
  } | null;
}

const toNumber = (value: number | string | null | undefined, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

/**
 * Get all available orders for the driver
 * Shows orders that are ready for pickup
 */
export const useAvailableOrders = () => {
  return useQuery({
    queryKey: ['driver-available-orders'],
    queryFn: async () => {
      const { data } = await apiClient.get<AvailableOrderApiResponse[] | { data: AvailableOrderApiResponse[] }>(
        '/delivery/available-orders'
      );

      const ordersList = Array.isArray(data) ? data : (data as any).data || [];

      return ordersList.map((order: any) => {
        const estimatedDistance = toNumber(order.distanceToRestaurantKm, 0);

        return {
          id: order.id,
          orderId: order.id,
          restaurantName: order.restaurant?.name ?? 'Restaurant',
          customerName: order.customer?.name ?? 'Customer',
          pickupLocation: order.restaurant?.address ?? 'Pickup location pending',
          dropoffLocation: 'Customer address available after accept',
          estimatedDistance,
          estimatedTime: Math.max(10, Math.round(estimatedDistance * 6 + 5)),
          itemCount: order.itemCount ?? order.items?.length ?? 0,
          totalAmount: toNumber(order.totalAmount, 0),
          paymentMode: order.paymentMode ?? 'UNKNOWN',
          status: order.status ?? 'READY',
          createdAt: order.placedAt ?? order.createdAt ?? new Date().toISOString(),
        };
      });
    },
  });
};

/**
 * Get driver's current active delivery
 */
export const useCurrentDelivery = () => {
  return useQuery({
    queryKey: ['driver-current-delivery'],
    queryFn: async () => {
      const { data } = await apiClient.get<DriverCurrentDeliveryOrder | DriverCurrentDeliveryResponse>(
        '/delivery/my-current-order'
      );

      if (
        data &&
        typeof data === 'object' &&
        'order' in data
      ) {
        return data as DriverCurrentDeliveryResponse;
      }

      return {
        order: (data as DriverCurrentDeliveryOrder) ?? null,
      };
    },
  });
};

/**
 * Get driver's earnings summary
 */
export const useDriverEarnings = () => {
  return useQuery({
    queryKey: ['driver-earnings'],
    queryFn: async () => {
      const { data } = await apiClient.get<DriverEarningsResponse>('/delivery/my-earnings');
      return data;
    },
  });
};

/**
 * Get order route (GPS coordinates for map)
 */
export const useOrderRoute = (orderId: string | null) => {
  return useQuery({
    queryKey: ['driver-order-route', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const { data } = await apiClient.get<DriverOrderRouteResponse>(`/delivery/orders/${orderId}/route`);
      return data;
    },
    enabled: !!orderId,
  });
};
