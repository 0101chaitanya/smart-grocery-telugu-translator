import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getBaseUrl = () => {
  if (import.meta.env.PROD) {
    return "/api"; // Use relative routing in production for Vercel edge proxying
  }
  return import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api";
};

export const groceryApi = createApi({
  reducerPath: "groceryApi",
  baseQuery: fetchBaseQuery({
    baseUrl: getBaseUrl(),
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
    getItems: builder.query({
      query: (params) => {
        const search = typeof params === 'string' ? params : (params?.search || "");
        const category = typeof params === 'object' && params?.category ? params.category : "";
        return `/items?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`;
      },
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
    initRazorpayOrder: builder.mutation({
      query: (details) => ({
        url: "/orders/razorpay/init",
        method: "POST",
        body: details,
      }),
    }),
    verifyRazorpayPayment: builder.mutation({
      query: (details) => ({
        url: "/orders/razorpay/verify",
        method: "POST",
        body: details,
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
    sellerLogin: builder.mutation({
      query: (credentials) => ({
        url: "/auth/seller/login",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["User", "Item"],
    }),
    updateStock: builder.mutation({
      query: ({ id, stock, price }) => ({
        url: `/items/${id}/stock`,
        method: "PUT",
        body: { stock, price },
      }),
      invalidatesTags: ["Item"],
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
  useGetItemTrendsQuery,
  useCreateOrderMutation,
  useInitRazorpayOrderMutation,
  useVerifyRazorpayPaymentMutation,
  useGetOrderStatusQuery,
  useGetOrdersQuery,
  useSellerLoginMutation,
  useUpdateStockMutation,
} = groceryApi;
