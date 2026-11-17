import http from "./api";
import { HTTP_SERVER_BASE_URL } from "./config";

export function warmServices() {
  if (typeof window === "undefined") return;
  try {
    fetch(`${HTTP_SERVER_BASE_URL}/health`, { mode: "no-cors" }).catch(() => {});
    fetch("https://socialverify-ai.onrender.com/health", { mode: "no-cors" }).catch(() => {});
  } catch {}
}

type Envelope<T> = { success: boolean; data: T; message?: string };
export type Article = {
  title: string;
  url: string;
  source: string;
  publishedAt: string | null;
  retrievedAt?: string;
  description?: string | null;
  image?: string | null;
};
export type GeoEvent = {
  id: string;
  title: string;
  sourceUrl: string;
  date: string;
  latitude: number;
  longitude: number;
  matchedKeyword: string;
  source?: string;
  imageUrl?: string | null;
};
export type Post = {
  id: string;
  platform: string;
  title: string | null;
  content: string | null;
  author: string | null;
  url: string;
  publishedAt: string | null;
  retrievedAt?: string;
};
export type InvestigationData = {
  window: {
    start: string;
    end: string;
    days: number;
    interval: "hour" | "day";
  };
  verification_status?:
    | "Supported"
    | "Partially supported"
    | "Contradicted"
    | "Unverified"
    | "Insufficient evidence";
  verification_summary?: string;
  claim_assessments?: {
    claim: string;
    assessment: "supported" | "contradicted" | "mixed" | "insufficient_evidence";
    supporting_evidence: string[];
    counter_evidence: string[];
    confidence: number;
    limitations: string[];
  }[];
  human_review_required?: boolean;
  review_reasons?: string[];
  source_records: {
    id: string;
    category: "news" | "social";
    platform: string;
    title: string;
    content: string;
    url: string;
    published_at: string | null;
    retrieved_at: string;
    window_status: "in_window" | "outside_window" | "timestamp_unavailable";
    author?: string | null;
    publisher?: string | null;
    cluster_id: string;
    duplicate_sources: {
      url: string;
      published_at: string | null;
      retrieved_at: string;
      publisher: string | null;
    }[];
  }[];
  earliest_source: {
    label: "Earliest source found";
    category: "news" | "social";
    platform: string;
    content: string;
    published_at: string;
    url: string;
    confidence_note: string;
  } | null;
  spread: {
    timeline: {
      timestamp: string;
      social_media: number;
      news_media: number;
    }[];
    unique_records: { social_media: number; news_media: number };
    total_unique_records: number;
    activity_change: "increasing" | "decreasing" | "stable";
    record_count_outside_window?: number;
    records_missing_publication_time?: number;
    duplicate_records_removed?: number;
  };
  data_coverage: {
    records_collected: number;
    timestamped_records_in_window: number;
    timestamp_coverage: number;
    source_errors: { provider: string; message: string }[];
  };
  rumour_clusters?: {
    id: string;
    record_ids: string[];
    record_count: number;
  }[];
};
export type Conversation = {
  id: string;
  title: string | null;
  lastUpdated: string;
};
export type Chat = {
  id: string;
  sender: "user" | "bot" | "system";
  content: string | null;
  createdAt: string;
};

async function get<T>(
  path: string,
  signal?: AbortSignal,
  params?: Record<string, string | number>,
) {
  return (await http.get<Envelope<T>>(path, { signal, params })).data.data;
}
export const workspace = {
  news: (q: string, signal?: AbortSignal) =>
    get<{ articles: Article[]; provider?: string }>(
      "/api/news/search",
      signal,
      { q, pageSize: 12 },
    ),
  events: (signal?: AbortSignal) =>
    get<GeoEvent[]>("/api/events/geopolitics", signal, { limit: 12 }),
  social: async (topic: string, signal?: AbortSignal) =>
    (
      await http.post<
        Envelope<{
          posts: Post[];
          errors: { platform: string; message: string }[];
        }>
      >("/api/social/search", { topics: [topic], limit: 4 }, { signal })
    ).data.data,
  conversations: (signal?: AbortSignal) =>
    get<Conversation[]>("/api/conversation", signal),
  messages: (id: string, signal?: AbortSignal) =>
    get<Chat[]>(`/api/conversation/chat/${encodeURIComponent(id)}`, signal),
  investigation: (id: string, signal?: AbortSignal) =>
    get<InvestigationData | null>(
      `/api/conversation/investigation/${encodeURIComponent(id)}`,
      signal,
    ),
  create: async (title: string) =>
    (
      await http.post<Envelope<Conversation>>("/api/conversation", {
        title,
        variant: "chat",
      })
    ).data.data,
  send: async (id: string, content: string) =>
    (
      await http.post<Envelope<Chat[]>>(
        `/api/conversation/chat/${encodeURIComponent(id)}`,
        { content },
        { timeout: 210000 },
      )
    ).data.data,
  exportPdf: async (id: string) =>
    (
      await http.get(`/api/conversation/report/${encodeURIComponent(id)}`, {
        responseType: "blob",
      })
    ).data as Blob,
  rename: async (id: string, title: string) =>
    http.put(`/api/conversation/rename/${encodeURIComponent(id)}`, { title }),
  remove: async (id: string) =>
    http.delete(`/api/conversation/${encodeURIComponent(id)}`),
  monitoring: (signal?: AbortSignal) =>
    get<MonitoringData>("/api/monitoring", signal),
  warm: warmServices,
};

export type MonitoringMetric = {
  label: string;
  value: string;
};

export type AgentStageDetails = {
  average_latency_ms: number;
  input_summary: string;
  output_summary: string;
  evaluation_metrics: MonitoringMetric[];
  recent_errors: string[];
  source_references: string[];
};

export type AgentPipelineStage = {
  id: string;
  name: string;
  stage_number: number;
  description: string;
  completion_rate: number;
  quality_rate: number;
  correctness_rate?: number;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  primary_metrics: MonitoringMetric[];
  details: AgentStageDetails;
};

export type ScenarioSource = {
  title: string;
  url: string;
  platform: string;
  category: "news" | "social";
};

export type ScenarioClaim = {
  claim: string;
  assessment: string;
  confidence: number;
};

export type ScenarioRecord = {
  id: string;
  topic: string;
  status: "Completed" | "Failed" | "Incomplete";
  news_retrieval_count: number;
  social_retrieval_count: number;
  claims_extracted_count: number;
  evidence_coverage_pct: number;
  evaluation_result: "Supported" | "Contradicted" | "Mixed" | "Unverified" | "Insufficient Evidence";
  confidence_pct: number;
  processing_time_ms: number;
  execution_date: string;
  sources: ScenarioSource[];
  claims: ScenarioClaim[];
  summary: string;
};

export type MonitoringOverview = {
  system_operational: boolean;
  active_workflows: number;
  last_updated: string;
  total_workflows: number;
  completed_workflows: number;
  failed_workflows: number;
  total_news_retrieved: number;
  total_social_retrieved: number;
  claims_extracted: number;
  evidence_coverage: number;
  avg_processing_time_ms: number;
};

export type MonitoringData = {
  overview: MonitoringOverview;
  agent_pipeline: AgentPipelineStage[];
  scenarios: ScenarioRecord[];
};

export function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
export function dateLabel(value: string | null | undefined) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString("en", { month: "short", day: "numeric" });
}
