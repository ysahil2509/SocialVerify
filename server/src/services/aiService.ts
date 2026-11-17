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

    async post<T = any>(route: string, payload: any): Promise<T> {
        try {
            const response = await microserviceApi.post<T>(route, payload);
            return response.data;
        } catch (error: any) {
            console.error("AI Service POST error:", error?.message, error?.response?.status, error?.code);
            // Axios errors contain the request payload, including the delegated user token.
            throw new Error("The research service could not complete the request. Please try again.");
        }
    }
}

export const aiService = new AiService();
