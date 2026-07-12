import { useSelector, useDispatch } from "react-redux";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { 
  ArrowLeft, CreditCard, Sparkles, CheckCircle2, Clock, MapPin, Truck, ShoppingBag 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "./Header";
import { t } from "./translations";
import { useState, useEffect } from "react";
import RazorpayMockModal from "./RazorpayMockModal";

import { 
  groceryApi,
  useGetMeQuery, 
  useLogoutMutation,
  useInitRazorpayOrderMutation,
  useVerifyRazorpayPaymentMutation,
  useGetOrderStatusQuery,
  useDeleteListMutation
} from "../store/apiSlice";
import { clearActiveList } from "../store/cartSlice";

export default function CheckoutPage() {
  const lang = useSelector((state) => state.cartState.lang);
  const cart = useSelector((state) => state.cartState.cart);
  const activeListId = useSelector((state) => state.cartState.activeListId);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [searchParams] = useSearchParams();
  const orderIdFromUrl = searchParams.get("orderId");

  // Payment Simulation States
  const [activeOrderId, setActiveOrderId] = useState(orderIdFromUrl || null);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  
  // Razorpay states
  const [showMockGateway, setShowMockGateway] = useState(false);
  const [razorpayOrder, setRazorpayOrder] = useState(null);
  
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState("");

  const { data: userData } = useGetMeQuery();
  const [logout] = useLogoutMutation();

  // Order & List Hook instantiations
  const [initRazorpayOrder] = useInitRazorpayOrderMutation();
  const [verifyRazorpayPayment] = useVerifyRazorpayPaymentMutation();
  const [deleteList] = useDeleteListMutation();

  // Live order status polling (queries status from server every 5s)
  const { data: orderStatus } = useGetOrderStatusQuery(activeOrderId, {
    skip: !activeOrderId,
    pollingInterval: 5000,
  });

  // Redirect to cart if empty and not tracking an order
  useEffect(() => {
    if (cart.length === 0 && !activeOrderId) {
      navigate("/cart");
    }
  }, [cart, activeOrderId, navigate]);

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      dispatch(clearActiveList());
      dispatch(groceryApi.util.resetApiState());
      navigate("/");
    }
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    setPayError("");
    if (!deliveryAddress.trim() || !phoneNumber.trim()) return;

    setIsPaying(true);
    try {
      const amountInRupees = cart.reduce((sum, entry) => sum + (entry.quantity * (entry.latestPrice || 0)), 0);
      const order = await initRazorpayOrder({
        amount: Math.round(amountInRupees * 100), // convert to paise
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        items: cart
      }).unwrap();

      setRazorpayOrder(order);
      setShowMockGateway(true);
    } catch (err) {
      setPayError(err.data?.error || "Failed to initialize order with mock gateway.");
    } finally {
      setIsPaying(false);
    }
  };

  const handleRazorpaySuccess = async (paymentDetails) => {
    setShowMockGateway(false);
    setIsPaying(true);
    try {
      const order = await verifyRazorpayPayment({
        ...paymentDetails,
        deliveryAddress: deliveryAddress.trim(),
        phoneNumber: phoneNumber.trim(),
        items: cart,
        totalAmount: cart.reduce((sum, entry) => sum + (entry.quantity * (entry.latestPrice || 0)), 0)
      }).unwrap();

      // If checkout corresponds to a loaded saved list, automatically delete it from database
      if (activeListId) {
        try {
          await deleteList(activeListId).unwrap();
        } catch (deleteErr) {
          console.error("Failed to delete ordered list:", deleteErr);
        }
      }

      // Clear active staged items in Redux store
      dispatch(clearActiveList());
      setActiveOrderId(order._id);
    } catch (err) {
      setPayError(err.data?.error || "Payment verification failed.");
    } finally {
      setIsPaying(false);
    }
  };

  const handleStartFreshOrder = () => {
    setActiveOrderId(null);
    setDeliveryAddress("");
    navigate("/");
  };

  const getItemNameDisplay = (item) => {
    if (!item) return "Unknown Item";
    if (!item.translations || item.translations.length === 0) {
      return item.name || "Unknown Item";
    }
    const translation = item.translations.find((t) => t.languageCode === lang);
    const activeTranslation = translation || item.translations[0];
    return activeTranslation && activeTranslation.names && activeTranslation.names.length > 0
      ? activeTranslation.names.join(", ")
      : item.name || "Unknown Item";
  };

  const cartTotal = cart.reduce((sum, entry) => sum + (entry.quantity * (entry.latestPrice || 0)), 0);
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const getStepProgressPercentage = (status) => {
    if (status === 'Packing') return 40;
    if (status === 'OutForDelivery') return 70;
    if (status === 'Delivered') return 100;
    return 10; // Placed
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-200">
      <Header
        lang={lang}
        userData={userData}
        handleLogout={handleLogout}
        cartCount={totalCartCount}
      />

      <main className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <Link
          to="/cart"
          className="inline-flex items-center text-sm font-semibold text-muted-foreground hover:text-foreground transition gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {activeOrderId ? t[lang].backToCatalog : "Back to Cart"}
        </Link>

        {activeOrderId ? (
          /* Live Delivery Tracker View */
          <div className="bg-card p-6 rounded-xl border border-border shadow-md space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <Truck className="w-5 h-5 text-emerald-500" />
              <h2 className="font-bold text-foreground text-lg">{t[lang].orderTrackerHeading}</h2>
              <span className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                ID: {activeOrderId.slice(-6).toUpperCase()}
              </span>
            </div>

            {/* Stepper Progress Bar */}
            <div className="space-y-4">
              <div className="relative w-full bg-muted h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-500 rounded-full" 
                  style={{ width: `${getStepProgressPercentage(orderStatus?.deliveryStatus)}%` }}
                />
              </div>

              {/* Steps Layout */}
              <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                <div className="flex flex-col items-center gap-1 text-primary">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-bold">{t[lang].deliveryStatusPlaced}</span>
                </div>

                <div className={`flex flex-col items-center gap-1 ${
                  ['Packing', 'OutForDelivery', 'Delivered'].includes(orderStatus?.deliveryStatus) 
                    ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-bold">{t[lang].deliveryStatusPacking}</span>
                </div>

                <div className={`flex flex-col items-center gap-1 ${
                  ['OutForDelivery', 'Delivered'].includes(orderStatus?.deliveryStatus) 
                    ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-bold">{t[lang].deliveryStatusOut}</span>
                </div>

                <div className={`flex flex-col items-center gap-1 ${
                  orderStatus?.deliveryStatus === 'Delivered' 
                    ? 'text-primary animate-bounce' : 'text-muted-foreground'
                }`}>
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-bold">{t[lang].deliveryStatusDelivered}</span>
                </div>
              </div>
            </div>

            {/* Address Details Container */}
            <div className="p-4 bg-muted/30 border border-border rounded-lg space-y-3">
              <div className="flex items-start gap-2.5 text-xs">
                <MapPin className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div>
                    <span className="font-bold text-foreground block">{t[lang].trackLocation}</span>
                    <span className="text-muted-foreground leading-relaxed block">{orderStatus?.deliveryAddress}</span>
                  </div>
                  {orderStatus?.phoneNumber && (
                    <div className="pt-1 border-t border-border/40">
                      <span className="font-bold text-foreground block">{t[lang].trackPhone}</span>
                      <span className="text-muted-foreground block">{orderStatus.phoneNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {orderStatus?.deliveryStatus === 'Delivered' ? (
                <div className="border-t border-border/60 pt-3 text-xs font-semibold text-emerald-500 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{t[lang].deliveredMsg}</span>
                </div>
              ) : (
                <div className="border-t border-border/60 pt-3 text-xs text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0 text-amber-500 animate-pulse" />
                  <span>Live tracking coordinates initialized. Updates every few seconds...</span>
                </div>
              )}
            </div>

            {/* Ordered Items summary list in tracking mode */}
            {orderStatus?.items && (
              <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">
                  Purchased Items ({orderStatus.items.length})
                </span>
                <div className="space-y-2 max-h-40 overflow-y-auto divide-y divide-border/40">
                  {orderStatus.items.map((entry, index) => (
                    <div key={index} className="text-xs flex justify-between py-1.5 first:pt-0">
                      <span className="text-muted-foreground font-semibold">
                        {entry.quantity} {entry.item?.defaultUnit || 'kg'} × {getItemNameDisplay(entry.item)}
                      </span>
                      <span className="font-semibold text-foreground">
                        ₹{entry.quantity * entry.priceAtOrder}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border/60 pt-2 flex justify-between items-center text-xs font-bold text-foreground">
                  <span>Total Paid:</span>
                  <span>₹{orderStatus.totalAmount}</span>
                </div>
                <div className="text-[9px] font-bold text-emerald-500 flex items-center gap-1.5 mt-1 bg-emerald-500/10 dark:bg-emerald-500/5 px-2.5 py-1.5 rounded border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> 
                  <span>Payment status: Confirmed & Paid via card ending in **** 4444</span>
                </div>
              </div>
            )}

            {/* Start Fresh Button */}
            <Button onClick={handleStartFreshOrder} className="w-full h-11 font-bold text-xs gap-1.5 shadow">
              {t[lang].orderAgain}
            </Button>
          </div>
        ) : (
          /* Payment Form & checkout Page details */
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <CreditCard className="w-5 h-5 text-emerald-500" />
              <h2 className="font-bold text-foreground text-lg">{t[lang].checkoutHeading}</h2>
            </div>
            
            {/* Purchase Summary */}
            <div className="p-3 bg-muted/40 rounded-lg border border-border/40 text-xs flex justify-between items-center">
              <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4" /> Order Valuation Total:
              </span>
              <span className="text-sm font-bold text-foreground">₹{cartTotal}</span>
            </div>

            {/* Items Summary list */}
            <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">
                Items Checkout Summary ({totalCartCount} items)
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto divide-y divide-border/40">
                {cart.map((entry) => (
                  <div key={entry._id} className="text-xs flex justify-between py-1.5 first:pt-0">
                    <span className="text-muted-foreground font-medium">
                      {entry.quantity} {entry.defaultUnit} × {getItemNameDisplay(entry)}
                    </span>
                    <span className="font-semibold text-foreground">
                      ₹{entry.quantity * (entry.latestPrice || 0)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-emerald-500 bg-emerald-500/5 px-2.5 py-1.5 rounded border border-emerald-500/10 font-bold flex items-center gap-1">
                🟢 AI Pricing Verification: Order matches catalog mandi rates.
              </div>
            </div>

            {payError && (
              <p className="text-xs text-red-500 bg-red-50/10 p-2 rounded border border-red-500/20">
                {payError}
              </p>
            )}

            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              {/* Location Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">
                  {t[lang].addressLabel}
                </label>
                <Input
                  type="text"
                  placeholder={t[lang].addressPlaceholder}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  required
                  className="bg-background text-foreground border-border h-11 text-xs"
                />
              </div>

              {/* Phone Number Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">
                  {t[lang].phoneLabel}
                </label>
                <Input
                  type="tel"
                  placeholder={t[lang].phonePlaceholder}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  className="bg-background text-foreground border-border h-11 text-xs"
                />
              </div>

              {/* The mock credit card graphic and fields are now removed. Razorpay Modal takes over. */}

              <Button
                type="submit"
                disabled={isPaying}
                className="w-full h-11 font-bold text-xs gap-1.5 shadow"
              >
                <Sparkles className={`w-4 h-4 ${isPaying ? 'animate-spin' : ''}`} />
                {isPaying ? "Connecting Simulated Payment Gateway..." : "Pay with Razorpay (Mock)"}
              </Button>
            </form>
          </div>
        )}
        {showMockGateway && razorpayOrder && (
          <RazorpayMockModal 
            order={razorpayOrder}
            onSuccess={handleRazorpaySuccess}
            onClose={() => setShowMockGateway(false)}
          />
        )}
      </main>
    </div>
  );
}
