// react-native-razorpay ships no TypeScript types (JS-only package) — minimal ambient
// declaration covering the subset this app actually uses (order + subscription checkout).
declare module "react-native-razorpay" {
  export type RazorpayCheckoutOptions = {
    description?: string;
    image?: string;
    currency: string;
    key: string;
    amount?: string;
    order_id?: string;
    subscription_id?: string;
    name: string;
    prefill?: { email?: string; contact?: string; name?: string };
    theme?: { color?: string };
  };

  export type RazorpayCheckoutSuccess = {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_subscription_id?: string;
    razorpay_signature: string;
  };

  export type RazorpayCheckoutError = { code: number; description: string };

  const RazorpayCheckout: {
    open(options: RazorpayCheckoutOptions): Promise<RazorpayCheckoutSuccess>;
  };

  export default RazorpayCheckout;
}
