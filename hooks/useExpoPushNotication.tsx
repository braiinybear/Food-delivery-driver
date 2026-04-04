import apiClient from "@/lib/axios";
import {
  RegisterPushTokenRequest,
  RegisterPushTokenResponse,
  UpdatePushTokenRequest,
  UpdatePushTokenResponse,
} from "@/types/notifications";
import { useMutation } from "@tanstack/react-query";

export const registerPushToken = async (
  body: RegisterPushTokenRequest,
): Promise<RegisterPushTokenResponse> => {
  const { data } = await apiClient.post(
    "/api/notifications/register-push-token",
    body,
  );

  return data;
};

export const useRegisterPushToken = () => {
  return useMutation({
    mutationFn: registerPushToken,

    onSuccess: () => {
      console.log("✅ Push token registered");
    },

    onError: () => {
      console.log("❌ Failed to register push token");
    },
  });
};

export const updatePushToken = async (
  body: UpdatePushTokenRequest,
): Promise<UpdatePushTokenResponse> => {
  const { data } = await apiClient.patch("/api/notifications/push-token", body);

  return data;
};


export const useUpdatePushToken = () => {
  return useMutation({
    mutationFn: updatePushToken,

    onSuccess: () => {
      console.log("✅ Push token updated");
    },

    onError: () => {
      console.log("❌ Failed to update push token");
    },
  });
};