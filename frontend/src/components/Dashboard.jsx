import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Search, Plus, PlusCircle, Package, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "./Header";
import { t } from "./translations";

import {
  groceryApi,
  useGetItemsQuery,
  useLookupItemMutation,
  useGetMeQuery,
  useLogoutMutation,
  useRegenerateItemMutation,
  useGetItemTrendsQuery,
  useUpdateStockMutation,
} from "../store/apiSlice";
import { addToCart, clearActiveList } from "../store/cartSlice";

export default function Dashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const lang = useSelector((state) => state.cartState.lang);
  const cart = useSelector((state) => state.cartState.cart);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [itemInput, setItemInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  const [regeneratingId, setRegeneratingId] = useState(null);
  const [showTrendsId, setShowTrendsId] = useState(null);

  const { data: items = [], isLoading } = useGetItemsQuery({ search, category: selectedCategory });
  const [lookupItem, { isLoading: isLookingUp }] = useLookupItemMutation();
  const [regenerateItem] = useRegenerateItemMutation();
  const [updateStock] = useUpdateStockMutation();

  const [editingStockId, setEditingStockId] = useState(null);
  const [inputStock, setInputStock] = useState("");
  const [inputPrice, setInputPrice] = useState("");

  const handleUpdateStockSubmit = async (itemId) => {
    try {
      await updateStock({
        id: itemId,
        stock: inputStock !== "" ? Number(inputStock) : undefined,
        price: inputPrice !== "" ? Number(inputPrice) : undefined
      }).unwrap();
      setEditingStockId(null);
      setInputStock("");
      setInputPrice("");
    } catch (err) {
      console.error("Failed to update stock/price:", err);
    }
  };

  const refreshedIdsRef = useRef(new Set());

  // Auto-refresh prices that are older than 24 hours on load
  useEffect(() => {
    if (items.length > 0) {
      const now = new Date();
      const oneDay = 24 * 60 * 60 * 1000;
      
      const toRefresh = items.filter(item => {
        // Only trigger if we haven't processed it in this session yet
        if (refreshedIdsRef.current.has(item._id)) {
          return false;
        }
        
        // Refresh if no timestamp exists or if the latest update was > 24 hours ago
        if (!item.lastPriceUpdated) return true;
        const lastUpdate = new Date(item.lastPriceUpdated);
        return (now - lastUpdate) > oneDay;
      });

      if (toRefresh.length > 0) {
        // Register items immediately to prevent loops
        toRefresh.forEach(item => refreshedIdsRef.current.add(item._id));

        const triggerRefreshes = async () => {
          // Process sequentially to prevent concurrent API rate-limits
          for (const item of toRefresh) {
            try {
              await regenerateItem(item._id).unwrap();
            } catch (err) {
              console.error("Auto-price-refresh failed for item:", item._id, err);
            }
          }
        };
        triggerRefreshes();
      }
    }
  }, [items, regenerateItem]);

  const { data: userData } = useGetMeQuery();
  const [logout] = useLogoutMutation();

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
    } finally {
      dispatch(clearActiveList());
      dispatch(groceryApi.util.resetApiState());
      navigate("/");
    }
  };

  const getItemNameDisplay = (item) => {
    if (!item) return "Unknown";
    if (!item.translations || item.translations.length === 0) {
      return item.name || "Unknown";
    }
    const translation = item.translations.find((t) => t.languageCode === lang);
    const activeTranslation = translation || item.translations[0];
    return activeTranslation && activeTranslation.names.length > 0
      ? activeTranslation.names.join(", ")
      : item.name || "Unknown";
  };

  const getSubNameDisplay = (item) => {
    if (!item || !item.translations || item.translations.length === 0) return "";
    const alternateLang = lang === "en" ? "te" : "en";
    const translation = item.translations.find(
      (t) => t.languageCode === alternateLang,
    );
    return translation ? translation.names.join(", ") : "";
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const categoryColors = {
    Vegetables: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    Fruits: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
    Groceries: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
    Spices: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    Dairy: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20",
    Beverages: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-500/20",
    Snacks: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20",
    Others: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20",
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
        {userData?.user?.role === 'seller' && (
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
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="text"
                    value={itemInput}
                    onChange={(e) => setItemInput(e.target.value)}
                    placeholder={t[lang].inputPlaceholder}
                    required
                    className="flex-1 text-foreground bg-background border-border"
                  />
                  <Button type="submit" disabled={isLookingUp} className="w-full sm:w-auto font-semibold">
                    {isLookingUp ? t[lang].translating : t[lang].submit}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Search bar and Category Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder={t[lang].searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 py-5 rounded-xl border-border bg-card shadow-sm text-foreground w-full"
            />
          </div>
          
          {userData?.user?.role === 'seller' && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-11 px-4 rounded-xl border border-border bg-card shadow-sm text-foreground font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value="Vegetables">{t[lang].categories.Vegetables || "Vegetables"}</option>
              <option value="Fruits">{t[lang].categories.Fruits || "Fruits"}</option>
              <option value="Groceries">{t[lang].categories.Groceries || "Groceries"}</option>
              <option value="Spices">{t[lang].categories.Spices || "Spices"}</option>
              <option value="Dairy">{t[lang].categories.Dairy || "Dairy"}</option>
              <option value="Beverages">{t[lang].categories.Beverages || "Beverages"}</option>
              <option value="Snacks">{t[lang].categories.Snacks || "Snacks & Sweets"}</option>
              <option value="Others">{t[lang].categories.Others || "Others"}</option>
            </select>
          )}
        </div>

        {/* Items list */}
        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            Loading catalog...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {items.map((item) => {
              const diffPercent = item.avgPrice > 0 && item.latestPrice > 0
                ? Math.round(((item.latestPrice - item.avgPrice) / item.avgPrice) * 100)
                : 0;

              return (
                <div
                  key={item._id}
                  className={`bg-card p-4 rounded-xl border flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${
                    userData?.user?.role !== 'seller' && item.stock === 0
                      ? 'border-rose-500/30 bg-rose-500/[0.02] shadow-sm shadow-rose-500/[0.02]'
                      : 'border-border hover:shadow-primary/5 hover:border-primary/20'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={getItemNameDisplay(item)}
                          referrerPolicy="no-referrer"
                          className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg object-cover bg-background border border-border shrink-0 shadow-sm"
                        />
                      ) : (
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center justify-center text-4xl sm:text-5xl font-bold uppercase select-none">
                          {getItemNameDisplay(item).charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider ${categoryColors[item.category] || categoryColors.Others}`}>
                            {t[lang].categories[item.category] || item.category}
                          </span>
                          {userData?.user?.role !== 'seller' && (
                            item.stock === 0 ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-extrabold uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                ⚠️ Out of Stock
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                🟢 {item.stock} left
                              </span>
                            )
                          )}
                          {userData?.user?.role === 'seller' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-extrabold uppercase bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                              📦 Stock: {item.stock}
                            </span>
                          )}
                        </div>
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
                      <span className="font-semibold text-muted-foreground">{t[lang].priceLabel}</span>
                      {item.latestPrice > 0 ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-foreground">₹{item.latestPrice}/{item.defaultUnit}</span>
                          
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
                          <span className="text-[10px] text-muted-foreground">({t[lang].avgLabel}{item.avgPrice})</span>
                        </div>
                      ) : (
                        <span className="italic text-muted-foreground/80">{t[lang].noPrice}</span>
                      )}
                    </div>

                    {/* Render time-series aggregation price charts */}
                    {showTrendsId === item._id && (
                      <ItemTrendsDrawer itemId={item._id} lang={lang} />
                    )}

                    {/* Inline stock manager panel */}
                    {userData?.user?.role === 'seller' && editingStockId === item._id && (
                      <div className="bg-muted border border-border/70 rounded-lg p-3 space-y-2 mt-2">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Update Inventory Level & Price</div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input
                            type="number"
                            min="0"
                            placeholder="Stock Level"
                            value={inputStock}
                            onChange={(e) => setInputStock(e.target.value)}
                            className="h-8 text-xs bg-background"
                          />
                          <Input
                            type="number"
                            min="1"
                            placeholder="New Price ₹"
                            value={inputPrice}
                            onChange={(e) => setInputPrice(e.target.value)}
                            className="h-8 text-xs bg-background"
                          />
                          <div className="flex gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStockSubmit(item._id)}
                              className="h-8 text-xs font-semibold px-3"
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingStockId(null);
                                setInputStock("");
                                setInputPrice("");
                              }}
                              className="h-8 text-xs font-semibold px-2"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons (Responsive Layout) */}
                  <div className="mt-4 pt-3 border-t border-border flex flex-col xs:flex-row xs:items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground font-semibold">
                      Unit: {item.defaultUnit}
                    </span>
                    
                    <div className="flex flex-wrap items-center gap-1.5 justify-end">
                      {/* Price Trends Toggle */}
                      {item.latestPrice > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowTrendsId(showTrendsId === item._id ? null : item._id)}
                          className="h-8 text-xs font-semibold text-primary hover:text-primary/80 px-2.5"
                        >
                          {showTrendsId === item._id ? "Hide Trends" : t[lang].priceTrends}
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={regeneratingId === item._id}
                        onClick={() => handleRegenerate(item._id)}
                        className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground px-2"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${regeneratingId === item._id ? 'animate-spin text-primary' : ''}`} />
                        <span className="hidden xs:inline">{regeneratingId === item._id ? t[lang].fetching : t[lang].fetchAgain}</span>
                        {regeneratingId !== item._id && <span className="xs:hidden">Refresh</span>}
                      </Button>

                      {userData?.user?.role === 'seller' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingStockId(editingStockId === item._id ? null : item._id);
                            setInputStock(item.stock.toString());
                            setInputPrice(item.latestPrice ? item.latestPrice.toString() : "");
                          }}
                          className={`h-8 gap-1.5 font-bold px-3 ${editingStockId === item._id ? 'border-primary/50 text-primary bg-primary/5' : ''}`}
                        >
                          Manage Stock
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={item.stock === 0}
                          onClick={() => dispatch(addToCart(item))}
                          className="h-8 gap-1.5 font-bold px-3"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add
                        </Button>
                      )}
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

// Sub-component: Displays interactive mini trends chart for a specific period with magnified price scales and color cues
function MiniTrendChart({ trendData, period }) {
  if (trendData.length === 0) {
    return <div className="text-[9px] text-muted-foreground/50 italic py-4 text-center">No history logged</div>;
  }

  const displayItems = trendData.slice(-4); // last 4 data points
  const prices = displayItems.map((d) => d.avgPrice);
  
  // Dynamic scale calculation to amplify fluctuations
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  return (
    <div className="flex items-end justify-between h-16 gap-2 pt-5 border-b border-border/30 pb-1">
      {displayItems.map((data, index) => {
        // Calculate height. If there is a range, amplify differences; otherwise default to 60%.
        let barHeight = 60;
        if (priceRange > 0) {
          const ratio = (data.avgPrice - minPrice) / priceRange; // 0 to 1
          barHeight = Math.round(25 + ratio * 65); // scales height from 25% to 90%
        }

        const currentPrice = data.avgPrice;
        const prevPrice = index > 0 ? displayItems[index - 1].avgPrice : null;

        // Color coding based on price direction (emerald for cheaper, rose for expensive)
        let barColorClass = "bg-primary/10 hover:bg-primary/30 border-primary/20";
        let priceColorClass = "text-muted-foreground";

        if (prevPrice !== null) {
          if (currentPrice < prevPrice) {
            barColorClass = "bg-emerald-500/20 hover:bg-emerald-500/40 border-emerald-500/30";
            priceColorClass = "text-emerald-600 dark:text-emerald-400 font-extrabold";
          } else if (currentPrice > prevPrice) {
            barColorClass = "bg-rose-500/20 hover:bg-rose-500/40 border-rose-500/30";
            priceColorClass = "text-rose-600 dark:text-rose-400 font-extrabold";
          }
        }

        let displayLabel = data.label;
        if (data.label.includes('-')) {
          const dateParts = data.label.split('-');
          const shortDate = dateParts.slice(1).join('/');
          displayLabel = period === 'week' ? `Wk ${shortDate}` : shortDate;
        }

        return (
          <div key={index} className="flex-1 flex flex-col items-center relative group">
            {/* Price tag displayed directly on top of the bar */}
            <span className={`text-[8px] font-mono tracking-tighter mb-1 absolute bottom-full ${priceColorClass}`}>
              ₹{currentPrice}
            </span>
            
            {/* The bar */}
            <div
              style={{ height: `${barHeight}%` }}
              className={`w-full rounded-t border transition-all duration-300 ${barColorClass}`}
            />
            
            {/* Label */}
            <span className="text-[7px] text-muted-foreground/90 mt-1 font-semibold whitespace-nowrap">
              {displayLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Sub-component: Displays daily and weekly trends side-by-side directly on the card
function ItemTrendsDrawer({ itemId, lang }) {
  const { data: dayTrends = [], isLoading: loadingDay } = useGetItemTrendsQuery({ id: itemId, period: 'day' });
  const { data: weekTrends = [], isLoading: loadingWeek } = useGetItemTrendsQuery({ id: itemId, period: 'week' });

  const isLoading = loadingDay || loadingWeek;

  return (
    <div className="bg-muted/10 border-l-2 border-l-primary/60 border-t border-r border-b border-border/40 rounded-r-lg p-3 space-y-3 mt-3.5 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="text-[10px] font-bold text-foreground/90 tracking-wider flex items-center justify-between pb-1.5 border-b border-border/30">
        <span className="flex items-center gap-1">📊 {t[lang].priceTrends}</span>
        <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest scale-90">Live</span>
      </div>

      {isLoading ? (
        <div className="text-[9px] text-center text-muted-foreground/80 py-4 animate-pulse">Loading trends...</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 divide-x divide-border/30">
          {/* Day Trends */}
          <div className="space-y-1">
            <span className="text-[8px] font-bold text-muted-foreground/80 uppercase tracking-widest block flex items-center gap-1">
              📅 {t[lang].dayLabel}
            </span>
            <MiniTrendChart trendData={dayTrends} period="day" />
          </div>

          {/* Week Trends */}
          <div className="pl-4 space-y-1">
            <span className="text-[8px] font-bold text-muted-foreground/80 uppercase tracking-widest block flex items-center gap-1">
              🗓️ {t[lang].weekLabel}
            </span>
            <MiniTrendChart trendData={weekTrends} period="week" />
          </div>
        </div>
      )}
    </div>
  );
}
