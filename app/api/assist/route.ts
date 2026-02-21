import { NextResponse } from "next/server";
import { isAllowedEmail } from "../../../lib/auth/allowed-email";
import {
  ANSWER_K,
  type AssistErrorResponse,
  FETCH_K,
  type EvidenceCard,
  PREVIEW_CHAR_LIMIT,
  parseQuery
} from "../../../lib/assist/contract";
import { createEmbedding } from "../../../lib/openai/embeddings";
import { createAdminClient } from "../../../lib/supabase/admin";
import { createClient } from "../../../lib/supabase/server";

type AssistRequestBody = {
  query?: unknown;
};

type MatchMemoRow = {
  id?: string;
  memo_url?: string;
  memo_title?: string;
  book_id?: string;
  book_title?: string;
  book_url?: string;
  tags?: string[] | string | null;
  note?: string | null;
  content_text?: string | null;
};

type MemoLookupRow = {
  id: string;
  memo_url?: string | null;
  memo_title?: string | null;
  book_id?: string | null;
  book_title?: string | null;
  book_url?: string | null;
};

function normalizeTags(tags: MatchMemoRow["tags"]): string[] {
  if (Array.isArray(tags)) {
    return tags.filter((tag): tag is string => typeof tag === "string" && tag.length > 0);
  }

  if (typeof tags === "string" && tags.length > 0) {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

function tokenizeForReasoning(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[^a-z0-9ぁ-んァ-ヶ一-龯]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function buildRelevanceReason(query: string, row: MatchMemoRow): string {
  const queryTokens = tokenizeForReasoning(query).slice(0, 12);
  const haystack = [row.memo_title, row.book_title, row.note, row.content_text].filter(Boolean).join(" ").toLowerCase();
  const matched = queryTokens.filter((token) => haystack.includes(token)).slice(0, 3);

  if (matched.length > 0) {
    return `問いの主要語（${matched.join(" / ")}）に対応する記述が含まれているため。`;
  }

  if (row.note && row.note.trim().length > 0) {
    return "メモ注記の論点が問いの方向性と近いため。";
  }

  return "本文の意味的近傍検索で上位に抽出されたため。";
}

function buildScholarQueries(row: MatchMemoRow): string[] {
  const title = row.book_title ?? row.memo_title ?? "";
  const note = row.note ?? "";
  const content = (row.content_text ?? "").slice(0, 140).replace(/\s+/g, " ").trim();

  const candidates = [
    title,
    [title, note].filter(Boolean).join(" ").trim(),
    [title, content].filter(Boolean).join(" ").trim(),
    note,
    content
  ].filter(Boolean);

  return [...new Set(candidates)].slice(0, 6);
}

function needsMetadataHydration(row: MatchMemoRow): boolean {
  return !row.memo_title || !row.memo_url || !row.book_url;
}

async function hydrateRowsWithMemoFields(rows: MatchMemoRow[]): Promise<MatchMemoRow[]> {
  const targetIds = rows
    .filter((row) => needsMetadataHydration(row) && typeof row.id === "string" && row.id.length > 0)
    .map((row) => row.id as string);

  if (targetIds.length === 0) {
    return rows;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("memos")
    .select("id,memo_url,memo_title,book_id,book_title,book_url")
    .in("id", [...new Set(targetIds)]);

  if (error) {
    return rows;
  }

  const memoById = new Map<string, MemoLookupRow>();
  for (const row of (data ?? []) as MemoLookupRow[]) {
    memoById.set(row.id, row);
  }

  return rows.map((row) => {
    if (!row.id) {
      return row;
    }

    const memo = memoById.get(row.id);
    if (!memo) {
      return row;
    }

    return {
      ...row,
      memo_url: row.memo_url ?? memo.memo_url ?? undefined,
      memo_title: row.memo_title ?? memo.memo_title ?? undefined,
      book_id: row.book_id ?? memo.book_id ?? undefined,
      book_title: row.book_title ?? memo.book_title ?? undefined,
      book_url: row.book_url ?? memo.book_url ?? undefined
    };
  });
}

async function runMatchMemos(embedding: number[], fetchK: number): Promise<MatchMemoRow[]> {
  const supabase = createAdminClient();

  const rpcParamsList: Array<Record<string, unknown>> = [
    { query_embedding: embedding, match_count: fetchK },
    { query_embedding: embedding, top_k: fetchK },
    { p_query_embedding: embedding, p_match_count: fetchK },
    { embedding, match_count: fetchK }
  ];

  for (const params of rpcParamsList) {
    const { data, error } = await supabase.rpc("match_memos", params);
    if (!error) {
      return (data ?? []) as MatchMemoRow[];
    }
  }

  throw new Error("match_memos_rpc_failed");
}

function buildEvidenceCards(rows: MatchMemoRow[], query: string): EvidenceCard[] {
  return rows.slice(0, ANSWER_K).map((row, index) => ({
    id: row.id ?? `memo-${index + 1}`,
    memo_url: row.memo_url ?? null,
    memo_title: row.memo_title ?? null,
    book_id: row.book_id ?? row.id ?? null,
    book_title: row.book_title ?? null,
    book_url: row.book_url ?? null,
    tags: normalizeTags(row.tags),
    note: row.note ?? "",
    preview: (row.content_text ?? "").slice(0, PREVIEW_CHAR_LIMIT),
    relevance_reason: buildRelevanceReason(query, row),
    scholar_queries: buildScholarQueries(row)
  }));
}

function buildAssistResponse(query: string, evidenceCards: EvidenceCard[]): string {
  if (evidenceCards.length === 0) {
    return `「${query}」に関する根拠メモが見つかりませんでした。問いを具体化して再検索してください。`;
  }

  const lines = evidenceCards.slice(0, 3).map((card, index) => {
    const title = card.book_title ?? card.memo_title ?? `根拠メモ${index + 1}`;
    return `${index + 1}. ${title} - ${card.relevance_reason}`;
  });

  return [`問い: ${query}`, "関連メモの要点:", ...lines, "上記の根拠カードから原典に遡って検討してください。"].join(
    "\n"
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json<AssistErrorResponse>({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!isAllowedEmail(user.email)) {
    return NextResponse.json<AssistErrorResponse>({ ok: false, error: "forbidden" }, { status: 403 });
  }

  let body: AssistRequestBody;
  try {
    body = (await request.json()) as AssistRequestBody;
  } catch {
    return NextResponse.json<AssistErrorResponse>({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const query = parseQuery(body.query);
  if (!query) {
    return NextResponse.json<AssistErrorResponse>({ ok: false, error: "query_required" }, { status: 400 });
  }

  try {
    const embedding = await createEmbedding(query);
    const rawRows = await runMatchMemos(embedding, FETCH_K);
    const hydratedRows = await hydrateRowsWithMemoFields(rawRows);
    const evidenceCards = buildEvidenceCards(hydratedRows, query);

    return NextResponse.json({
      ok: true,
      mode: "live",
      fetch_k: FETCH_K,
      answer_k: ANSWER_K,
      response: buildAssistResponse(query, evidenceCards),
      evidence_cards: evidenceCards,
      used_memo_ids: evidenceCards.map((card) => card.id)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "assist_failed";
    return NextResponse.json<AssistErrorResponse>({ ok: false, error: message }, { status: 500 });
  }
}
