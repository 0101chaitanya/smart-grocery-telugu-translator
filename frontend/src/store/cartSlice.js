import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  lang: "en",
  cart: [],
  activeListId: null, // Tracks if we are editing a saved list
  activeListName: "", // Name of the loaded list
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    toogleLanguage: (state) => {
      state.lang = state.lang === "en" ? "te" : "en";
    },
    addToCart: (state, action) => {
      const item = action.payload;
      const existing = state.cart.find((cartItem) => cartItem._id === item._id);
      if (existing) {
        existing.quantity += 1;
      } else {
        state.cart.push({ ...item, quantity: 1 });
      }
    },
    updateQuantity: (state, action) => {
      const { _id, quantity } = action.payload;
      const existing = state.cart.find((c) => c._id === _id);
      if (existing) {
        state.cart = state.cart.map((c) =>
          c._id === _id ? { ...c, quantity } : c,
        );
      }
    },
    removeFromCart: (state, action) => {
      state.cart = state.cart.filter((c) => c._id !== action.payload);
    },
    // Loads list items and automatically flattens DB nested items if present
    loadCart: (state, action) => {
      state.cart = action.payload.items.map((entry) => {
        // If the item properties are nested inside a database 'item' field
        if (entry.item) {
          return {
            ...entry.item,
            quantity: entry.quantity,
          };
        }
        // Otherwise, return as-is if already in flat cart format
        return entry;
      });
      state.activeListId = action.payload._id;
      state.activeListName = action.payload.name;
    },

    // Resets loaded list tracking (for creating new lists)
    clearActiveList: (state) => {
      state.cart = [];
      state.activeListId = null;
      state.activeListName = "";
    },
    // Updates active list name indicator in real-time if renamed
    updateActiveListName: (state, action) => {
      const { id, name } = action.payload;
      if (state.activeListId === id) {
        state.activeListName = name;
      }
    },
  },
});

export const {
  toogleLanguage,
  addToCart,
  updateQuantity,
  removeFromCart,
  loadCart,
  clearActiveList,
  updateActiveListName,
} = cartSlice.actions;

export default cartSlice.reducer;
