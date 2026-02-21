export const FETCH_K = 20;
export const ANSWER_K = 8;
export const PREVIEW_CHAR_LIMIT = 400;

export type AssistRequestBody = {
  query?: unknown;
};

export type EvidenceCard = {
  id: string;
  memo_url: string | null;
  memo_title: string | null;
  book_id: string | null;
  book_title: string | null;
  book_url: string | null;
  tags: string[];
  note: string;
  preview: string;
  relevance_reason: string;
  scholar_queries: string[];
};

export type AssistSuccessResponse = {
  ok: true;
  mode: "live";
  fetch_k: number;
  answer_k: number;
  response: string;
  evidence_cards: EvidenceCard[];
  used_memo_ids: string[];
};

export type AssistErrorResponse = {
  ok: false;
  error: string;
};

export function parseQuery(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }

  const query = raw.trim();
  if (query.length === 0) {
    return null;
  }

  return query;
}
