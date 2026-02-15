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
  mode: "mock";
  status: "succeeded";
  limit: number;
  previewCount: number;
  fetchedCount: number;
  upsertAttemptedCount: number;
  syncedCount: number;
  failedIds: [];
  upsertPreview: SyncPreviewItem[];
};

type SyncFailedResponse = {
  ok: false;
  mode: "mock";
  status: "failed";
  limit: number;
  previewCount: number;
  fetchedCount: number;
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

export default function AdminSyncClient() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forceFail, setForceFail] = useState(false);
  const [previewCount, setPreviewCount] = useState(20);
  const [result, setResult] = useState<SyncResponse | null>(null);

  async function handleSync(limit: 50 | 200) {
    setIsSyncing(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          limit,
          forceFail,
          previewCount
        })
      });

      const body = (await res.json()) as SyncResponse | SyncErrorResponse;

      if ("mode" in body) {
        setResult(body);
        if (res.ok) {
          return;
        }
      }

      const message = "error" in body ? body.error : "sync_failed";
      throw new Error(message);
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
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          MVP仕様: バックグラウンドジョブなし。必要時に手動実行。
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-[var(--ink-muted)]">
            <span>previewCount</span>
            <input
              type="number"
              min={1}
              max={50}
              value={previewCount}
              onChange={(event) => setPreviewCount(Number(event.target.value))}
              className="w-20 rounded-lg border border-[var(--line)] bg-white px-2 py-1 text-sm"
            />
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-[var(--ink-muted)]">
            <input
              type="checkbox"
              checked={forceFail}
              onChange={(event) => setForceFail(event.target.checked)}
            />
            mock fail
          </label>
        </div>
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
            onClick={() => handleSync(200)}
            disabled={isSyncing}
            className="rounded-full border border-[var(--accent)] bg-white px-5 py-2 text-sm font-semibold text-[var(--accent)] disabled:opacity-60"
          >
            {isSyncing ? "Syncing..." : "Sync latest 200"}
          </button>
        </div>
        {errorMessage ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            同期エラー: {errorMessage}
          </p>
        ) : null}
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm">
        <h2 className="text-lg font-semibold">同期結果（モック）</h2>
        {result ? (
          <>
            <dl className="mt-3 grid gap-3 rounded-xl border border-[var(--line)] bg-white p-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-[var(--ink-muted)]">取得件数</dt>
                <dd className="mt-1 text-xl font-semibold">{result.fetchedCount}</dd>
              </div>
              <div>
                <dt className="text-[var(--ink-muted)]">更新試行件数</dt>
                <dd className="mt-1 text-xl font-semibold">{result.upsertAttemptedCount}</dd>
              </div>
              <div>
                <dt className="text-[var(--ink-muted)]">更新件数</dt>
                <dd className="mt-1 text-xl font-semibold">{result.syncedCount}</dd>
              </div>
            </dl>

            {result.ok ? (
              <div className="mt-4 rounded-xl border border-[var(--line)] bg-white p-4">
                <p className="text-sm font-semibold">upsertPreview</p>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  先頭 {result.upsertPreview.length} 件（previewCount={result.previewCount}）
                </p>
                <ul className="mt-2 space-y-1 text-xs text-[var(--ink-muted)]">
                  {result.upsertPreview.map((item) => (
                    <li key={`${item.book_title}-${item.memo_url}`}>
                      {item.book_title} /{" "}
                      <a
                        href={item.memo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        {item.memo_url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
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
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            まだ同期結果はありません。Sync latest 50 または 200 を実行してください。
          </p>
        )}
      </section>
    </>
  );
}
