import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Search, Plus, PlusCircle, Package, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "./Header";
import { t } from "./translations";

import {
  useGetItemsQuery,
  useLookupItemMutation,
  useGetMeQuery,
  useLogoutMutation,
  useRegenerateItemMutation,
  useGetItemTrendsQuery, // Import trends query hook
} from "../store/apiSlice";
import { addToCart } from "../store/cartSlice";

export default function Dashboard() {
  const lang = useSelector((state) => state.cartState.lang);
  const cart = useSelector((state) => state.cartState.cart);

  const [search, setSearch] = useState("");
  const [itemInput, setItemInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [regeneratingId, setRegeneratingId] = useState(null);
  const [showTrendsId, setShowTrendsId] = useState(null); // Track open trends drawer

  const { data: items = [], isLoading } = useGetItemsQuery(search);
  const [lookupItem, { isLoading: isLookingUp }] = useLookupItemMutation();
  const [regenerateItem] = useRegenerateItemMutation();

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

  const handleRegenerate = async (id) => {
    setRegeneratingId(id);
    try {
      await regenerateItem(id).unwrap();
    } catch (err) {
      console.error("Regeneration failed:", err);
    } finally {
      setRegeneratingId(null);
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
            {items.map((item) => {
              const diffPercent =
                item.avgPrice > 0 && item.latestPrice > 0
                  ? Math.round(
                      ((item.latestPrice - item.avgPrice) / item.avgPrice) *
                        100,
                    )
                  : 0;

              return (
                <div
                  key={item._id}
                  className="bg-card p-4 rounded-xl border border-border flex flex-col justify-between hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 hover:border-primary/20 transition-all duration-200"
                >
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={getItemNameDisplay(item)}
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 rounded-lg object-cover bg-background border border-border shrink-0 shadow-sm"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted border border-border shrink-0 flex items-center justify-center text-muted-foreground">
                          <Package className="w-6 h-6 stroke-[1.5]" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider ${categoryColors[item.category] || categoryColors.Others}`}
                        >
                          {t[lang].categories[item.category] || item.category}
                        </span>
                        <h3 className="font-bold text-foreground text-lg mt-1.5 truncate">
                          {getItemNameDisplay(item)}
                        </h3>
                        <p className="text-xs text-muted-foreground font-medium italic mt-0.5 truncate">
                          {getSubNameDisplay(item)}
                        </p>
                      </div>
                    </div>

                    {/* Price Status */}
                    <div className="bg-muted/40 p-2.5 rounded-lg border border-border/50 text-xs flex flex-wrap gap-2 items-center justify-between">
                      <span className="font-semibold text-muted-foreground">
                        {t[lang].priceLabel}
                      </span>
                      {item.latestPrice > 0 ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-foreground">
                            ₹{item.latestPrice}/{item.defaultUnit}
                          </span>

                          {diffPercent < 0 && (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold">
                              {Math.abs(diffPercent)}% {t[lang].cheaperLabel}
                            </span>
                          )}
                          {diffPercent > 0 && (
                            <span className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded font-bold">
                              +{diffPercent}% {t[lang].expensiveLabel}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            ({t[lang].avgLabel}
                            {item.avgPrice})
                          </span>
                        </div>
                      ) : (
                        <span className="italic text-muted-foreground/80">
                          {t[lang].noPrice}
                        </span>
                      )}
                    </div>

                    {/* Render time-series aggregation price charts */}
                    {showTrendsId === item._id && (
                      <ItemTrendsDrawer itemId={item._id} lang={lang} />
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Unit: {item.defaultUnit}
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Price Trends Toggle */}
                      {item.latestPrice > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setShowTrendsId(
                              showTrendsId === item._id ? null : item._id,
                            )
                          }
                          className="h-8 text-xs font-semibold text-primary hover:text-primary/80"
                        >
                          {showTrendsId === item._id
                            ? "Hide Trends"
                            : t[lang].priceTrends}
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={regeneratingId === item._id}
                        onClick={() => handleRegenerate(item._id)}
                        className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${regeneratingId === item._id ? "animate-spin text-primary" : ""}`}
                        />
                        {regeneratingId === item._id
                          ? t[lang].fetching
                          : t[lang].fetchAgain}
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => dispatch(addToCart(item))}
                        className="h-8 gap-1.5 font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

// Sub-component: Displays interactive trends chart and period selections
function ItemTrendsDrawer({ itemId, lang }) {
  const [period, setPeriod] = useState("day");
  const { data: trendData = [], isLoading } = useGetItemTrendsQuery({
    id: itemId,
    period,
  });

  const periods = [
    { key: "day", label: t[lang].dayLabel },
    { key: "week", label: t[lang].weekLabel },
    { key: "month", label: t[lang].monthLabel },
    { key: "year", label: t[lang].yearLabel },
  ];

  return (
    <div className="bg-muted/30 border border-border/50 rounded-lg p-3 space-y-3 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground">
          {t[lang].priceTrends}
        </span>
        {/* Period Selector Tabs */}
        <div className="flex bg-muted rounded p-0.5 border border-border">
          {periods.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`text-[9px] px-2 py-0.5 rounded font-bold transition ${
                period === p.key
                  ? "bg-card text-foreground shadow-sm animate-in fade-in scale-in-95 duration-100"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-[10px] text-center text-muted-foreground py-4">
          Loading stats...
        </div>
      ) : trendData.length === 0 ? (
        <div className="text-[10px] text-center text-muted-foreground py-4">
          {t[lang].noTrends}
        </div>
      ) : (
        <div>
          {/* Dynamic Pure CSS Bar Chart */}
          {(() => {
            const maxVal = Math.max(...trendData.map((d) => d.avgPrice), 1);
            return (
              <div className="flex items-end justify-between h-20 gap-2 pt-4 border-b border-border/50 mb-2">
                {trendData.slice(-6).map((data, index) => {
                  const barHeight = Math.round((data.avgPrice / maxVal) * 100);

                  // Format label dynamically to look neat (shorten date formats)
                  let displayLabel = data.label;
                  if (
                    data.label.includes("-") &&
                    (period === "day" || period === "month")
                  ) {
                    displayLabel = data.label.split("-").slice(1).join("/");
                  }

                  return (
                    <div
                      key={index}
                      className="flex-1 flex flex-col items-center group relative"
                    >
                      {/* Bar columns */}
                      <div
                        style={{ height: `${barHeight}%` }}
                        className="w-full bg-primary/20 hover:bg-primary rounded-t transition-all duration-300 relative"
                      >
                        {/* Hover Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[9px] py-0.5 px-1.5 rounded shadow border border-border whitespace-nowrap mb-1 transition-opacity duration-150 pointer-events-none font-bold z-10">
                          ₹{data.avgPrice}
                        </div>
                      </div>
                      {/* Label under bar */}
                      <span className="text-[8px] text-muted-foreground mt-1 truncate max-w-full font-semibold">
                        {displayLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
