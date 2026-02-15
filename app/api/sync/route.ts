import { NextResponse } from "next/server";
import { createEmbedding } from "../../../lib/openai/embeddings";
import {
  type MemoQueryLimit,
  flattenPageContent,
  getPageMetadata,
  queryMemoPages
} from "../../../lib/notion/api";
import { isAllowedEmail } from "../../../lib/auth/allowed-email";
import { createAdminClient } from "../../../lib/supabase/admin";
import { createClient } from "../../../lib/supabase/server";

type SyncRequestBody = {
  limit?: unknown;
  forceFail?: unknown;
  previewCount?: unknown;
};

type SyncLimit = MemoQueryLimit;

type SyncPreviewItem = {
  book_title: string;
  memo_url: string;
};

type SyncFailedItem = {
  id: string;
  book_title: string;
  memo_url: string;
};

type MemoUpsertRecord = {
  id: string;
  memo_url: string;
  book_id: string;
  book_title: string;
  book_url: string;
  tags: string[];
  note: string;
  content_text: string;
  embedding: string;
  created_time: string;
  last_edited_time: string;
};

type SyncSuccessResult = {
  ok: true;
  mode: "live";
  status: "succeeded";
  limit: SyncLimit;
  previewCount: number;
  fetchedCount: number;
  diffCount: number;
  upsertAttemptedCount: number;
  syncedCount: number;
  failedIds: SyncFailedItem[];
  upsertPreview: SyncPreviewItem[];
};

