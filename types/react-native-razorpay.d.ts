declare module "react-native-razorpay" {
    export interface RazorpayOptions {
        description?: string;
        image?: string;
        currency?: string;
        key: string;
        amount: string | number;
        name: string;
        order_id: string;
        prefill?: {
            email?: string;
            contact?: string;
            name?: string;
        };
        theme?: {
            color?: string;
        };
        [key: string]: any;
    }

    export interface RazorpaySuccessResponse {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
    }

    export interface RazorpayErrorResponse {
        code: number;
        description: string;
        source?: string;
        step?: string;
        reason?: string;
        metadata?: {
            payment_id?: string;
            order_id?: string;
        };
    }

    class RazorpayCheckout {
        static open(
            options: RazorpayOptions,
            successCallback?: (data: RazorpaySuccessResponse) => void,
            errorCallback?: (error: RazorpayErrorResponse) => void
        ): Promise<RazorpaySuccessResponse>;

        static onExternalWalletSelection(
            callback: (data: { external_wallet_name: string }) => void
        ): void;
    }

    export default RazorpayCheckout;
}
