import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { ShoppingCart, Package, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "./Header";
import { t } from "./translations";

import { useGetMeQuery, useLogoutMutation } from "../store/apiSlice";
import { updateQuantity, removeFromCart } from "../store/cartSlice";

export default function CartView() {
  const lang = useSelector((state) => state.cartState.lang);
  const cart = useSelector((state) => state.cartState.cart);
  const dispatch = useDispatch();

  const { data: userData } = useGetMeQuery();
  const [logout] = useLogoutMutation();

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const getItemNameDisplay = (item) => {
    const translation = item.translations.find((t) => t.languageCode === lang);
    const activeTranslation = translation || item.translations[0];
    return activeTranslation ? activeTranslation.names.join(", ") : "Unknown";
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-200">
      <Header
        lang={lang}
        userData={userData}
        handleLogout={handleLogout}
        cartCount={totalCartCount}
      />

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <Link
          to="/"
          className="inline-flex items-center text-sm font-semibold text-muted-foreground hover:text-foreground transition gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {t[lang].backToCatalog}
        </Link>

        <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col min-h-[400px]">
          <div className="flex items-center gap-2 border-b border-border pb-4 mb-4">
            <ShoppingCart className="w-5 h-5 text-foreground" />
            <h2 className="font-bold text-foreground text-lg">
              {t[lang].cart}
            </h2>
            <span className="ml-auto bg-muted text-muted-foreground text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {totalCartCount} items
            </span>
          </div>

          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center space-y-2">
              <Package className="w-10 h-10 stroke-[1.5]" />
              <p className="text-sm">{t[lang].cartEmpty}</p>
            </div>
          ) : (
            <div className="space-y-4 flex-1">
              {cart.map((entry) => (
                <div
                  key={entry._id}
                  className="p-3 bg-muted/30 rounded-lg border border-border flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {entry.imageUrl && (
                      <img
                        src={entry.imageUrl}
                        alt={getItemNameDisplay(entry)}
                        className="w-10 h-10 rounded object-cover border border-border"
                      />
                    )}
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">
                        {getItemNameDisplay(entry)}
                      </h4>
                      <p className="text-[10px] text-muted-foreground">
                        {t[lang].qty}: {entry.quantity} {entry.defaultUnit}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-border rounded bg-background">
                      <button
                        onClick={() =>
                          dispatch(
                            updateQuantity({
                              _id: entry._id,
                              quantity: Math.max(0.25, entry.quantity - 0.25),
                            }),
                          )
                        }
                        className="px-2 py-0.5 hover:bg-muted font-bold text-xs text-foreground"
                      >
                        -
                      </button>
                      <span className="px-2 text-xs font-semibold text-foreground">
                        {entry.quantity}
                      </span>
                      <button
                        onClick={() =>
                          dispatch(
                            updateQuantity({
                              _id: entry._id,
                              quantity: entry.quantity + 0.25,
                            }),
                          )
                        }
                        className="px-2 py-0.5 hover:bg-muted font-bold text-xs text-foreground"
                      >
                        +
                      </button>
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => dispatch(removeFromCart(entry._id))}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
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
