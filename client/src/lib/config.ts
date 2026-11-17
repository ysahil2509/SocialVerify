export const HTTP_SERVER_BASE_URL: string = (
  process.env.NEXT_PUBLIC_HTTP_SERVER_BASE_URL ||
  "https://socialverify-server-py9s.onrender.com"
).replace(/\/+$/, "");
export const GOOGLE_CLIENT_ID: string = process.env.GOOGLE_CLIENT_ID!;
export const GOOGLE_CLIENT_SECRET: string = process.env.GOOGLE_CLIENT_SECRET!;
export const NEXTAUTH_SECRET: string = process.env.NEXTAUTH_SECRET || "secret";
export const AUTH_CALLBACK_URL: string = "/dashboard";
