import apiClient from "@/lib/axios";
import { DeliveryProfile } from "@/types/rider";

import { useQuery } from "@tanstack/react-query";
export const getMyDeliveryProfile = async (): Promise<DeliveryProfile> => {
  const { data } = await apiClient.get("/delivery/me");
  return data;
};
export const useDeliveryProfile = () => {
  return useQuery({
    queryKey: ["delivery-profile"],
    queryFn: getMyDeliveryProfile,
    staleTime: 1000 * 60 * 5,
  });
};