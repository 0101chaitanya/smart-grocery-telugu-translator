import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Search, Plus, PlusCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "./Header";
import { t } from "./translations";

import {
  useGetItemsQuery,
  useLookupItemMutation,
  useGetMeQuery,
  useLogoutMutation,
} from "../store/apiSlice";
import { addToCart } from "../store/cartSlice";

// Color codes for item categories
const categoryColors = {
  Vegetables:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  Fruits:
    "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
  Groceries:
    "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
  Spices:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  Others:
    "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20",
};

export default function Dashboard() {
  const lang = useSelector((state) => state.cartState.lang);
  const cart = useSelector((state) => state.cartState.cart);

  const [search, setSearch] = useState("");
  const [itemInput, setItemInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: items = [], isLoading } = useGetItemsQuery(search);
  const [lookupItem, { isLoading: isLookingUp }] = useLookupItemMutation();

  const { data: userData } = useGetMeQuery();
  const [logout] = useLogoutMutation();
  const dispatch = useDispatch();

  const handleLookupAndAdd = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (!itemInput.trim()) return;

    try {
      await lookupItem(itemInput.trim()).unwrap();
      setItemInput("");
    } catch (err) {
      setErrorMsg(
        err.data?.error || "Failed to search or auto-translate this item.",
      );
    }
  };

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

  const getSubNameDisplay = (item) => {
    const alternateLang = lang === "en" ? "te" : "en";
    const translation = item.translations.find(
      (t) => t.languageCode === alternateLang,
    );
    return translation ? translation.names.join(", ") : "";
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

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Translate & Add Form */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
            <PlusCircle className="w-5 h-5 text-muted-foreground" />
            {t[lang].addSection}
          </h3>
          {errorMsg && (
            <p className="text-xs text-red-500 bg-red-50/10 p-2.5 rounded-lg border border-red-500/20 mb-4">
              {errorMsg}
            </p>
          )}
          <form onSubmit={handleLookupAndAdd} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                {t[lang].inputLabel}
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={itemInput}
                  onChange={(e) => setItemInput(e.target.value)}
                  placeholder={t[lang].inputPlaceholder}
                  required
                  className="flex-1 text-foreground bg-background border-border"
                />
                <Button type="submit" disabled={isLookingUp}>
                  {isLookingUp ? t[lang].translating : t[lang].submit}
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder={t[lang].searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 py-5 rounded-xl border-border bg-card shadow-sm text-foreground"
          />
        </div>

        {/* Items list */}
        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            Loading catalog...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map((item) => (
              <div
                key={item._id}
                className="bg-card p-4 rounded-xl border border-border flex flex-col justify-between hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 hover:border-primary/20 transition-all duration-200"
              >
                <div className="flex gap-4">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={getItemNameDisplay(item)}
                      className="w-16 h-16 rounded-lg object-cover bg-background border border-border shrink-0 shadow-sm"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted border border-border shrink-0 flex items-center justify-center text-muted-foreground">
                      <Package className="w-6 h-6 stroke-[1.5]" />
                    </div>
                  )}

                  <div>
                    {/* Dynamic Category Badges */}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider ${categoryColors[item.category] || categoryColors.Others}`}
                    >
                      {t[lang].categories[item.category] || item.category}
                    </span>
                    <h3 className="font-bold text-foreground text-lg mt-1.5">
                      {getItemNameDisplay(item)}
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium italic mt-0.5">
                      {getSubNameDisplay(item)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">
                    Unit: {item.defaultUnit}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => dispatch(addToCart(item))}
                    className="h-8 gap-1.5 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
