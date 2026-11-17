"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  FileDown,
  LoaderCircle,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { md } from "@/lib/markdown";
import { pushToast } from "@/lib/toasts";
import {
  workspace,
  type Chat,
  type Conversation,
  type InvestigationData,
  dateLabel,
} from "@/lib/workspace";
import { bot } from "./content";
import { FeedState, Reveal } from "./Motion";

const copy = {
  history: "YOUR INVESTIGATIONS",
  empty: "Your next question starts a new thread.",
  noHistory: "Your investigations will appear here.",
  historyError: "Could not load investigations.",
  loadError: "This investigation could not be opened.",
  sendError:
    "The request failed. Check the conversation below before resending; your question may already be saved.",
  inputLabel: "Research question",
  submit: "Send question",
  question: "THE QUESTION",
  report: "RESEARCH BRIEF",
  followup: "Continue the investigation",
  rename: "Rename investigation",
  remove: "Delete investigation",
  cancel: "Cancel",
  confirm: "Delete permanently",
  deletePrompt: "Delete this investigation and its messages?",
  save: "Save title",
  copy: "Copy brief",
  copied: "Copied",
  copySuccess: "Research brief copied to clipboard.",
  export: "Download PDF",
  exportError: "The PDF could not be downloaded.",
  unavailable: "Could not update this investigation.",
  clipboard: "Could not copy. Select the text to copy it manually.",
  working: "INVESTIGATION IN PROGRESS",
  waiting: "Your brief will appear here when the research finishes.",
};

const GRAPH_MARKER = "<!-- socialverify-graph-slot -->";

function visibleBrief(content: string | null) {
  return (content || "")
    .replace(/<!-- socialverify-investigation:v1:[\s\S]*?-->/g, "")
    .trim();
}

function ActivityGraph({ data }: { data: InvestigationData }) {
  const points = data.spread.timeline;
  const maxCount = Math.max(
    1,
    ...points.flatMap((point) => [point.social_media, point.news_media]),
  );
  const x = (index: number) =>
    points.length < 2 ? 60 : 60 + (index * 680) / (points.length - 1);
  const y = (count: number) => 172 - (count / maxCount) * 132;
  const socialLine = points.map((point, index) => `${x(index)},${y(point.social_media)}`).join(" ");
  const newsLine = points.map((point, index) => `${x(index)},${y(point.news_media)}`).join(" ");
  const labelStep = Math.max(1, Math.ceil(points.length / 5));
  const earliest = data.earliest_source;
  const earliestBucket = earliest
    ? data.window.interval === "hour"
      ? earliest.published_at.slice(0, 13)
      : earliest.published_at.slice(0, 10)
    : null;
  const earliestIndex = earliestBucket
    ? points.findIndex((point) =>
        data.window.interval === "hour"
          ? point.timestamp.slice(0, 13) === earliestBucket
          : point.timestamp.slice(0, 10) === earliestBucket,
      )
    : -1;

  if (!data.spread.total_unique_records) {
    return (
      <section className="border-t border-border/60 px-6 py-5 sm:px-8">
        <h2 className="text-xs font-semibold tracking-[.14em] text-foreground uppercase">
          Spread over time
        </h2>
        <p className="mt-3 text-xs text-muted">
          No timestamped social posts or news articles were found in this investigation window.
        </p>
      </section>
    );
  }

  return (
    <section className="border-t border-border/60 px-6 py-5 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold tracking-[.14em] text-foreground uppercase">
            Spread over time
          </h2>
          <p className="mt-1 text-xs text-muted">
            {data.spread.total_unique_records} unique records · {data.window.days}-day window
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-focus" />
            Social media
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-accent" />
            News media
          </span>
          {earliest && (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-error" />
              Earliest source found
            </span>
          )}
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox="0 0 760 220"
          role="img"
          aria-label="Social media and news articles by time interval"
          className="h-52 min-w-[560px] w-full overflow-visible text-muted"
        >
          <line x1="60" y1="40" x2="60" y2="172" stroke="currentColor" opacity=".25" />
          <line x1="60" y1="172" x2="740" y2="172" stroke="currentColor" opacity=".25" />
          <text x="50" y="46" textAnchor="end" className="fill-current text-[10px]">
            {maxCount}
          </text>
          <text x="50" y="176" textAnchor="end" className="fill-current text-[10px]">0</text>
          <text
            x="14"
            y="108"
            textAnchor="middle"
            transform="rotate(-90 14 108)"
            className="fill-current text-[9px]"
          >
            Posts / articles
          </text>
          {points.length > 0 && (
            <>
              <polyline
                points={socialLine}
                transform="translate(0 0)"
                fill="none"
                stroke="var(--color-focus)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              <polyline
                points={newsLine}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              {points.map((point, index) => (
                <g key={point.timestamp}>
                  <circle cx={x(index)} cy={y(point.social_media)} r="3" fill="var(--color-focus)">
                    <title>{`${point.timestamp}: ${point.social_media} social media posts`}</title>
                  </circle>
                  <circle cx={x(index)} cy={y(point.news_media)} r="3" fill="var(--color-accent)">
                    <title>{`${point.timestamp}: ${point.news_media} news articles`}</title>
                  </circle>
                  {(index % labelStep === 0 || index === points.length - 1) && (
                    <text
                      x={x(index)}
                      y="198"
                      textAnchor="middle"
                      className="fill-current text-[9px]"
                    >
                      {new Date(point.timestamp).toLocaleDateString("en", {
                        month: "short",
                        day: "numeric",
                        ...(data.window.interval === "hour" ? { hour: "numeric" as const } : {}),
                      })}
                    </text>
                  )}
                </g>
              ))}
              {earliest && earliestIndex >= 0 && (
                <g>
                  <line
                    x1={x(earliestIndex)}
                    y1="40"
                    x2={x(earliestIndex)}
                    y2="172"
                    stroke="var(--color-error)"
                    strokeDasharray="4 4"
                  />
                  <title>{`${earliest.label}: ${earliest.platform}, ${earliest.published_at}`}</title>
                </g>
              )}
            </>
          )}
        </svg>
      </div>
      <p className="mt-2 text-[11px] text-muted">
        {data.data_coverage.timestamped_records_in_window} timestamped records shown; publication time coverage{" "}
        {Math.round(data.data_coverage.timestamp_coverage * 100)}%.
      </p>
    </section>
  );
}

