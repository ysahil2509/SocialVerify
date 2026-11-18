import axios from "axios";
import { HTTP_SERVER_BASE_URL } from "./config";
import { getSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { pushToast } from "./toasts";

const LIVE_BACKEND_URL = "https://socialverify-server-1k6o.onrender.com";

const httpClient = axios.create({
    baseURL: HTTP_SERVER_BASE_URL,
});
let signingOutAfterUnauthorized = false;

httpClient.interceptors.request.use(async (config) => {
    if (typeof window === "undefined") {
        return config;
    }

    const session = await getSession();
    const accessToken = session?.accessToken;

    if (accessToken) {
        config.headers = axios.AxiosHeaders.from(config.headers);
        config.headers.set("Authorization", `Bearer ${accessToken}`);
    }

    return config;
});

httpClient.interceptors.response.use(
    (response) => {
        if (typeof window !== "undefined") {
            const message = response.data?.message
                ?? (response.config.responseType === "blob" ? "PDF exported successfully." : undefined);
            pushToast(
                response.data?.success === false ? "error" : "success",
                typeof message === "string" ? message : "Request completed.",
            );
        }
        return response;
    },
    async (error: unknown) => {
        if (axios.isAxiosError(error)) {
            const errData = error.response?.data;
            const errMsg = typeof errData === "string" ? errData : JSON.stringify(errData || "");
            const config = error.config as any;

            // Auto-heal: If an old or dormant Render instance was hit (relation missing or network drop), retry with live server
            if (config && !config._rerouted) {
                const isDormantError = errMsg.includes("relation") || errMsg.includes("does not exist") || 
                                       error.code === "ECONNREFUSED" || error.response?.status === 502;
                if (isDormantError) {
                    config._rerouted = true;
                    config.baseURL = LIVE_BACKEND_URL;
                    httpClient.defaults.baseURL = LIVE_BACKEND_URL;
                    return httpClient.request(config);
                }
            }
        }

        if (typeof window !== "undefined" && !axios.isCancel(error)) {
            const responseMessage = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                if (!signingOutAfterUnauthorized) {
                    signingOutAfterUnauthorized = true;
                    pushToast("error", "Your session expired. Please sign in again.");
                    void signOut({ callbackUrl: "/auth/signin?reason=session-expired" });
                }
                return Promise.reject(error);
            }
            const message = typeof responseMessage === "string"
                ? responseMessage
                : error instanceof Error ? error.message : "Request failed.";
            pushToast("error", message);
        }
        return Promise.reject(error);
    },
);

export default httpClient;
