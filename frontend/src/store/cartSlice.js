import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  lang: "en",
  cart: [],
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
      // Standardized to _id
      const existing = state.cart.find((cartItem) => cartItem._id === item._id);
      if (existing) {
        existing.quantity += 1;
      } else {
        state.cart.push({ ...item, quantity: 1 });
      }
    },
    updateQuantity: (state, action) => {
      // Standardized to _id
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
  },
});

export const { toogleLanguage, addToCart, updateQuantity, removeFromCart } =
  cartSlice.actions;

export default cartSlice.reducer;
