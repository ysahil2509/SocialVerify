import 'dotenv/config';

export const PORT: number = Number(process.env.PORT) || 9000;
export const DATABASE_URL: string = (process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres")
  .replace(/([?&])sslmode=(prefer|require|verify-ca)(?=&|$)/, "$1sslmode=verify-full");
function resolveMicroserviceUrl(raw?: string): string {
  if (!raw || !raw.trim()) {
    return "https://socialverify-ai.onrender.com";
  }
  let url = raw.trim();
  // Render internal service hostnames cannot receive traffic on free plan; map to public HTTPS URL
  if (url === "socialverify-ai" || url === "socialverify-ai:8000") {
    return "https://socialverify-ai.onrender.com";
  }
  if (!/^https?:\/\//i.test(url)) {
    if (url.includes(".onrender.com") || url.includes(".vercel.app")) {
      url = `https://${url}`;
    } else {
      url = url.includes(":") ? `http://${url}` : `http://${url}:8000`;
    }
  }
  return url.replace(/\/+$/, "");
}

export const MICROSERVICE_BASE_URL: string = resolveMicroserviceUrl(process.env.MICROSERVICE_BASE_URL);
export const JWT_SECRET: string = process.env.JWT_SECRET || "secret";

export const LOGS_DIRECTORY: string = "logs";

export const NEWS_API_KEY: string = process.env.NEWS_API_KEY || "";
export const NEWS_API_BASE_URL: string = "https://newsapi.org/v2";
export const NEWS_CACHE_TTL: number = 900000;
export const SOCIAL_CACHE_TTL: number = 300000;

export const REDDIT_CLIENT_ID: string = process.env.REDDIT_CLIENT_ID || "";
export const REDDIT_CLIENT_SECRET: string = process.env.REDDIT_CLIENT_SECRET || "";
export const REDDIT_USER_AGENT: string = process.env.REDDIT_USER_AGENT || "SocialVerify/1.0";

export const MASTODON_INSTANCES: string[] = (
  process.env.MASTODON_INSTANCES || "mastodon.social,mastodon.online,fosstodon.org,masto.ai,infosec.exchange"
)
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
export const MASTODON_ACCESS_TOKEN: string = process.env.MASTODON_ACCESS_TOKEN || "";
export const MASTODON_REQUEST_TIMEOUT: number = (Number(process.env.MASTODON_REQUEST_TIMEOUT) || 15) * 1000;

export const FALLBACK_NEWS_SOURCES = {
  REUTERS: {
    BASE_URL: "https://www.reuters.com",
    RSS_FEEDS: {
      ENERGY: "https://www.reuters.com/business/energy/rss.xml",
      COMMODITIES: "https://www.reuters.com/markets/commodities/rss.xml",
      WORLD: "https://www.reuters.com/world/rss.xml",
      BUSINESS: "https://www.reuters.com/business/rss.xml"
    }
  },
  GOOGLE_NEWS: {
    BASE_URL: "https://news.google.com/rss",
    SEARCH_BASE: "https://news.google.com/rss/search?q="
  }
};
