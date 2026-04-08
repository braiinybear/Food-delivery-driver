import apiClient from '@/lib/axios';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface DeliveryMutationResponse {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Accept a delivery order
 */
export const useAcceptDelivery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data } = await apiClient.post<DeliveryMutationResponse>(
        `/delivery/orders/${orderId}/accept`
      );
      return data;
    },
    onSuccess: () => {
      // Invalidate available orders and current delivery
      queryClient.invalidateQueries({ queryKey: ['driver-available-orders'] });
      queryClient.invalidateQueries({ queryKey: ['driver-current-delivery'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-profile'] });
    },
  });
};

/**
 * Confirm pickup of a delivery order
 */
export const usePickupDelivery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data } = await apiClient.post<DeliveryMutationResponse>(
        `/delivery/orders/${orderId}/pickup`
      );
      return data;
    },
    onSuccess: () => {
      // Invalidate current delivery to fetch updated status
      queryClient.invalidateQueries({ queryKey: ['driver-current-delivery'] });
    },
  });
};

/**
 * Decline a delivery order
 */
export const useDeclineDelivery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data } = await apiClient.post<DeliveryMutationResponse>(
        `/delivery/orders/${orderId}/decline`
      );
      return data;
    },
    onSuccess: () => {
      // Refresh available orders to get next order
      queryClient.invalidateQueries({ queryKey: ['driver-available-orders'] });
    },
  });
};

/**
 * Complete delivery with customer OTP
 */
export const useCompleteDelivery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, otp }: { orderId: string; otp: string }) => {
      const { data } = await apiClient.post<DeliveryMutationResponse>(
        `/delivery/orders/${orderId}/complete`,
        { otp }
      );
      return data;
    },
    onSuccess: () => {
      // Refresh current delivery and earnings
      queryClient.invalidateQueries({ queryKey: ['driver-current-delivery'] });
      queryClient.invalidateQueries({ queryKey: ['driver-earnings'] });
      queryClient.invalidateQueries({ queryKey: ['driver-available-orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-profile'] });
    },
  });
};

/**
 * Cancel an active delivery and release it for re-dispatch
 */
export const useCancelActiveDelivery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data } = await apiClient.post<DeliveryMutationResponse>(
        `/delivery/orders/${orderId}/cancel`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-current-delivery'] });
      queryClient.invalidateQueries({ queryKey: ['driver-available-orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-profile'] });
    },
  });
};

/**
 * Toggle driver status (Online/Offline)
 */
export const useToggleDriverStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (status: 'ONLINE' | 'OFFLINE') => {
      const { data } = await apiClient.patch<DeliveryMutationResponse>(
        '/delivery/status',
        { status }
      );
      return data;
    },
    onSuccess: () => {
      // Refresh available orders when coming online
      queryClient.invalidateQueries({ queryKey: ['driver-available-orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-profile'] });
      queryClient.invalidateQueries({ queryKey: ['driver-current-delivery'] });
    },
  });
};
