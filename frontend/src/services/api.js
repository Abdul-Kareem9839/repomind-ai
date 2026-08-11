import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

// A 401 from /auth/me (checked on every app load) or /auth/login (wrong
// password) is expected, normal traffic — AuthContext/Login already handle
// it. Forcing a hard `window.location.href` redirect here on *any* 401 was
// what turned a single failed request into a full-page reload that discards
// the in-memory auth state React just set, which is what made a successful
// login look like it "bounced back" to /login. Only bounce on a 401 from an
// already-authenticated session hitting some other endpoint.
const AUTH_CHECK_PATHS = ["/auth/me", "/auth/login", "/auth/register"];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const isAuthCheck = AUTH_CHECK_PATHS.some((p) => url.includes(p));
    if (
      error.response?.status === 401 &&
      !isAuthCheck &&
      window.location.pathname !== "/login"
    ) {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;
