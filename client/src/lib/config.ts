function getValidBackendUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_HTTP_SERVER_BASE_URL;
  if (!envUrl || !envUrl.trim()) {
    return "https://socialverify-server-1k6o.onrender.com";
  }
  const clean = envUrl.trim().replace(/\/+$/, "");
  // If the environment variable was set to the base name without Render's assigned suffix
  if (clean === "https://socialverify-server.onrender.com" || clean === "http://socialverify-server.onrender.com") {
    return "https://socialverify-server-1k6o.onrender.com";
  }
  return clean;
}

export const HTTP_SERVER_BASE_URL: string = getValidBackendUrl();
export const GOOGLE_CLIENT_ID: string = process.env.GOOGLE_CLIENT_ID!;
export const GOOGLE_CLIENT_SECRET: string = process.env.GOOGLE_CLIENT_SECRET!;
export const NEXTAUTH_SECRET: string = process.env.NEXTAUTH_SECRET || "secret";
export const AUTH_CALLBACK_URL: string = "/dashboard";
