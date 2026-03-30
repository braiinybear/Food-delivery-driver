import apiClient from "@/lib/axios";
import {
  DeliveryPartnerRequestBody,
  DeliveryPartnerResponse,
  DeliveryPartnerStatusResponse,
} from "../types/rider";

import { useMutation, useQuery } from "@tanstack/react-query";

export const applyForDeliveryPartner = async (
  body: DeliveryPartnerRequestBody,
): Promise<DeliveryPartnerResponse> => {
  const { data } = await apiClient.post("/api/partner-requests/delivery", body);

  return data as DeliveryPartnerResponse;
};

export const useApplyDeliveryPartner = () => {
  return useMutation({
    mutationFn: applyForDeliveryPartner,
    onSuccess: (data) => {
      console.log("✅ Application submitted:", data);
    },

    onError: (error: any) => {
      if (error?.response?.status === 409) {
        console.log("⚠️ Already applied");
      } else if (error?.response?.status === 401) {
        console.log("🔒 Session expired");
      } else {
        console.log("❌ Something went wrong");
      }
    },
  });
};

export const getMyDeliveryPartnerStatus =
  async (): Promise<DeliveryPartnerStatusResponse> => {
    const { data } = await apiClient.get("/api/partner-requests/delivery/me");
    return data;
  };

export const useDeliveryPartnerStatus = () => {
  return useQuery({
    queryKey: ["delivery-partner-status"],
    queryFn: getMyDeliveryPartnerStatus,
    retry: false, // important for 404
  });
};
