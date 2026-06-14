// ── Wallet Balance ────────────────────────────────────────────────────────────

export interface WalletBalanceResponse {
    id: string;
    userId: string;
    balance: number;
}

// ── Wallet Transactions ──────────────────────────────────────────────────────

export interface WalletTransaction {
    id: string;
    walletId: string;
    /** Transaction reason — e.g. "TOPUP", "ORDER_PAYMENT:xxx", "DELIVERY_EARNING:xxx", "WITHDRAWAL_HOLD" */
    type: string;
    /** Whether money was added (CREDIT) or removed (DEBIT) */
    direction: "CREDIT" | "DEBIT";
    amount: number;
    createdAt: string;
}

export interface PaginatedTransactionsResponse {
    data: WalletTransaction[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        totalAdded: number;
        totalSpent: number;
    };
}

// ── Wallet Top-Up (Razorpay) ─────────────────────────────────────────────────

export interface WalletTopUpPayload {
    amount: number;
}

export interface WalletTopUpResponse {
    razorpayOrder: {
        amount: number;
        amount_due: number;
        amount_paid: number;
        attempts: number;
        created_at: number;
        currency: string;
        entity: string;
        id: string;
        notes: any[];
        offer_id: string | null;
        receipt: string;
        status: string;
    };
    topupRequestId: string;
    amount: number;
}

export interface VerifyWalletTopUpPayload {
    razorpayPaymentId: string;
    razorpayOrderId: string;
    razorpaySignature: string;
}

export interface VerifyWalletTopUpResponse {
    success: boolean;
    balance: number;
    transaction: WalletTransaction;
}

// ── Withdrawals ──────────────────────────────────────────────────────────────

export interface CreateWithdrawalPayload {
    amount: number;
    bankAccountName: string;
    bankAccountNumber: string;
    ifscCode: string;
}

export interface Withdrawal {
    id: string;
    userId: string;
    amount: number;
    status: "PENDING" | "APPROVED" | "REJECTED" | "HELD";
    bankAccountName: string;
    bankAccountNumber: string;
    ifscCode: string;
    rejectionReason: string | null;
    processedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface PaginatedWithdrawalsResponse {
    data: Withdrawal[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
