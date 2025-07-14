/**
 * Verifica si el token del usuario expira en menos de 5 minutos.
 *
 * @param {string} token - El token del usuario.
 * @returns {boolean} true si el token expira en menos de 5 minutos. false en caso contrario.
 */
export function isTokenExpiringSoon (token: string) {
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expTime = payload.exp * 1000;
    return expTime - Date.now() <5 * 60 * 1000; // Expira en menos de 5 min
  } catch {
    return true;
  }
};

/**
 * Solicita un nuevo token de acceso usando un refresh token.
 *
 * @param {string} refreshToken - El token de refresco del usuario.
 * @returns {string | null} El nuevo token de acceso o null si la solicitud falla.
 */
export async function refreshAccessToken (refreshToken: string) {
  const baseUrl = process.env.VITE_BACKEND_URL || "http://localhost:3000";
  try {
    const response = await fetch(`${baseUrl}/auth/refresh`, { 
      method: 'POST',
      headers: {
        'Content-type': 'application/json'
      },
      body: JSON.stringify({ refreshToken }) 
    });
    const data = await response.json();
    return data.access_token;
  } catch {
    return null; // No se pudo refrescar el token
  }
};

/**
 * Obtiene el token de acceso del usuario del Local Storage. 
 * 
 * Si el token expira en menos de 5 minutos, intenta refrescalo automáticamente.
 * Si no hay usuario autenticado o el refresh falla, redirige al login ('/login') y retorna null. 
 *
 * @returns {string | null} El token de acceso actualizado o null si no se encuentra.
 */
export async function getUserToken() {
  if (!localStorage.getItem("user")) {
    window.location.href = "/login";
    return null;
  }
  const user = JSON.parse(localStorage.getItem("user") as string);
  if (isTokenExpiringSoon(user.access_token)) {
    const newToken = await refreshAccessToken(user.refresh_token);
    if (newToken) {
      localStorage.setItem("user", JSON.stringify({...user, access_token: newToken }));
      return newToken;
    } else {
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
  }
  return user.access_token;
}