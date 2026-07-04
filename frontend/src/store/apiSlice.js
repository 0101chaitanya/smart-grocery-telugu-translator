import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const groceryApi = createApi({
  reducerPath: "groceryApi",
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api",
    credentials: "include", // Crucial: Automatically sends/receives session cookies
  }),
  tagTypes: ["Item", "User", "List", "Order"],
  endpoints: (builder) => ({
    // A. Check auth status
    getMe: builder.query({
      query: () => "/auth/me",
      providesTags: ["User"],
    }),
    // B. Logout
    logout: builder.mutation({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      invalidatesTags: ["User"],
    }),
    // C. Get Items Catalog
    getItems: builder.query({
      query: (search) => `/items?search=${encodeURIComponent(search)}`,
      providesTags: ["Item"],
    }),
    // D. Gemma Lookup
    lookupItem: builder.mutation({
      query: (name) => ({
        url: "/items/lookup",
        method: "POST",
        body: { name },
      }),
      invalidatesTags: ["Item"],
    }),
    regenerateItem: builder.mutation({
      query: (id) => ({
        url: `/items/${id}/regenerate`,
        method: "PUT",
      }),
      invalidatesTags: ["Item"],
    }),
    getLists: builder.query({
      query: () => "/lists",
      providesTags: ["List"],
    }),
    createList: builder.mutation({
      query: (newList) => ({
        url: "/lists",
        method: "POST",
        body: newList,
      }),
      invalidatesTags: ["List"],
    }),
    deleteList: builder.mutation({
      query: (id) => ({
        url: `/lists/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["List"],
    }),
    updateList: builder.mutation({
      query: ({ id, listData }) => ({
        url: `/lists/${id}`,
        method: "PUT",
        body: listData,
      }),
      invalidatesTags: ["List"],
    }),
    logPrice: builder.mutation({
      query: ({ id, price }) => ({
        url: `/items/${id}/prices`,
        method: "POST",
        body: { price },
      }),
      invalidatesTags: ["Item"], // Triggers auto-refetch to recalculate averages
    }),
    getItemTrends: builder.query({
      query: ({ id, period }) => `/items/${id}/trends?period=${period}`,
      providesTags: (result, error, { id }) => [{ type: "Item", id }],
    }),
    createOrder: builder.mutation({
      query: (newOrder) => ({
        url: "/orders",
        method: "POST",
        body: newOrder,
      }),
      invalidatesTags: ["Order"],
    }),
    getOrderStatus: builder.query({
      query: (id) => `/orders/${id}`,
      providesTags: (result, error, id) => [{ type: "Order", id }],
    }),
    getOrders: builder.query({
      query: () => "/orders",
      providesTags: ["Order"],
    }),
  }),
});

export const {
  useGetMeQuery,
  useLogoutMutation,
  useGetItemsQuery,
  useLookupItemMutation,
  useRegenerateItemMutation,
  useGetListsQuery,
  useCreateListMutation,
  useDeleteListMutation,
  useUpdateListMutation,
  useLogPriceMutation,
  useGetItemTrendsQuery,
  useCreateOrderMutation,
  useGetOrderStatusQuery,
  useGetOrdersQuery,
} = groceryApi;
