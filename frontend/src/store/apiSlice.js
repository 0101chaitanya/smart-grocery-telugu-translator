import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const groceryApi = createApi({
  reducerPath: "groceryApi",
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_BACKEND_URL,
    credentials: "include", // Crucial: Automatically sends/receives session cookies
  }),
  tagTypes: ["Item", "User"],
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
  }),
});

export const {
  useGetMeQuery,
  useLogoutMutation,
  useGetItemsQuery,
  useLookupItemMutation,
} = groceryApi;
