import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const baseUrl = import.meta.env.BACKEND_URL || "http://localhost:3000";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!email || !password) {
      return setError("Por favor, rellene todos los campos.");
    }

    try {
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return setError(errorData.message || 'Error al iniciar sesión. Intenta de nuevo.');
      }

      const data = await response.json();
      localStorage.setItem("user", JSON.stringify(data));
      await new Promise((res) => setTimeout(res, 0));
      navigate("/chats/new-chat", { replace: true });

    } catch (err: any) {
      setError('Error al iniciar sesión. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">Iniciar sesión</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 font-medium text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-800 disabled:bg-slate-400 dark:disabled:bg-slate-500 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Cargando...' : 'Ingresar'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          ¿No tienes una cuenta? <a href="/register" className="text-blue-600 dark:text-blue-400 hover:underline">Regístrate</a>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
