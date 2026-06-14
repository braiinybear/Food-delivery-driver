import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/axios";
import {
    WalletBalanceResponse,
    PaginatedTransactionsResponse,
    WalletTopUpPayload,
    WalletTopUpResponse,
    VerifyWalletTopUpPayload,
    VerifyWalletTopUpResponse,
    CreateWithdrawalPayload,
    Withdrawal,
    PaginatedWithdrawalsResponse
} from "../types/wallet";

// ── Wallet Queries ────────────────────────────────────────────────────────────

/** Fetch the current user's wallet balance */
export const useWalletBalance = () => {
    return useQuery<WalletBalanceResponse>({
        queryKey: ["wallet", "balance"],
        queryFn: async (): Promise<WalletBalanceResponse> => {
            const { data } = await apiClient.get("/api/wallets/balance");
            return data;
        },
    });
};

const TX_PAGE_LIMIT = 10;

/** Fetch wallet transaction history with infinite scroll */
export const useWalletTransactions = (limit = TX_PAGE_LIMIT) => {
    return useInfiniteQuery<PaginatedTransactionsResponse>({
        queryKey: ["wallet", "transactions", limit],
        queryFn: async ({ pageParam }) => {
            const { data } = await apiClient.get("/api/wallets/transactions", {
                params: { page: pageParam, limit },
            });
            return data;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            const { page, totalPages } = lastPage.meta;
            return page < totalPages ? page + 1 : undefined;
        },
    });
};

// ── Wallet Top-Up (Razorpay) Mutations ────────────────────────────────────────

/** Step 1 – Initiate a wallet top-up via Razorpay */
export const useWalletTopUp = () => {
    return useMutation<WalletTopUpResponse, Error, WalletTopUpPayload>({
        mutationFn: async (payload: WalletTopUpPayload): Promise<WalletTopUpResponse> => {
            const { data } = await apiClient.post("/api/wallets/topup", payload);
            return data;
        },
    });
};

/** Step 2 – Verify top-up signature and credit the wallet */
export const useVerifyWalletTopUp = () => {
    const queryClient = useQueryClient();
    return useMutation<VerifyWalletTopUpResponse, Error, VerifyWalletTopUpPayload>({
        mutationFn: async (payload: VerifyWalletTopUpPayload): Promise<VerifyWalletTopUpResponse> => {
            const { data } = await apiClient.post("/api/wallets/verify", payload);
            return data;
        },
        onSuccess: () => {
            // Refresh wallet balance, transactions, and driver-earnings after successful top-up
            queryClient.invalidateQueries({ queryKey: ["wallet"] });
            queryClient.invalidateQueries({ queryKey: ["driver-earnings"] });
        },
    });
};

// ── Withdrawals (Payouts) Queries & Mutations ────────────────────────────────

/** Request a new wallet withdrawal (Payout) */
export const useRequestWithdrawal = () => {
    const queryClient = useQueryClient();
    return useMutation<Withdrawal, Error, CreateWithdrawalPayload>({
        mutationFn: async (payload: CreateWithdrawalPayload): Promise<Withdrawal> => {
            const { data } = await apiClient.post("/api/wallets/withdrawals", payload);
            return data;
        },
        onSuccess: () => {
            // Refresh wallet balance, transactions, driver-earnings and withdrawal history
            queryClient.invalidateQueries({ queryKey: ["wallet"] });
            queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
            queryClient.invalidateQueries({ queryKey: ["withdrawal-requests"] });
            queryClient.invalidateQueries({ queryKey: ["driver-earnings"] });
        },
    });
};

const WITHDRAWALS_PAGE_LIMIT = 10;

/** Fetch user's withdrawal requests history with infinite scroll */
export const useMyWithdrawals = (limit = WITHDRAWALS_PAGE_LIMIT) => {
    return useInfiniteQuery<PaginatedWithdrawalsResponse>({
        queryKey: ["withdrawals", "my", limit],
        queryFn: async ({ pageParam }) => {
            const { data } = await apiClient.get("/api/wallets/withdrawals/my", {
                params: { page: pageParam, limit },
            });
            return data;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            const { page, totalPages } = lastPage.meta;
            return page < totalPages ? page + 1 : undefined;
        },
    });
};

/** Fetch user's withdrawal requests history with standard pagination (page/limit) */
export const useWithdrawalRequests = (page = 1, limit = 10) => {
    return useQuery<PaginatedWithdrawalsResponse>({
        queryKey: ["withdrawal-requests", page, limit],
        queryFn: async (): Promise<PaginatedWithdrawalsResponse> => {
            const { data } = await apiClient.get("/api/wallets/withdrawals/my", {
                params: { page, limit },
            });
            return data;
        },
    });
};

