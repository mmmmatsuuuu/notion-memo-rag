"use client";

import { useState } from "react";

type SyncPreviewItem = {
  book_title: string;
  memo_url: string;
};

type SyncFailedItem = {
  id: string;
  book_title: string;
  memo_url: string;
};

type SyncSuccessResponse = {
  ok: true;
  mode: string;
  status: "succeeded";
  limit: number | "all";
  previewCount: number;
  fetchedCount: number;
  diffCount: number;
  upsertAttemptedCount: number;
  syncedCount: number;
  failedIds: [];
  upsertPreview: SyncPreviewItem[];
};

type SyncFailedResponse = {
  ok: false;
  mode: string;
  status: "failed";
  limit: number | "all";
  previewCount: number;
  fetchedCount: number;
  diffCount: number;
  upsertAttemptedCount: number;
  syncedCount: number;
  failedIds: SyncFailedItem[];
  error: {
    code: string;
    message: string;
  };
};

type SyncErrorResponse = {
  ok: false;
  error: string;
};

type SyncResponse = SyncSuccessResponse | SyncFailedResponse;

type SyncStreamEvent =
  | {
      type: "start";
      limit: number | "all";
      previewCount: number;
      fetchedCount: number;
      diffCount: number;
    }
  | {
      type: "progress";
      upsertAttemptedCount: number;
      syncedCount: number;
      failedCount: number;
      previewItem?: SyncPreviewItem;
    }
  | {
      type: "done";
      result: SyncResponse;
    };

type SyncProgressState = {
  fetchedCount: number;
  diffCount: number;
  upsertAttemptedCount: number;
  syncedCount: number;
  failedCount: number;
};

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch {
      return "sync_failed";
    }
  }

  return "sync_failed";
}

function parseNdjsonChunk(chunk: string): SyncStreamEvent[] {
  return chunk
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as SyncStreamEvent);
}

