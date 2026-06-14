import { useQuery } from "@tanstack/react-query";
import apiClient from "../lib/axios";
import { AppUser } from "@/types/user";

export const useUser = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/auth/me");
      return data as AppUser;
    },
    ...options,
  });
};
