"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type SearchResultItem = {
  id: string;
  memoUrl: string | null;
  memoTitle: string | null;
  bookId: string;
  bookTitle: string | null;
  bookUrl: string | null;
  tags: string[];
  note: string;
  preview: string;
  scholarQueries: string[];
};

type SearchSuccessResponse = {
  ok: true;
  mode: string;
  topK: number;
  requestedTopK?: number;
  resultCount: number;
  contextTextLength: number;
  results: SearchResultItem[];
};

type SearchErrorResponse = {
  ok: false;
  error: string;
};

type SearchClientProps = {
  defaultContextText: string;
};

export default function SearchClient({ defaultContextText }: SearchClientProps) {
  const [contextText, setContextText] = useState(defaultContextText);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [response, setResponse] = useState<SearchSuccessResponse | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const results = useMemo(() => response?.results ?? [], [response]);

  async function handleSearch() {
    if (isSearching) {
      return;
    }

    setIsSearching(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contextText
        })
      });

      const body = (await res.json()) as SearchSuccessResponse | SearchErrorResponse;

      if (!res.ok || !body.ok) {
        const message = body.ok ? "search_failed" : body.error;
        throw new Error(message);
      }

      setResponse(body);
    } catch (error) {
      setResponse(null);
      setErrorMessage(error instanceof Error ? error.message : "search_failed");
    } finally {
      setIsSearching(false);
    }
  }

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [contextText]);

  return (
    <>
      <section className="mt-8">
        <h2 className="text-lg font-semibold">検索結果</h2>
        {response ? (
          <p className="mt-1 text-sm text-[var(--ink-muted)]">{response.resultCount}件</p>
        ) : null}
        {errorMessage ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            検索エラー: {errorMessage}
          </p>
        ) : null}
        <div className="mt-3 grid gap-4">
          {results.map((memo) => (
            <article
              key={memo.id}
              className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {memo.memoUrl ? (
                  <a
                    href={memo.memoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-[var(--accent)] underline decoration-1 underline-offset-3"
                  >
                    {memo.memoTitle ?? "（メモタイトルなし）"}
                  </a>
                ) : (
                  <span className="font-semibold text-[var(--accent)]">
                    {memo.memoTitle ?? "（メモタイトルなし）"}
                  </span>
                )}
                <a
                  href={memo.bookUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--ink-muted)] underline"
                >
                  {memo.bookTitle ?? "（引用コンテンツなし）"}
                </a>
                <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs">
                  {memo.note}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {memo.tags.map((tag) => (
                  <span
                    key={`${memo.id}-${tag}`}
                    className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--ink-muted)]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              <p className="mt-4 text-sm leading-relaxed text-[var(--ink-muted)]">
                {memo.preview.slice(0, 400)}
              </p>

              <div className="mt-4 border-t border-[var(--line)] pt-3">
                <p className="text-xs font-semibold text-[var(--ink-muted)]">一次資料クエリ候補</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {memo.scholarQueries.map((query) => (
                    <a
                      key={`${memo.id}-${query}`}
                      href={`https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      {query}
                    </a>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="pointer-events-none fixed right-0 bottom-4 left-0 z-40 px-3 sm:px-6">
        <div className="pointer-events-auto mx-auto flex w-full max-w-5xl flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[#fffcf2]/82 px-4 py-3 shadow-xl backdrop-blur-md md:flex-row md:items-end">
          <div className="flex-1">
            <label htmlFor="context" className="text-xs font-semibold text-[var(--ink-muted)]">
              文脈入力
            </label>
            <textarea
              id="context"
              ref={textareaRef}
              className="mt-1 min-h-11 w-full rounded-xl border border-[var(--line)] bg-white p-3 text-sm leading-relaxed outline-none ring-[var(--accent)] focus:ring-1"
              placeholder="今考えている課題、仮説、問いを入力..."
              value={contextText}
              onChange={(event) => setContextText(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  void handleSearch();
                }
              }}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSearch}
              disabled={isSearching}
              className="h-11 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isSearching ? "Searching..." : "検索"}
            </button>
            <Link
              href="/admin"
              className="inline-flex h-11 items-center rounded-full border border-[var(--accent)] bg-white px-5 text-sm font-semibold text-[var(--accent)]"
            >
              Notionメモ同期
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
