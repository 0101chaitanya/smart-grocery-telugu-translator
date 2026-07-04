import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { ArrowLeft, Clock, MapPin, ClipboardList, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "./Header";
import { t } from "./translations";

import { 
  useGetMeQuery, 
  useLogoutMutation,
  useGetOrdersQuery 
} from "../store/apiSlice";

export default function OrdersHistoryPage() {
  const lang = useSelector((state) => state.cartState.lang);
  const cart = useSelector((state) => state.cartState.cart);

  const { data: userData } = useGetMeQuery();
  const [logout] = useLogoutMutation();

  // RTK Query: fetch all previous orders (automatically polls or refetches on mount)
  const { data: orders = [], isLoading } = useGetOrdersQuery(undefined, {
    refetchOnMountOrArgChange: true
  });

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const getItemNameDisplay = (item) => {
    if (!item) return "Unknown Item";
    const translation = item.translations?.find((t) => t.languageCode === lang);
    const activeTranslation = translation || item.translations?.[0];
    return activeTranslation ? activeTranslation.names.join(", ") : "Unknown Item";
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Helper to format status text and badge colors dynamically
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "Placed":
        return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20";
      case "Packing":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
      case "OutForDelivery":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20";
      case "Delivered":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
      default:
        return "bg-muted text-muted-foreground border border-border/40";
    }
  };

  const getStatusDisplayLabel = (status) => {
    switch (status) {
      case "Placed":
        return t[lang].deliveryStatusPlaced;
      case "Packing":
        return t[lang].deliveryStatusPacking;
      case "OutForDelivery":
        return t[lang].deliveryStatusOut;
      case "Delivered":
        return t[lang].deliveryStatusDelivered;
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-200">
      <Header
        lang={lang}
        userData={userData}
        handleLogout={handleLogout}
        cartCount={totalCartCount}
      />

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <Link
          to="/"
          className="inline-flex items-center text-sm font-semibold text-muted-foreground hover:text-foreground transition gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {t[lang].backToCatalog}
        </Link>

        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-2 border-b border-border pb-4 mb-6">
            <ClipboardList className="w-5 h-5 text-foreground" />
            <h2 className="font-bold text-foreground text-lg">{t[lang].ordersHeading}</h2>
            <span className="ml-auto bg-muted text-muted-foreground text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {orders.length} orders
            </span>
          </div>

          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Loading order history...
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground space-y-2">
              <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground/60 stroke-[1.5]" />
              <p className="text-sm">{t[lang].noOrders}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <div
                  key={order._id}
                  className="p-4 bg-muted/20 border border-border rounded-xl space-y-4 hover:border-primary/10 transition-colors duration-200"
                >
                  {/* Order header row details */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">
                        Order ID: #{order._id.slice(-6).toUpperCase()}
                      </span>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${getStatusBadgeStyle(order.deliveryStatus)}`}>
                      {getStatusDisplayLabel(order.deliveryStatus)}
                    </span>
                  </div>

                  {/* Delivery Location & Phone */}
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-foreground">{t[lang].trackLocation}</strong> {order.deliveryAddress}
                      </span>
                    </div>
                    {order.phoneNumber && (
                      <div className="pl-[22px] flex items-center gap-1">
                        <strong className="text-foreground">{t[lang].trackPhone}</strong>
                        <span>{order.phoneNumber}</span>
                      </div>
                    )}
                  </div>

                  {/* Ordered Items summary list */}
                  <div className="space-y-1.5 pl-5 border-l-2 border-border/60">
                    {order.items.map((entry, index) => (
                      <div key={index} className="text-xs text-muted-foreground flex justify-between">
                        <span>
                          {entry.quantity} {entry.item?.defaultUnit || "kg"} × {getItemNameDisplay(entry.item)}
                        </span>
                        <span className="font-semibold text-foreground">
                          ₹{entry.quantity * entry.priceAtOrder}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Order footer pricing & track linkage */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                    <div>
                      <span className="text-muted-foreground">{t[lang].orderTotal}</span>
                      <span className="font-bold text-foreground text-sm ml-1.5">₹{order.totalAmount}</span>
                    </div>

                    {order.deliveryStatus !== "Delivered" ? (
                      <Button asChild size="sm" className="h-8 gap-1 font-bold">
                        <Link to={`/checkout?orderId=${order._id}`}>
                          {t[lang].trackOrder} <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
