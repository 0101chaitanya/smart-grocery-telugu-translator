import { configureStore } from "@reduxjs/toolkit";
import { groceryApi } from "./apiSlice";
import cartReducer from "./cartSlice";

export const store = configureStore({
  reducer: {
    cartState: cartReducer,
    [groceryApi.reducerPath]: groceryApi.reducer,
  },
  // Adding the api middleware enables caching, invalidation, polling, and other useful features of rtk-query.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(groceryApi.middleware),
});
