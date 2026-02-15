import { NextResponse } from "next/server";
import { isAllowedEmail } from "../../../lib/auth/allowed-email";
import { createClient } from "../../../lib/supabase/server";

type SyncRequestBody = {
  limit?: unknown;
  forceFail?: unknown;
  previewCount?: unknown;
};

type MockUpsertRecord = {
  id: string;
  memo_url: string;
  book_id: string;
  book_title: string;
  book_url: string;
  tags: string[];
  note: string;
  content_text: string;
  content_hash: string;
  embedding_dim: number;
  created_time: string;
  last_edited_time: string;
};

type SyncPreviewItem = {
  book_title: string;
  memo_url: string;
};

type SyncFailedItem = {
  id: string;
  book_title: string;
  memo_url: string;
};

const ALLOWED_LIMITS = [50, 200] as const;
const EMBEDDING_DIM = 1536;
const DEFAULT_PREVIEW_COUNT = 20;
const MAX_PREVIEW_COUNT = 50;

function buildMockUpsertPayload(limit: 50 | 200): MockUpsertRecord[] {
  return Array.from({ length: limit }, (_, index) => {
    const row = index + 1;
    const id = `mock-page-${String(row).padStart(3, "0")}`;

    return {
      id,
      memo_url: `https://www.notion.so/${id}`,
      book_id: `book-${String(row).padStart(3, "0")}`,
      book_title: `Mock Book ${row}`,
      book_url: `https://example.com/books/${String(row).padStart(3, "0")}`,
      tags: row % 2 === 0 ? ["MVP", "検索"] : ["読書", "思考"],
      note: `p.${10 + row}`,
      content_text: `これは ${row} 件目のモック本文です。`,
      content_hash: `mock-hash-${String(row).padStart(3, "0")}`,
      embedding_dim: EMBEDDING_DIM,
      created_time: "2026-02-01T09:00:00.000Z",
      last_edited_time: "2026-02-14T02:00:00.000Z"
    };
  });
}

function buildPreviewItems(records: MockUpsertRecord[], previewCount: number): SyncPreviewItem[] {
  return records.slice(0, previewCount).map((record) => ({
    book_title: record.book_title,
    memo_url: record.memo_url
  }));
}

function buildFailedItems(records: MockUpsertRecord[]): SyncFailedItem[] {
  return records.slice(0, 2).map((record) => ({
    id: record.id,
    book_title: record.book_title,
    memo_url: record.memo_url
  }));
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!isAllowedEmail(user.email)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  let body: SyncRequestBody;

  try {
    body = (await request.json()) as SyncRequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const limit = body.limit;
  if (typeof limit !== "number" || !ALLOWED_LIMITS.includes(limit as 50 | 200)) {
    return NextResponse.json({ ok: false, error: "limit_must_be_50_or_200" }, { status: 400 });
  }

  const rawPreviewCount = typeof body.previewCount === "number" ? body.previewCount : DEFAULT_PREVIEW_COUNT;
  const previewCount = Math.min(
    Math.max(1, Math.floor(rawPreviewCount)),
    MAX_PREVIEW_COUNT
  );
  const forceFail = body.forceFail === true;
  const mockUpsertPayload = buildMockUpsertPayload(limit as 50 | 200);

  if (forceFail) {
    const failedIds = buildFailedItems(mockUpsertPayload);
    return NextResponse.json(
      {
        ok: false,
        mode: "mock",
        status: "failed",
        limit,
        previewCount,
        fetchedCount: limit,
        upsertAttemptedCount: mockUpsertPayload.length,
        syncedCount: 0,
        failedIds,
        error: {
          code: "MOCK_UPSERT_FAILED",
          message: "Mock sync failure. No upsert was executed."
        }
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "mock",
    status: "succeeded",
    limit,
    previewCount,
    fetchedCount: limit,
    upsertAttemptedCount: mockUpsertPayload.length,
    syncedCount: mockUpsertPayload.length,
    failedIds: [],
    upsertPreview: buildPreviewItems(mockUpsertPayload, previewCount)
  });
}