type SyncFailureResult = {
  ok: false;
  mode: "live";
  status: "failed";
  limit: SyncLimit;
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

type SyncResult = SyncSuccessResult | SyncFailureResult;

type SyncStreamEvent =
  | {
      type: "start";
      limit: SyncLimit;
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
      result: SyncResult;
    };

type ExistingMemoRow = {
  id: string;
  last_edited_time: string | null;
};

const DEFAULT_PREVIEW_COUNT = 20;
const MAX_PREVIEW_COUNT = 50;
const MAX_CONTENT_LENGTH = 12000;
const SUPABASE_IN_BATCH = 500;

function clampPreviewCount(rawPreviewCount: unknown): number {
  const value = typeof rawPreviewCount === "number" ? rawPreviewCount : DEFAULT_PREVIEW_COUNT;
  return Math.min(Math.max(1, Math.floor(value)), MAX_PREVIEW_COUNT);
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

function normalizeContent(contentText: string, bookTitle: string, note: string): string {
  let normalized = contentText.trim();

  if (normalized.length < 20) {
    normalized = [normalized, bookTitle, note].filter(Boolean).join("\n").trim();
  }

  if (normalized.length > MAX_CONTENT_LENGTH) {
    normalized = normalized.slice(0, MAX_CONTENT_LENGTH);
  }

  return normalized;
}

function parseSyncLimit(rawLimit: unknown): SyncLimit | null {
  if (rawLimit === 50 || rawLimit === "50") {
    return 50;
  }

  if (rawLimit === "all") {
    return "all";
  }

  return null;
}

async function fetchExistingMemoEditedTimes(
  admin: ReturnType<typeof createAdminClient>,
  ids: string[]
): Promise<Map<string, string>> {
  const editedTimeById = new Map<string, string>();

  for (let index = 0; index < ids.length; index += SUPABASE_IN_BATCH) {
    const batch = ids.slice(index, index + SUPABASE_IN_BATCH);
    if (batch.length === 0) {
      continue;
    }

    const { data, error } = await admin
      .from("memos")
      .select("id,last_edited_time")
      .in("id", batch);

    if (error) {
      throw new Error(error.message);
    }

    for (const row of (data ?? []) as ExistingMemoRow[]) {
      if (row.last_edited_time) {
        editedTimeById.set(row.id, row.last_edited_time);
      }
    }
  }

  return editedTimeById;
}

function isPageOutdated(notionEditedAt: string | undefined, supabaseEditedAt: string | undefined): boolean {
  if (!supabaseEditedAt) {
    return true;
  }

  if (!notionEditedAt) {
    return false;
  }

  const notionTime = new Date(notionEditedAt).getTime();
  const supabaseTime = new Date(supabaseEditedAt).getTime();

  if (Number.isNaN(notionTime) || Number.isNaN(supabaseTime)) {
    return notionEditedAt > supabaseEditedAt;
  }

  return notionTime > supabaseTime;
}

function createNdjsonStream(
  producer: (emit: (event: SyncStreamEvent) => Promise<void>) => Promise<void>
): ReadableStream<Uint8Array> {
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  const emit = async (event: SyncStreamEvent) => {
    await writer.write(encoder.encode(`${JSON.stringify(event)}\n`));
  };

  void (async () => {
    try {
      await producer(emit);
    } finally {
      await writer.close();
    }
  })();

  return stream.readable;
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

  const limit = parseSyncLimit(body.limit);
  if (!limit) {
    return NextResponse.json({ ok: false, error: "limit_must_be_50_or_all" }, { status: 400 });
  }

  const previewCount = clampPreviewCount(body.previewCount);

  const stream = createNdjsonStream(async (emit) => {
    if (body.forceFail === true) {
      const result: SyncFailureResult = {
        ok: false,
        mode: "live",
        status: "failed",
        limit,
        previewCount,
        fetchedCount: 0,
        diffCount: 0,
        upsertAttemptedCount: 0,
        syncedCount: 0,
        failedIds: [],
        error: {
          code: "FORCED_FAILURE",
          message: "Forced failure is enabled."
        }
      };

      await emit({ type: "done", result });
      return;
    }

    try {
      const pages = await queryMemoPages(limit);
      const admin = createAdminClient();

      const pageIds = pages.map((page) => page.id);
      const existingMemoEditedTimes = await fetchExistingMemoEditedTimes(admin, pageIds);
      const targetPages = pages.filter((page) =>
        isPageOutdated(page.last_edited_time, existingMemoEditedTimes.get(page.id))
      );

      await emit({
        type: "start",
        limit,
        previewCount,
        fetchedCount: pages.length,
        diffCount: targetPages.length
      });

      const failedIds: SyncFailedItem[] = [];
      const syncedPreview: SyncPreviewItem[] = [];
      let syncedCount = 0;
      let upsertAttemptedCount = 0;

      for (const page of targetPages) {
        const metadata = getPageMetadata(page);

        try {
          const flattenedContent = await flattenPageContent(page.id);
          const contentText = normalizeContent(flattenedContent, metadata.bookTitle, metadata.note);
          const embedding = await createEmbedding(contentText);

          const record: MemoUpsertRecord = {
            id: page.id,
            memo_url: metadata.memoUrl,
            book_id: metadata.bookId,
            book_title: metadata.bookTitle,
            book_url: metadata.bookUrl,
            tags: metadata.tags,
            note: metadata.note,
            content_text: contentText,
            embedding: toVectorLiteral(embedding),
            created_time: page.created_time ?? new Date().toISOString(),
            last_edited_time: page.last_edited_time ?? new Date().toISOString()
          };

          upsertAttemptedCount += 1;
          const { error } = await admin.from("memos").upsert(record, { onConflict: "id" });

          if (error) {
            throw new Error(error.message);
          }

          syncedCount += 1;
          let previewItem: SyncPreviewItem | undefined;

          if (syncedPreview.length < previewCount) {
            previewItem = {
              book_title: record.book_title,
              memo_url: record.memo_url
            };
            syncedPreview.push(previewItem);
          }

          await emit({
            type: "progress",
            upsertAttemptedCount,
            syncedCount,
            failedCount: failedIds.length,
            previewItem
          });
        } catch {
          failedIds.push({
            id: page.id,
            book_title: metadata.bookTitle,
            memo_url: metadata.memoUrl
          });

          await emit({
            type: "progress",
            upsertAttemptedCount,
            syncedCount,
            failedCount: failedIds.length
          });
        }
      }

      if (failedIds.length > 0) {
        const result: SyncFailureResult = {
          ok: false,
          mode: "live",
          status: "failed",
          limit,
          previewCount,
          fetchedCount: pages.length,
          diffCount: targetPages.length,
          upsertAttemptedCount,
          syncedCount,
          failedIds,
          error: {
            code: "SYNC_PARTIAL_FAILURE",
            message: "Some memo sync operations failed."
          }
        };

        await emit({ type: "done", result });
        return;
      }

      const result: SyncSuccessResult = {
        ok: true,
        mode: "live",
        status: "succeeded",
        limit,
        previewCount,
        fetchedCount: pages.length,
        diffCount: targetPages.length,
        upsertAttemptedCount,
        syncedCount,
        failedIds: [],
        upsertPreview: syncedPreview
      };

      await emit({ type: "done", result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "sync_failed";
      const result: SyncFailureResult = {
        ok: false,
        mode: "live",
        status: "failed",
        limit,
        previewCount,
        fetchedCount: 0,
        diffCount: 0,
        upsertAttemptedCount: 0,
        syncedCount: 0,
        failedIds: [],
        error: {
          code: "SYNC_FATAL_ERROR",
          message
        }
      };

      await emit({ type: "done", result });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache"
    }
  });
}