function ResearchBrief({
  message,
  conversationId,
  investigation,
  investigationError,
}: {
  message: Chat;
  conversationId?: string;
  investigation?: InvestigationData | null;
  investigationError?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const report = visibleBrief(message.content);
  const graphIndex = report.indexOf(GRAPH_MARKER);
  const reportBeforeGraph =
    graphIndex < 0 ? report : report.slice(0, graphIndex);
  const reportAfterGraph =
    graphIndex < 0
      ? ""
      : report.slice(graphIndex + GRAPH_MARKER.length).trimStart();

  const downloadMarkdown = () => {
    try {
      const content = report.replace(GRAPH_MARKER, "").trim();
      const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `socialverify-investigation-${conversationId || "brief"}.md`;
      a.click();
      URL.revokeObjectURL(url);
      pushToast("success", "Markdown report exported successfully.");
    } catch {
      pushToast("error", "Could not export Markdown file.");
    }
  };

  const downloadPdf = async () => {
    if (!conversationId) return;
    setExporting(true);
    setError("");
    try {
      const blob = await workspace.exportPdf(conversationId);
      const url = URL.createObjectURL(blob);
      const download = document.createElement("a");
      download.href = url;
      download.download = `socialverify-report-${conversationId}.pdf`;
      download.hidden = true;
      document.body.appendChild(download);
      download.click();
      download.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      pushToast("success", "PDF report downloaded successfully.");
    } catch {
      setError(copy.exportError);
      pushToast("error", copy.exportError);
    } finally {
      setExporting(false);
    }
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-xs">
      {/* Top Header Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface/60 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-accent">
            <Sparkles size={13} />
          </span>
          <div>
            <span className="text-[11px] font-semibold tracking-[.14em] text-foreground uppercase">
              VERIFIED RESEARCH BRIEF
            </span>
            <span className="ml-2 hidden text-[10px] text-muted sm:inline">
              · 8 Agents · CrewAI + Google ADK · A2A
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {conversationId && (
            <button
              disabled={exporting}
              onClick={downloadPdf}
              aria-label="Download PDF Report"
              className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent/20 active:scale-95 disabled:opacity-50"
            >
              {exporting ? (
                <LoaderCircle size={13} className="motion-safe:animate-spin" />
              ) : (
                <FileDown size={13} className="text-accent" />
              )}
              <span>Download PDF</span>
            </button>
          )}

          <button
            onClick={downloadMarkdown}
            aria-label="Download Markdown"
            title="Download Raw Markdown"
            className="hidden items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-muted transition hover:bg-surface-raised hover:text-foreground sm:inline-flex"
          >
            <span>Markdown</span>
          </button>

          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  report.replace(GRAPH_MARKER, "").trim(),
                );
                setCopied(true);
                pushToast("success", copy.copySuccess);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                setError(copy.clipboard);
                pushToast("error", copy.clipboard);
              }
            }}
            aria-label={copied ? copy.copied : copy.copy}
            title={copy.copy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-muted transition hover:bg-surface-raised hover:text-foreground"
          >
            {copied ? <Check size={13} className="text-accent" /> : <Copy size={13} />}
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </header>

      {/* Rendered Brief Body */}
      <div className="max-w-none break-words p-6 text-sm leading-7 sm:p-8 [&_a]:font-medium [&_a]:text-focus [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:my-5 [&_blockquote]:rounded-xl [&_blockquote]:border-l-4 [&_blockquote]:border-accent [&_blockquote]:bg-surface/70 [&_blockquote]:p-4.5 [&_h1]:mb-6 [&_h1]:font-editorial [&_h1]:text-2xl sm:[&_h1]:text-3xl [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:border-b [&_h2]:border-border/60 [&_h2]:pb-2 [&_h2]:text-lg sm:[&_h2]:text-xl [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:text-base [&_h3]:font-semibold [&_hr]:my-6 [&_hr]:border-border/60 [&_li]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-3.5 [&_pre]:my-5 [&_pre]:overflow-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-border [&_pre]:bg-surface [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-xs [&_table]:my-6 [&_table]:block [&_table]:w-max [&_table]:min-w-full [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_table]:text-left [&_thead]:bg-surface [&_tbody_tr:nth-child(even)]:bg-surface/40 [&_td]:max-w-[440px] [&_td]:whitespace-normal [&_td]:border [&_td]:border-border [&_td]:align-top [&_td]:p-3 [&_td]:text-xs sm:[&_td]:text-sm [&_th]:whitespace-nowrap [&_th]:border [&_th]:border-border [&_th]:bg-surface [&_th]:p-3 [&_th]:text-xs [&_th]:font-semibold sm:[&_th]:text-sm [&_ul]:list-disc [&_ul]:pl-5">
        <div
          dangerouslySetInnerHTML={{
            __html: md.render(reportBeforeGraph),
          }}
        />
        {investigation && graphIndex >= 0 && (
          <ActivityGraph data={investigation} />
        )}
        {graphIndex >= 0 && (
          <div
            dangerouslySetInnerHTML={{
              __html: md.render(reportAfterGraph),
            }}
          />
        )}
      </div>

      {investigation && graphIndex < 0 && <ActivityGraph data={investigation} />}
      {investigationError && (
        <p role="alert" className="px-6 pb-4 text-xs text-error">
          {investigationError}
        </p>
      )}

      {error && (
        <p role="alert" className="px-6 pb-4 text-xs text-error">
          {error}
        </p>
      )}

      {/* Bottom Download & Share Footer */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface/40 px-6 py-4">
        <p className="text-xs text-muted">
          Need an archival copy? Export this verified brief as an executive PDF or Markdown file.
        </p>
        <div className="flex items-center gap-2">
          {conversationId && (
            <button
              disabled={exporting}
              onClick={downloadPdf}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              {exporting ? (
                <LoaderCircle size={13} className="motion-safe:animate-spin" />
              ) : (
                <FileDown size={13} />
              )}
              <span>Download PDF Report</span>
            </button>
          )}
          <button
            onClick={downloadMarkdown}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-surface-raised active:scale-95"
          >
            <span>Export Markdown</span>
          </button>
        </div>
      </footer>
    </article>
  );
}

export default function ResearchStudio({
  conversationId,
  topic = "",
  failed = false,
}: {
  conversationId?: string;
  topic?: string;
  failed?: boolean;
}) {
  const router = useRouter();
  const [history, setHistory] = useState<Conversation[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [messages, setMessages] = useState<Chat[]>([]);
  const [investigationState, setInvestigationState] = useState<{
    conversationId: string;
    data: InvestigationData | null;
    error: string;
  } | null>(null);
  const [loading, setLoading] = useState(Boolean(conversationId));
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState(failed ? copy.sendError : "");
  const [draft, setDraft] = useState(
    topic
      ? `Investigate this story: ${topic}. Compare the news and social narratives, cite sources, and identify uncertainty.`.slice(
          0,
          2000,
        )
      : "",
  );
  const [busy, setBusy] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [revision, setRevision] = useState(0);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const current = history.find((item) => item.id === conversationId);
  const investigationData =
    investigationState && investigationState.conversationId === conversationId
      ? investigationState.data
      : null;
  const investigationError =
    investigationState && investigationState.conversationId === conversationId
      ? investigationState.error
      : "";

  useEffect(() => {
    workspace.warm();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    workspace
      .conversations(controller.signal)
      .then((data) => {
        setHistory(data);
        setHistoryLoading(false);
        setHistoryError("");
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setHistoryError(copy.historyError);
          setHistoryLoading(false);
        }
      });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    if (!conversationId) return;
    const controller = new AbortController();
    workspace
      .messages(conversationId, controller.signal)
      .then((data) => {
        setMessages(data);
        setLoading(false);
        setLoadError("");
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoadError(copy.loadError);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [conversationId, revision]);
  useEffect(() => {
    if (!conversationId) return;
    const controller = new AbortController();
    workspace
      .investigation(conversationId, controller.signal)
      .then((data) => {
        setInvestigationState({ conversationId, data, error: "" });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setInvestigationState({
            conversationId,
            data: null,
            error: "Investigation analysis could not be loaded.",
          });
        }
      });
    return () => controller.abort();
  }, [conversationId, revision]);
  useEffect(() => {
    if (messages.length || busy)
      end.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "end",
      });
  }, [messages.length, busy]);

  async function send() {
    const question = draft.trim();
    if (!question || busy || loading || loadError) return;
    setBusy(true);
    setError("");
    setPendingQuestion(question);
    setDraft("");
    let id = conversationId;
    try {
      if (!id) id = (await workspace.create(question.slice(0, 90))).id;
      const response = await workspace.send(id, question);
      setMessages((previous) => [...previous, ...response]);
      setPendingQuestion("");
      if (!conversationId) router.replace(`/dashboard/bot/${id}`);
      else setRevision((n) => n + 1);
    } catch {
      setError(copy.sendError);
      setDraft(question);
      setPendingQuestion("");
      if (id && !conversationId)
        router.replace(`/dashboard/bot/${id}?failed=1`);
      else if (id) setRevision((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }
  async function updateConversation(action: "rename" | "delete") {
    if (!conversationId || busy) return;
    setBusy(true);
    setError("");
    try {
      if (action === "delete") {
        await workspace.remove(conversationId);
        router.replace("/dashboard/bot");
      } else {
        await workspace.rename(conversationId, title.trim());
        setEditing(false);
        setRevision((n) => n + 1);
      }
    } catch {
      setError(copy.unavailable);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_260px] xl:gap-6">
      <div className="flex min-h-0 min-w-0 flex-col">
        <Reveal className="shrink-0">
          <header className="flex items-center justify-between gap-4 border-b border-border pb-5">
            <p className="text-[9px] tracking-[.2em] text-muted">
              {bot.eyebrow}
            </p>
            <Link
              href="/dashboard/bot"
              className="flex items-center gap-2 rounded-full border border-border px-3 py-2 text-[11px] transition hover:bg-surface-raised"
            >
              <Plus size={14} />
              {bot.newBrief}
            </Link>
          </header>
        </Reveal>
        {conversationId && (
          <div className="mt-6 flex items-center justify-between gap-3">
            <h1 className="truncate font-editorial text-2xl">
              {current?.title || "Investigation"}
            </h1>
            <div className="flex gap-1">
              <button
                disabled={busy}
                aria-label={copy.rename}
                onClick={() => {
                  setEditing(!editing);
                  setTitle(current?.title || "");
                }}
                className="rounded-lg p-2 text-muted hover:bg-surface"
              >
                <Pencil size={15} />
              </button>
              <button
                disabled={busy}
                aria-label={copy.remove}
                onClick={() => setDeleting(!deleting)}
                className="rounded-lg p-2 text-muted hover:bg-error-surface hover:text-error"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        )}
        {editing && (
          <form
            className="mt-4 flex gap-2 motion-safe:animate-enter"
            onSubmit={(e) => {
              e.preventDefault();
              void updateConversation("rename");
            }}
          >
            <input
              aria-label={copy.rename}
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-border bg-surface-raised p-3 text-sm"
            />
            <button
              disabled={busy || !title.trim()}
              className="rounded-xl bg-dark-surface px-4 text-xs text-inverse"
            >
              {copy.save}
            </button>
          </form>
        )}
        {deleting && (
          <div
            role="alert"
            className="mt-4 rounded-xl bg-error-surface p-4 text-sm text-error"
          >
            <p>{copy.deletePrompt}</p>
            <div className="mt-3 flex gap-4">
              <button
                disabled={busy}
                onClick={() => updateConversation("delete")}
                className="underline"
              >
                {copy.confirm}
              </button>
              <button onClick={() => setDeleting(false)}>{copy.cancel}</button>
            </div>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_*]:[scrollbar-width:none] [&_*::-webkit-scrollbar]:hidden">
        {!conversationId && !busy && messages.length === 0 && (
          <div className="py-10 md:py-16">
            <Reveal delay={100}>
              <div className="relative mb-9 grid size-16 place-items-center rounded-2xl border border-border bg-surface-raised">
                <span className="absolute inset-0 rounded-2xl border border-accent/50 motion-safe:animate-signal" />
                <Sparkles size={27} strokeWidth={1.2} className="text-focus" />
              </div>
              <h1 className="whitespace-pre-line font-editorial text-5xl leading-[1.06] tracking-tight md:text-6xl">
                {bot.title}
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-7 text-muted">
                {bot.description}
              </p>
            </Reveal>
            <div className="mt-9 grid gap-3 md:grid-cols-3">
              {bot.suggestions.map((suggestion, i) => (
                <Reveal key={suggestion.tag} delay={200 + i * 120}>
                  <button
                    onClick={() => {
                      setDraft(suggestion.prompt);
                      input.current?.focus();
                    }}
                    className="group flex h-full w-full flex-col items-start rounded-2xl border border-border bg-surface-raised p-5 text-left transition-all duration-500 hover:-translate-y-2 hover:bg-sage/20 hover:shadow-lg hover:shadow-dark-surface/5"
                  >
                    <span className="text-[9px] tracking-[.2em] text-muted">
                      {suggestion.tag}
                    </span>
                    <span className="mt-5 font-editorial text-xl leading-snug">
                      {suggestion.title}
                    </span>
                    <ArrowUpRight
                      size={16}
                      className="mt-5 self-end text-muted transition duration-300 group-hover:-translate-y-1 group-hover:translate-x-1"
                    />
                  </button>
                </Reveal>
              ))}
            </div>
          </div>
        )}
        {loading || loadError ? (
          <div className="my-6">
            <FeedState
              loading={loading}
              error={loadError}
              retry={() => setRevision((n) => n + 1)}
            />
          </div>
        ) : messages.length === 0 ? (
          conversationId ? (
            <p className="py-10 text-center text-sm leading-6 text-muted">
              No questions or research results have been saved in this
              investigation yet. Ask a question below to get started.
            </p>
          ) : null
        ) : (
          <div className="space-y-7 py-7">
            {messages.map((message, index) =>
              message.sender === "user" ? (
                <div key={message.id} className="border-l-2 border-accent py-2 pl-5">
                  <p className="text-[9px] tracking-[.2em] text-muted">
                    {copy.question} /{" "}
                    {String(Math.floor(index / 2) + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-lg leading-7">
                    {message.content}
                  </p>
                </div>
              ) : (
                <ResearchBrief
                  key={message.id}
                  message={message}
                  conversationId={conversationId}
                  investigation={index === messages.length - 1 ? investigationData : null}
                  investigationError={index === messages.length - 1 ? investigationError : ""}
                />
              ),
            )}
          </div>
        )}
        {busy && pendingQuestion && (
          <div className="space-y-6 pb-6 motion-safe:animate-enter">
            <div className="border-l-2 border-accent pl-5">
              <p className="text-[9px] tracking-[.2em] text-muted">
                {copy.question}
              </p>
              <p className="mt-3 text-lg">{pendingQuestion}</p>
            </div>
            <div
              role="status"
              className="relative overflow-hidden rounded-2xl border border-border bg-surface-raised p-7"
            >
              <div className="absolute inset-y-0 left-1/2 w-px bg-accent/40 motion-safe:animate-[scan_3s_ease-in-out_infinite]" />
              <div className="flex items-center gap-3 text-[10px] tracking-[.15em]">
                <LoaderCircle
                  size={17}
                  className="text-focus motion-safe:animate-spin"
                />
                {copy.working}
              </div>
              <p className="mt-5 font-editorial text-2xl">{bot.pending}</p>
              <p className="mt-3 text-xs text-muted">{copy.waiting}</p>
            </div>
          </div>
        )}
        <div ref={end} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="z-10 shrink-0 rounded-2xl border border-border bg-surface-raised/95 p-3 shadow-xl shadow-dark-surface/5 backdrop-blur-xl transition duration-300 focus-within:border-muted focus-within:shadow-2xl sm:p-4"
        >
          <label
            htmlFor="research-question"
            className="mb-3 block text-[9px] tracking-[.18em] text-muted"
          >
            {conversationId ? copy.followup : copy.inputLabel}
          </label>
          <textarea
            ref={input}
            id="research-question"
            rows={1}
            maxLength={2000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.ctrlKey &&
                !e.shiftKey &&
                !e.metaKey
              ) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder={bot.placeholder}
            disabled={busy || loading || Boolean(loadError)}
            className="w-full resize-none bg-transparent text-sm leading-5 outline-none placeholder:text-muted"
          />
          <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
            <span className="text-[10px] text-muted">
              {draft.length} / 2000
            </span>
            <button
              type="submit"
              disabled={busy || loading || Boolean(loadError) || !draft.trim()}
              aria-label={copy.submit}
              className="group flex items-center gap-3 rounded-xl bg-dark-surface px-5 py-3 text-xs text-inverse transition hover:bg-dark-border disabled:opacity-50"
            >
              {copy.submit}
              <Send
                size={14}
                className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </button>
          </div>
        </form>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-error-surface p-4 text-xs leading-6 text-error"
          >
            {error}
          </p>
        )}
        <p className="mt-4 text-center text-[10px] leading-5 text-muted">
          {bot.notice}
        </p>
      </div>
      <aside className="hidden min-h-0 overflow-y-auto border-l border-border pl-6 xl:block">
        <p className="mb-5 text-[9px] tracking-[.18em] text-muted">
          {copy.history}
        </p>
        {historyLoading || historyError ? (
          <FeedState
            loading={historyLoading}
            error={historyError}
            retry={() => setRevision((n) => n + 1)}
          />
        ) : history.length ? (
            <div className="motion-stagger space-y-2">
            {history.map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/bot/${item.id}`}
                aria-current={item.id === conversationId ? "page" : undefined}
                className={`group block rounded-xl p-3 transition duration-300 hover:translate-x-1 ${item.id === conversationId ? "bg-sage/30" : "hover:bg-surface"}`}
              >
                <p className="line-clamp-2 text-xs leading-5">{item.title}</p>
                <span className="mt-2 flex items-center justify-between text-[9px] text-muted">
                  {dateLabel(item.lastUpdated)}
                  <ArrowRight
                    size={12}
                    className="transition group-hover:translate-x-1"
                  />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs leading-6 text-muted">{copy.noHistory}</p>
        )}
      </aside>
    </div>
  );
}
