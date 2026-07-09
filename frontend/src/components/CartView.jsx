import { useSelector, useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Package, Trash2, ArrowLeft, Save, FolderOpen, RefreshCw, Edit2, CreditCard, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "./Header";
import { t } from "./translations";
import { useState, useMemo } from "react";

import { 
  groceryApi,
  useGetMeQuery, 
  useLogoutMutation,
  useGetListsQuery,
  useCreateListMutation,
  useDeleteListMutation,
  useUpdateListMutation
} from "../store/apiSlice";
import { updateQuantity, removeFromCart, loadCart, clearActiveList, updateActiveListName } from "../store/cartSlice";

export default function CartView() {
  const navigate = useNavigate();
  const lang = useSelector((state) => state.cartState.lang);
  const cart = useSelector((state) => state.cartState.cart);
  
  const activeListId = useSelector((state) => state.cartState.activeListId);
  const activeListName = useSelector((state) => state.cartState.activeListName);
  
  const dispatch = useDispatch();

  const [listName, setListName] = useState("");
  const [saveError, setSaveError] = useState("");

  const [editingListId, setEditingListId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const { data: userData } = useGetMeQuery();
  const [logout] = useLogoutMutation();

  const { data: savedLists = [], isLoading: isLoadingLists } = useGetListsQuery();
  const [createList, { isLoading: isSavingList }] = useCreateListMutation();
  const [deleteList] = useDeleteListMutation();
  const [updateList, { isLoading: isUpdatingList }] = useUpdateListMutation();

  const [listSearch, setListSearch] = useState("");

  const filteredLists = useMemo(() => {
    return savedLists.filter(list =>
      list.name.toLowerCase().includes(listSearch.toLowerCase())
    );
  }, [savedLists, listSearch]);

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

  const handleSaveNewList = async (e) => {
    e.preventDefault();
    setSaveError("");
    if (!listName.trim()) return;

    try {
      const newList = await createList({
        name: listName.trim(),
        items: cart
      }).unwrap();
      
      dispatch(loadCart(newList));
      setListName("");
    } catch (err) {
      setSaveError(err.data?.error || "Failed to save grocery list.");
    }
  };

  const handleUpdateList = async () => {
    setSaveError("");
    try {
      await updateList({
        id: activeListId,
        listData: { items: cart }
      }).unwrap();
    } catch (err) {
      setSaveError(err.data?.error || "Failed to update grocery list.");
    }
  };

  const handleRenameList = async (id) => {
    if (!renameValue.trim()) return;
    try {
      await updateList({
        id,
        listData: { name: renameValue.trim() }
      }).unwrap();
      
      dispatch(updateActiveListName({ id, name: renameValue.trim() }));
      setEditingListId(null);
    } catch (err) {
      console.error("Rename failed:", err);
    }
  };

  const handleLoadList = (savedList) => {
    dispatch(loadCart(savedList));
  };

  const handleDeleteList = async (id) => {
    try {
      await deleteList(id).unwrap();
      if (activeListId === id) {
        dispatch(clearActiveList());
      }
    } catch (err) {
      console.error("Delete list failed:", err);
    }
  };

  const getItemNameDisplay = (item) => {
    const translation = item.translations.find((t) => t.languageCode === lang);
    const activeTranslation = translation || item.translations[0];
    return activeTranslation ? activeTranslation.names.join(", ") : "Unknown";
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const grandTotal = cart.reduce((sum, entry) => sum + (entry.quantity * (entry.latestPrice || 0)), 0);

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

        {/* Section 1: Active Staged List */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col min-h-[300px]">
          <div className="flex items-center gap-2 border-b border-border pb-4 mb-4">
            <ShoppingCart className="w-5 h-5 text-foreground" />
            <h2 className="font-bold text-foreground text-lg">
              {activeListName ? `Staged: ${activeListName}` : t[lang].cart}
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
            <div className="space-y-4 flex-1 mb-6">
              {cart.map((entry) => {
                const itemPrice = entry.latestPrice || 0;
                const lineTotal = entry.quantity * itemPrice;

                return (
                  <div
                    key={entry._id}
                    className="p-3.5 bg-muted/30 rounded-lg border border-border flex flex-col xs:flex-row xs:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      {entry.imageUrl ? (
                        <img
                          src={entry.imageUrl}
                          alt={getItemNameDisplay(entry)}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded object-cover border border-border shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center justify-center text-lg font-bold uppercase select-none">
                          {getItemNameDisplay(entry).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">
                          {getItemNameDisplay(entry)}
                        </h4>
                        <p className="text-[10px] text-muted-foreground font-medium">
                          {t[lang].qty}: {entry.quantity} {entry.defaultUnit} 
                          {itemPrice > 0 && ` @ ₹${itemPrice}/${entry.defaultUnit}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between xs:justify-end gap-3 border-t xs:border-t-0 border-border/40 pt-2 xs:pt-0">
                      {itemPrice > 0 && (
                        <span className="text-sm font-bold text-foreground pr-1">
                          ₹{lineTotal}
                        </span>
                      )}

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
                          className="px-2.5 py-1 hover:bg-muted font-bold text-xs text-foreground"
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
                          className="px-2.5 py-1 hover:bg-muted font-bold text-xs text-foreground"
                        >
                          +
                        </button>
                      </div>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => dispatch(removeFromCart(entry._id))}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Saving / Updating Form */}
          {cart.length > 0 && (
            <div className="border-t border-border pt-4">
              
              {/* Grand Total Value Banner */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-muted-foreground">{t[lang].totalLabel}</span>
                <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                  ₹{grandTotal}
                </span>
              </div>

              {saveError && (
                <p className="text-xs text-red-500 bg-red-50/10 p-2 mb-3 rounded border border-red-500/20">
                  {saveError}
                </p>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                {activeListId && (
                  <Button 
                    onClick={handleUpdateList} 
                    disabled={isUpdatingList}
                    className="gap-2 font-semibold flex-1 h-11 px-6"
                  >
                    <RefreshCw className={`w-4 h-4 ${isUpdatingList ? 'animate-spin' : ''}`} />
                    Update "{activeListName}"
                  </Button>
                )}

                <form onSubmit={handleSaveNewList} className="flex gap-2 flex-[2] w-full">
                  <Input
                    type="text"
                    placeholder={activeListId ? "Save copy as..." : t[lang].saveListPlaceholder}
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                    required
                    className="flex-1 bg-background text-foreground border-border h-11"
                  />
                  <Button type="submit" disabled={isSavingList} variant={activeListId ? "outline" : "default"} className="gap-2 font-semibold h-11 px-5">
                    <Save className="w-4 h-4" />
                    {activeListId ? "Save Copy" : t[lang].saveListButton}
                  </Button>
                </form>
              </div>

              {/* Proceed to checkout Navigation Button */}
              <Button asChild className="w-full h-11 font-bold text-xs gap-1.5 shadow mt-4 bg-emerald-600 hover:bg-emerald-500 text-white">
                <Link to="/checkout">
                  <CreditCard className="w-4 h-4" /> Proceed to Checkout
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Section 2: Saved Lists View with Inflation Tracker */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-4">
            <FolderOpen className="w-5 h-5 text-foreground" />
            <h3 className="font-bold text-foreground text-lg">
              {t[lang].savedListsHeading}
            </h3>
          </div>

          {/* Search Input for lists */}
          {savedLists.length > 0 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Search saved grocery lists by name..."
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                className="pl-9 h-8 text-[11px] bg-background border-border text-foreground rounded-lg"
              />
            </div>
          )}

          {isLoadingLists ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Loading lists...
            </div>
          ) : savedLists.length === 0 ? (
            <p className="text-center py-6 text-sm text-muted-foreground">
              {t[lang].noSavedLists}
            </p>
          ) : filteredLists.length === 0 ? (
            <p className="text-center py-6 text-xs text-muted-foreground">
              No matching grocery lists found for "{listSearch}".
            </p>
          ) : (
            <div className="space-y-4">
              {filteredLists.map((list) => (
                <div
                  key={list._id}
                  className={`p-4 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-sm transition ${
                    activeListId === list._id 
                      ? 'border-primary bg-primary/5 dark:bg-primary/5' 
                      : 'border-border bg-muted/20'
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    {editingListId === list._id ? (
                      <div className="flex gap-2 items-center w-full max-w-md">
                        <Input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="h-8 text-sm bg-background border-border text-foreground"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => handleRenameList(list._id)}
                          className="h-8 text-xs font-semibold"
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingListId(null)}
                          className="h-8 text-xs text-muted-foreground"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <h4 className="font-bold text-foreground flex items-center gap-2">
                        {list.name}
                        {activeListId === list._id && (
                          <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold uppercase border border-primary/20">
                            Staged
                          </span>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingListId(list._id);
                            setRenameValue(list.name);
                          }}
                          className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      </h4>
                    )}
                    
                    {list.originalValue > 0 && list.currentValue > 0 ? (
                      <div className="space-y-1">
                        <p className="text-[11px] text-muted-foreground">
                          {t[lang].originalCost}: <span className="font-semibold text-foreground">₹{list.originalValue}</span> • {t[lang].currentValuation}: <span className="font-semibold text-foreground">₹{list.currentValue}</span>
                        </p>
                        
                        {(() => {
                          const diff = list.currentValue - list.originalValue;
                          const percent = Math.round((diff / list.originalValue) * 100);

                          if (percent > 0) {
                            return (
                              <span className="inline-flex text-[9px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded">
                                🔴 +{percent}% {t[lang].inflation}
                              </span>
                            );
                          } else if (percent < 0) {
                            return (
                              <span className="inline-flex text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                                🟢 {percent}% {t[lang].deflation}
                              </span>
                            );
                          } else {
                            return (
                              <span className="inline-flex text-[9px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 px-1.5 py-0.5 rounded">
                                ⚪ {t[lang].stable}
                              </span>
                            );
                          }
                        })()}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {list.items.length} {t[lang].listItemsCount} • Saved on {new Date(list.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 self-end sm:self-center">
                    <Button
                      size="sm"
                      variant={activeListId === list._id ? "default" : "outline"}
                      onClick={() => handleLoadList(list)}
                      className="border-border text-foreground hover:bg-muted"
                    >
                      {t[lang].loadList}
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteList(list._id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
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
