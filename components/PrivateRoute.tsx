import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { isTokenExpiringSoon, refreshAccessToken } from "../utils/tokens.ts";

interface PrivateRouteProps {
  children: React.ReactNode;
}
export default function PrivateRoute({ children }: PrivateRouteProps) {
  const [ loading, setLoading ] = useState(true);
  const userString = localStorage.getItem("user");
  if (!userString) {
    return <Navigate to="/login" replace />;
  }
  const user = JSON.parse(userString) as { access_token: string; refresh_token: string };
  const token = user.access_token;
  const refreshToken = user?.refresh_token;

  useEffect(() => {
    const checkToken = async () => {
      if (isTokenExpiringSoon(token) && refreshToken) {
        const newToken = await refreshAccessToken(refreshToken);
        if (newToken) {
          localStorage.setItem("user", JSON.stringify({ ...user, access_token: newToken }));
        } else {
          localStorage.removeItem("user");
        }
      }
      setLoading(false);
    };

    checkToken();
  }, [token, refreshToken]);

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid mx-auto"></div>
        <p className="mt-4 text-gray-700 font-semibold">Cargando...</p>
      </div>
    </div>
  );
  if (!token || isTokenExpiringSoon(token)) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
}
