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