import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Globe,
  Search,
  Plus,
  ShoppingCart,
  Trash2,
  PlusCircle,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Hooks and actions from Redux
import { useGetItemsQuery, useLookupItemMutation } from "./store/apiSlice";
import {
  toogleLanguage,
  addToCart,
  updateQuantity,
  removeFromCart,
} from "./store/cartSlice";

const t = {
  en: {
    title: "Mana Grocery Tracker",
    subtitle: "Bilingual Grocery Cart & Gemma Translator",
    langButton: "తెలుగు",
    searchPlaceholder: "Search items (English or Telugu regional names)...",
    addSection: "Translate & Add New Item",
    category: "Category",
    unit: "Default Unit",
    inputLabel: "Item Name (English or Telugu)",
    inputPlaceholder: "e.g. Onion or టమోటా",
    submit: "Lookup & Add",
    translating: "Translating...",
    categories: {
      Groceries: "Groceries",
      Vegetables: "Vegetables",
      Fruits: "Fruits",
      Spices: "Spices",
      Others: "Others",
    },
    cart: "Shopping Cart",
    cartEmpty: "Your cart is empty. Add items from the catalog!",
    totalItems: "Total Items",
    qty: "Qty",
  },
  te: {
    title: "మన గ్రోసరీ ట్రాకర్",
    subtitle: "భాషా అనువాదం & గెమ్మా ట్రాన్స్‌లేటర్",
    langButton: "English",
    searchPlaceholder:
      "సరుకులు వెతకండి (ఇంగ్లీష్ లేదా తెలుగు ప్రాంతీయ పేర్లు)...",
    addSection: "కొత్త సరుకును జోడించండి",
    category: "రకము",
    unit: "కొలత ప్రమాణం",
    inputLabel: "సరుకు పేరు (ఇంగ్లీష్ లేదా తెలుగులో)",
    inputPlaceholder: "ఉదా: Onion లేదా టమోటా",
    submit: "అనువదించి జోడించు",
    translating: "అనువదిస్తోంది...",
    categories: {
      Groceries: "కిరాణా సరుకులు",
      Vegetables: "కూరగాయలు",
      Fruits: "పండ్లు",
      Spices: "మసాలా దినుసులు",
      Others: "ఇతరములు",
    },
    cart: "షాపింగ్ కార్ట్",
    cartEmpty: "మీ కార్ట్ ఖాళీగా ఉంది. సరుకులను చేర్చండి!",
    totalItems: "మొత్తం సరుకులు",
    qty: "పరిమాణం",
  },
};

export default function App() {
  const dispatch = useDispatch();

  // Read state from Redux
  const lang = useSelector((state) => state.cartState.lang);
  const cart = useSelector((state) => state.cartState.cart);

  // Local component state for UI inputs
  const [search, setSearch] = useState("");
  const [itemInput, setItemInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // RTK Query: Fetch items (auto-refreshing cache)
  const { data: items = [], isLoading } = useGetItemsQuery(search);

  // RTK Query: Add item lookup mutation hook (Google Gemma 4)
  const [lookupItem, { isLoading: isLookingUp }] = useLookupItemMutation();

  const handleLookupAndAdd = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!itemInput.trim()) return;

    try {
      // Trigger the RTK Query lookup mutation
      await lookupItem(itemInput.trim()).unwrap();
      setItemInput("");
    } catch (err) {
      setErrorMsg(
        err.data?.error || "Failed to search or auto-translate this item.",
      );
    }
  };

  // Helper to extract translation name based on chosen language
  const getItemNameDisplay = (item) => {
    const translation = item.translations.find((t) => t.languageCode === lang);
    const activeTranslation = translation || item.translations[0];
    return activeTranslation ? activeTranslation.names.join(", ") : "Unknown";
  };

  // Helper to get secondary language translation for context
  const getSubNameDisplay = (item) => {
    const alternateLang = lang === "en" ? "te" : "en";
    const translation = item.translations.find(
      (t) => t.languageCode === alternateLang,
    );
    return translation ? translation.names.join(", ") : "";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {t[lang].title}
            </h1>
            <p className="text-xs text-slate-500">{t[lang].subtitle}</p>
          </div>
          <Button
            onClick={() => dispatch(toogleLanguage())}
            className="rounded-full gap-2"
            variant="outline"
          >
            <Globe className="w-4 h-4" />
            {t[lang].langButton}
          </Button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Search and Catalog Additions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder={t[lang].searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 py-5 rounded-xl border-slate-200 bg-white"
            />
          </div>

          {/* Catalog grid */}
          {isLoading ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              Loading catalog...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {items.map((item) => (
                <div
                  key={item._id}
                  className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col justify-between hover:shadow-sm transition"
                >
                  <div>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider">
                      {t[lang].categories[item.category] || item.category}
                    </span>
                    <h3 className="font-bold text-slate-800 text-lg mt-2">
                      {getItemNameDisplay(item)}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium italic mt-0.5">
                      {getSubNameDisplay(item)}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-3">
                    <span className="text-xs text-slate-500">
                      Unit: {item.defaultUnit}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => dispatch(addToCart(item))}
                      className="h-8 gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Known Item Form */}
          <div className="bg-white p-6 rounded-xl border border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
              <PlusCircle className="w-5 h-5 text-slate-500" />
              {t[lang].addSection}
            </h3>

            {errorMsg && (
              <p className="text-xs text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-100 mb-4">
                {errorMsg}
              </p>
            )}

            <form onSubmit={handleLookupAndAdd} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">
                  {t[lang].inputLabel}
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={itemInput}
                    onChange={(e) => setItemInput(e.target.value)}
                    placeholder={t[lang].inputPlaceholder}
                    required
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isLookingUp}>
                    {isLookingUp ? t[lang].translating : t[lang].submit}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right column: Cart panel */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl border border-slate-100 flex flex-col min-h-[400px]">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-4 mb-4">
              <ShoppingCart className="w-5 h-5 text-slate-700" />
              <h2 className="font-bold text-slate-800 text-lg">
                {t[lang].cart}
              </h2>
              <span className="ml-auto bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center space-y-2">
                <Package className="w-10 h-10 stroke-[1.5]" />
                <p className="text-sm">{t[lang].cartEmpty}</p>
              </div>
            ) : (
              <div className="space-y-4 flex-1">
                {cart.map((entry) => (
                  <div
                    key={entry._id}
                    className="p-3 bg-slate-50/50 rounded-lg border border-slate-100/50 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-semibold text-sm text-slate-800">
                        {getItemNameDisplay(entry)}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {t[lang].qty}: {entry.quantity} {entry.defaultUnit}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Quantity Toggler */}
                      <div className="flex items-center border border-slate-200 rounded bg-white">
                        <button
                          onClick={() =>
                            dispatch(
                              updateQuantity({
                                _id: entry._id, // Changed key from id to _id
                                quantity: Math.max(0.25, entry.quantity - 0.25),
                              }),
                            )
                          }
                          className="px-2 py-0.5 hover:bg-slate-50 font-bold text-xs"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-semibold text-slate-600">
                          {entry.quantity}
                        </span>
                        <button
                          onClick={() =>
                            dispatch(
                              updateQuantity({
                                _id: entry._id, // Changed key from id to _id
                                quantity: entry.quantity + 0.25,
                              }),
                            )
                          }
                          className="px-2 py-0.5 hover:bg-slate-50 font-bold text-xs"
                        >
                          +
                        </button>
                      </div>

                      {/* Remove Button */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => dispatch(removeFromCart(entry._id))}
                        className="h-7 w-7 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