export default function AdminSyncClient() {
  const previewLimit = 20;
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [livePreview, setLivePreview] = useState<SyncPreviewItem[]>([]);
  const [progress, setProgress] = useState<SyncProgressState | null>(null);
  const [result, setResult] = useState<SyncResponse | null>(null);

  async function handleSync(limit: 50 | "all") {
    setIsSyncing(true);
    setErrorMessage(null);
    setResult(null);
    setLivePreview([]);
    setProgress({
      fetchedCount: 0,
      diffCount: 0,
      upsertAttemptedCount: 0,
      syncedCount: 0,
      failedCount: 0
    });

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/x-ndjson"
        },
        body: JSON.stringify({
          limit,
          previewCount: previewLimit
        })
      });

      if (!res.body) {
        const body = (await res.json()) as SyncResponse | SyncErrorResponse;
        if (!res.ok || !("status" in body)) {
          const message =
            "error" in body
              ? typeof body.error === "string"
                ? body.error
                : body.error.message
              : "sync_failed";
          throw new Error(message);
        }
        setResult(body);
        setProgress({
          fetchedCount: body.fetchedCount,
          diffCount: body.diffCount,
          upsertAttemptedCount: body.upsertAttemptedCount,
          syncedCount: body.syncedCount,
          failedCount: body.failedIds.length
        });
        setLivePreview(body.ok ? body.upsertPreview : []);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const event of parseNdjsonChunk(lines.join("\n"))) {
          if (event.type === "start") {
            setProgress((prev) => ({
              fetchedCount: event.fetchedCount,
              diffCount: event.diffCount,
              upsertAttemptedCount: prev?.upsertAttemptedCount ?? 0,
              syncedCount: prev?.syncedCount ?? 0,
              failedCount: prev?.failedCount ?? 0
            }));
          }

          if (event.type === "progress") {
            setProgress((prev) => ({
              fetchedCount: prev?.fetchedCount ?? 0,
              diffCount: prev?.diffCount ?? 0,
              upsertAttemptedCount: event.upsertAttemptedCount,
              syncedCount: event.syncedCount,
              failedCount: event.failedCount
            }));

            if (event.previewItem) {
              const previewItem = event.previewItem;
              setLivePreview((prev) => {
                if (prev.length >= previewLimit) {
                  return prev;
                }
                return [...prev, previewItem];
              });
            }
          }

          if (event.type === "done") {
            setResult(event.result);
            setProgress({
              fetchedCount: event.result.fetchedCount,
              diffCount: event.result.diffCount,
              upsertAttemptedCount: event.result.upsertAttemptedCount,
              syncedCount: event.result.syncedCount,
              failedCount: event.result.failedIds.length
            });
            if (!event.result.ok) {
              setErrorMessage(`${event.result.error.code}: ${event.result.error.message}`);
            }
          }
        }
      }

      if (buffer.trim().length > 0) {
        for (const event of parseNdjsonChunk(buffer)) {
          if (event.type === "done") {
            setResult(event.result);
          }
        }
      }
    } catch (error) {
      setResult(null);
      setErrorMessage(normalizeErrorMessage(error));
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <>
      <section className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm">
        <h2 className="text-lg font-semibold">手動同期</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleSync(50)}
            disabled={isSyncing}
            className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isSyncing ? "Syncing..." : "Sync latest 50"}
          </button>
          <button
            type="button"
            onClick={() => handleSync("all")}
            disabled={isSyncing}
            className="rounded-full border border-[var(--accent)] bg-white px-5 py-2 text-sm font-semibold text-[var(--accent)] disabled:opacity-60"
          >
            {isSyncing ? "Syncing..." : "Sync all"}
          </button>
        </div>
        {errorMessage ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            同期エラー: {errorMessage}
          </p>
        ) : null}
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm">
        <h2 className="text-lg font-semibold">同期結果</h2>

        {progress ? (
          <dl className="mt-3 grid gap-3 rounded-xl border border-[var(--line)] bg-white p-4 text-sm sm:grid-cols-5">
            <div>
              <dt className="text-[var(--ink-muted)]">取得件数</dt>
              <dd className="mt-1 text-xl font-semibold">{progress.fetchedCount}</dd>
            </div>
            <div>
              <dt className="text-[var(--ink-muted)]">差分件数</dt>
              <dd className="mt-1 text-xl font-semibold">{progress.diffCount}</dd>
            </div>
            <div>
              <dt className="text-[var(--ink-muted)]">更新試行件数</dt>
              <dd className="mt-1 text-xl font-semibold">{progress.upsertAttemptedCount}</dd>
            </div>
            <div>
              <dt className="text-[var(--ink-muted)]">更新件数</dt>
              <dd className="mt-1 text-xl font-semibold">{progress.syncedCount}</dd>
            </div>
            <div>
              <dt className="text-[var(--ink-muted)]">失敗件数</dt>
              <dd className="mt-1 text-xl font-semibold text-red-600">{progress.failedCount}</dd>
            </div>
          </dl>
        ) : null}

        {livePreview.length > 0 ? (
          <div className="mt-4 rounded-xl border border-[var(--line)] bg-white p-4">
            <p className="text-sm font-semibold">upsertPreview（逐次更新）</p>
            <ul className="mt-2 space-y-1 text-xs text-[var(--ink-muted)]">
              {livePreview.map((item) => (
                <li key={`${item.book_title}-${item.memo_url}`}>
                  {item.book_title} /{" "}
                  <a href={item.memo_url} target="_blank" rel="noreferrer" className="underline">
                    {item.memo_url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {result && !result.ok ? (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4">
            <h3 className="text-sm font-semibold text-red-700">失敗メモ</h3>
            <p className="mt-1 text-xs text-red-700">
              {result.error.code}: {result.error.message}
            </p>
            <ul className="mt-2 space-y-1 text-xs text-red-700">
              {result.failedIds.map((item) => (
                <li key={item.id}>
                  {item.id} / {item.book_title} / {item.memo_url}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {!progress ? (
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            まだ同期結果はありません。Sync latest 50 または Sync all を実行してください。
          </p>
        ) : null}
      </section>
    </>
  );
}
