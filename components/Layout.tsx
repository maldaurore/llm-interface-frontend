import { isTokenExpiringSoon, refreshAccessToken } from '@/utils/tokens';
import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';

const Layout: React.FC = () => {
  const navigate = useNavigate();
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

  const handleLogout = () => {
    // Aquí puedes limpiar tokens o sesión
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid mx-auto"></div>
        <p className="mt-4 text-gray-700 font-semibold">Cargando...</p>
      </div>
    </div>
  );

  if (!token || isTokenExpiringSoon(token)) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-300 dark:border-slate-700 p-4 flex flex-col space-y-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Zafirosoft</h2>

        <button
          onClick={() => navigate('/new-chat')}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition"
        >
          + Nuevo chat
        </button>

        <div className="flex-1 overflow-y-auto">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Chats anteriores</h3>
          <ul className="space-y-2">
            {/* Simulación de chats */}
            {[1, 2, 3].map((chatId) => (
              <li key={chatId}>
                <button
                  onClick={() => navigate(`/chat/${chatId}`)}
                  className="w-full text-left px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md text-sm text-slate-900 dark:text-white"
                >
                  Chat #{chatId}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm text-red-600 hover:underline mt-auto"
        >
          Cerrar sesión
        </button>
      </aside>

      {/* Panel derecho donde cambia el contenido */}
      <main className="flex-1 p-4 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
