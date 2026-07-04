import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import {
  ShoppingCart,
  Package,
  Trash2,
  ArrowLeft,
  Save,
  FolderOpen,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "./Header";
import { t } from "./translations";
import { useState } from "react";

import {
  useGetMeQuery,
  useLogoutMutation,
  useGetListsQuery,
  useCreateListMutation,
  useDeleteListMutation,
  useUpdateListMutation,
} from "../store/apiSlice";
import {
  updateQuantity,
  removeFromCart,
  loadCart,
  clearActiveList,
} from "../store/cartSlice";

export default function CartView() {
  const lang = useSelector((state) => state.cartState.lang);
  const cart = useSelector((state) => state.cartState.cart);

  // Read active list state from Redux
  const activeListId = useSelector((state) => state.cartState.activeListId);
  const activeListName = useSelector((state) => state.cartState.activeListName);

  const dispatch = useDispatch();

  const [listName, setListName] = useState("");
  const [saveError, setSaveError] = useState("");

  const { data: userData } = useGetMeQuery();
  const [logout] = useLogoutMutation();

  // Saved Lists Hooks
  const { data: savedLists = [], isLoading: isLoadingLists } =
    useGetListsQuery();
  const [createList, { isLoading: isSavingList }] = useCreateListMutation();
  const [deleteList] = useDeleteListMutation();
  const [updateList, { isLoading: isUpdatingList }] = useUpdateListMutation();

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleSaveNewList = async (e) => {
    e.preventDefault();
    setSaveError("");
    if (!listName.trim()) return;

    try {
      const newList = await createList({
        name: listName.trim(),
        items: cart,
      }).unwrap();

      // Track this newly created list as the active one
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
        listData: { items: cart },
      }).unwrap();
    } catch (err) {
      setSaveError(err.data?.error || "Failed to update grocery list.");
    }
  };

  const handleLoadList = (savedList) => {
    // Format list items back to cart shape
    const cartItems = savedList.items
      .map((entry) => {
        if (!entry.item) return null;
        return {
          ...entry.item,
          quantity: entry.quantity,
        };
      })
      .filter(Boolean);

    // Dispatch both cart items and active list info to Redux
    dispatch(
      loadCart({
        items: cartItems,
        _id: savedList._id,
        name: listName || savedList.name,
      }),
    );
  };

  const handleDeleteList = async (id) => {
    try {
      await deleteList(id).unwrap();
      // If we deleted the list we were editing, clear current editing status
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
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col min-h-75">
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
                    className="p-3 bg-muted/30 rounded-lg border border-border flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {entry.imageUrl && (
                        <img
                          src={entry.imageUrl}
                          alt={getItemNameDisplay(entry)}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded object-cover border border-border"
                        />
                      )}
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">
                          {getItemNameDisplay(entry)}
                        </h4>
                        <p className="text-[10px] text-muted-foreground">
                          {t[lang].qty}: {entry.quantity} {entry.defaultUnit}
                          {itemPrice > 0 &&
                            ` @ ₹${itemPrice}/${entry.defaultUnit}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Line Cost Total */}
                      {itemPrice > 0 && (
                        <span className="text-sm font-bold text-foreground pr-2">
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
                );
              })}
            </div>
          )}

          {/* Saving / Updating Form */}
          {cart.length > 0 && (
            <div className="border-t border-border pt-4">
              {/* Paste the Grand Total Value Banner here: */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-muted-foreground">
                  {t[lang].totalLabel}
                </span>
                <span className="text-xl font-bold bg-linear-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                  ₹
                  {cart.reduce(
                    (sum, entry) =>
                      sum + entry.quantity * (entry.latestPrice || 0),
                    0,
                  )}
                </span>
              </div>
              {saveError && (
                <p className="text-xs text-red-500 bg-red-50/10 p-2 mb-3 rounded border border-red-500/20">
                  {saveError}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                {/* 1. If currently editing a list, show "Update" button */}
                {activeListId && (
                  <Button
                    onClick={handleUpdateList}
                    disabled={isUpdatingList}
                    className="gap-2 font-semibold flex-1"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${isUpdatingList ? "animate-spin" : ""}`}
                    />
                    Update "{activeListName}"
                  </Button>
                )}

                {/* 2. Save as new list option */}
                <form
                  onSubmit={handleSaveNewList}
                  className="flex gap-2 flex-2 w-full"
                >
                  <Input
                    type="text"
                    placeholder={
                      activeListId
                        ? "Save copy as..."
                        : t[lang].saveListPlaceholder
                    }
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                    required
                    className="flex-1 bg-background text-foreground border-border"
                  />
                  <Button
                    type="submit"
                    disabled={isSavingList}
                    variant={activeListId ? "outline" : "default"}
                    className="gap-2 font-semibold"
                  >
                    <Save className="w-4 h-4" />
                    {activeListId ? "Save Copy" : t[lang].saveListButton}
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Saved Lists View */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-2 border-b border-border pb-4 mb-4">
            <FolderOpen className="w-5 h-5 text-foreground" />
            <h3 className="font-bold text-foreground text-lg">
              {t[lang].savedListsHeading}
            </h3>
          </div>

          {isLoadingLists ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Loading lists...
            </div>
          ) : savedLists.length === 0 ? (
            <p className="text-center py-6 text-sm text-muted-foreground">
              {t[lang].noSavedLists}
            </p>
          ) : (
            <div className="space-y-4">
              {savedLists.map((list) => (
                <div
                  key={list._id}
                  className={`p-4 border rounded-xl flex items-center justify-between hover:shadow-sm transition ${
                    activeListId === list._id
                      ? "border-primary bg-primary/5 dark:bg-primary/5"
                      : "border-border bg-muted/20"
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-foreground flex items-center gap-2">
                      {list.name}
                      {activeListId === list._id && (
                        <span className="text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-bold uppercase">
                          Staged
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {list.items.length} {t[lang].listItemsCount} • Saved on{" "}
                      {new Date(list.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {/* Load Saved List */}
                    <Button
                      size="sm"
                      variant={
                        activeListId === list._id ? "default" : "outline"
                      }
                      onClick={() => handleLoadList(list)}
                      className="border-border text-foreground hover:bg-muted"
                    >
                      {t[lang].loadList}
                    </Button>

                    {/* Delete Saved List */}
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
