import { Navigate } from "react-router-dom";
import { useGetMeQuery } from "../store/apiSlice";

export default function ProtectedRoute({ children }) {
  const { data, isLoading, isError } = useGetMeQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-mono text-slate-500">
        Checking authentication session...
      </div>
    );
  }

  // Redirect to login if user is not logged in or endpoint returns error
  if (isError || !data?.user) {
    return <Navigate to="/" replace />;
  }

  return children;
}
