import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const groceryApi = createApi({
  reducerPath: "groceryApi",
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_BACKEND_URL,
    // credentials: true
  }),
  endpoints: (builder) => ({
    getItems: builder.query({
      query: (search) => `/items?search=${encodeURIComponent(search)}`,
      providesTags: ["Item"],
    }),
    addItem: builder.mutation({
      query: (newItem) => ({
        url: "/items",
        method: "POST",
        body: newItem,
      }),
      invalidatesTags: ["Item"],
    }),
    lookupItem: builder.mutation({
      query: (name) => ({
        url: "/items/lookup",
        method: "POST",
        body: { name },
      }),
      invalidatesTags: ["Item"], // Auto-refetches the list catalog
    }),
  }),
});

export const { useGetItemsQuery, useLookupItemMutation, useAddItemMutation } =
  groceryApi;
