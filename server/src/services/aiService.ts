import { microserviceApi } from '../lib/api';

class AiService {
    async get<T = any>(route: string, config?: any): Promise<T> {
        try {
            const response = await microserviceApi.get<T>(route, config);
            return response.data;
        } catch (error: any) {
            console.error("AI Service GET error:", error?.message, error?.response?.status);
            throw new Error("The research service could not complete the request.");
        }
    }

    async post<T = any>(route: string, payload: any, maxRetries = 4): Promise<T> {
        let lastError: any = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await microserviceApi.post<T>(route, payload);
                return response.data;
            } catch (error: any) {
                lastError = error;
                const status = error?.response?.status;
                const code = error?.code;
                console.warn(`[AI Service] Attempt ${attempt}/${maxRetries} failed: ${error?.message} (status: ${status}, code: ${code})`);

                // If 502/503/504 or network drop (Render cold-start wake-up), wait and retry
                const isColdStart = status === 502 || status === 503 || status === 504 || 
                                    code === 'ECONNREFUSED' || code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ERR_BAD_RESPONSE';
                if (isColdStart && attempt < maxRetries) {
                    const waitMs = attempt * 4000;
                    console.log(`[AI Service] Service may be waking up from free-tier sleep. Waiting ${waitMs / 1000}s before retry...`);
                    await new Promise(r => setTimeout(r, waitMs));
                    continue;
                }
                break;
            }
        }
        console.error("AI Service POST failed after all retries:", lastError?.message, lastError?.response?.status, lastError?.code);
        // Axios errors contain the request payload, including the delegated user token.
        throw new Error("The research service could not complete the request. Please try again.");
    }
}

export const aiService = new AiService();
