const NOTION_BASE_URL = "https://api.notion.com/v1";
const NOTION_VERSION = "2025-09-03";

type NotionQueryResponse = {
  results?: NotionPage[];
  has_more?: boolean;
  next_cursor?: string | null;
};

type NotionDatabaseResponse = {
  data_sources?: Array<{ id?: string }>;
};

type NotionBlockChildrenResponse = {
  results?: NotionBlock[];
  has_more?: boolean;
  next_cursor?: string | null;
};

type NotionRichText = {
  plain_text?: string;
};

type NotionPropertyValue = {
  type?: string;
  title?: NotionRichText[];
  rich_text?: NotionRichText[];
  url?: string | null;
  relation?: Array<{ id?: string }>;
  multi_select?: Array<{ name?: string }>;
};

export type NotionPage = {
  id: string;
  url?: string;
  created_time?: string;
  last_edited_time?: string;
  properties?: Record<string, NotionPropertyValue>;
};

type BookReference = {
  id: string;
  title: string;
  url: string;
};

const bookReferenceCache = new Map<string, BookReference | null>();

type NotionBlock = {
  id: string;
  type: string;
  has_children?: boolean;
  [key: string]: unknown;
};

type NotionErrorResponse = {
  code?: string;
  message?: string;
};

async function notionFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    throw new Error("notion_token_missing");
  }

  const response = await fetch(`${NOTION_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    let errorBody: NotionErrorResponse | null = null;
    let rawText = "";

    try {
      errorBody = (await response.json()) as NotionErrorResponse;
    } catch {
      rawText = await response.text();
    }

    const code = errorBody?.code ?? "unknown";
    const message = errorBody?.message ?? rawText.slice(0, 200);
    throw new Error(`notion_api_failed:${response.status}:${code}:${message}`);
  }

  return (await response.json()) as T;
}

export type MemoQueryLimit = 50 | "all";

export async function queryMemoPages(limit: MemoQueryLimit): Promise<NotionPage[]> {
  const body = {
    page_size: limit === "all" ? 100 : 50,
    sorts: [
      {
        timestamp: "last_edited_time",
        direction: "descending"
      }
    ],
    result_type: "page"
  };

  const candidates = await resolveMemoDataSourceIds();
  let lastError: Error | null = null;

  for (const dataSourceId of candidates) {
    try {
      if (limit === 50) {
        const response: NotionQueryResponse = await notionFetch<NotionQueryResponse>(
          `/data_sources/${dataSourceId}/query`,
          {
          method: "POST",
          body: JSON.stringify(body)
          }
        );

        return response.results ?? [];
      }

      const pages: NotionPage[] = [];
      let cursor: string | null | undefined = null;

      do {
        const response: NotionQueryResponse = await notionFetch<NotionQueryResponse>(
          `/data_sources/${dataSourceId}/query`,
          {
            method: "POST",
            body: JSON.stringify({
              ...body,
              ...(cursor ? { start_cursor: cursor } : {})
            })
          }
        );

        pages.push(...(response.results ?? []));
        cursor = response.has_more ? response.next_cursor : null;
      } while (cursor);

      return pages;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("notion_query_failed");
    }
  }

  throw lastError ?? new Error("notion_data_source_query_failed");
}

async function resolveMemoDataSourceIds(): Promise<string[]> {
  const candidates: string[] = [];
  const explicitDataSourceId = process.env.NOTION_MEMO_DATA_SOURCE_ID;
  if (explicitDataSourceId) {
    candidates.push(explicitDataSourceId);
  }

  const databaseId = process.env.NOTION_MEMO_DB_ID;
  if (!databaseId) {
    if (candidates.length > 0) {
      return candidates;
    }
    throw new Error("notion_db_id_missing");
  }

  try {
    const database = await notionFetch<NotionDatabaseResponse>(`/databases/${databaseId}`, {
      method: "GET"
    });

    const dataSourceId = database.data_sources?.[0]?.id;
    if (dataSourceId) {
      candidates.push(dataSourceId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("object_not_found")) {
      throw error;
    }
  }

  candidates.push(databaseId);

  const uniqueCandidates = [...new Set(candidates.filter(Boolean))];
  if (uniqueCandidates.length === 0) {
    throw new Error("notion_data_source_not_found");
  }

  return uniqueCandidates;
}

function extractRichText(value?: NotionRichText[]): string {
  return (value ?? []).map((item) => item.plain_text ?? "").join("").trim();
}

export async function getPageMetadata(page: NotionPage) {
  const properties = page.properties ?? {};
  const memoTitle =
    findByPropertyType(properties, "title") ??
    findByKeyIncludes(properties, ["memo", "title"]) ??
    "Untitled";

  const relationBookPageId = getRelatedBookPageId(page);
  let relationBook: BookReference | null = null;

  if (relationBookPageId) {
    relationBook = await fetchBookReference(relationBookPageId);
  }

  const bookId = relationBookPageId ?? null;
  const bookTitle = relationBook?.title ?? null;
  const bookUrl = relationBook?.url ?? null;

  const memoUrl = page.url ?? "";

  const tags =
    findMultiSelectByExactKey(properties, "タグ") ??
    findMultiSelectByKeyIncludes(properties, ["tag"]) ??
    [];

  const note =
    findByExactKey(properties, "備考") ??
    findByKeyIncludes(properties, ["note", "page", "memo"]) ??
    "";

  return {
    memoTitle,
    bookTitle,
    memoUrl,
    bookUrl,
    tags,
    note,
    bookId
  };
}

export function getRelatedBookPageId(page: NotionPage): string | null {
  const properties = page.properties ?? {};
  const relationByExactKey = findRelationByExactKey(properties, "マルチメディアコンテンツリスト");
  if (relationByExactKey) {
    return relationByExactKey;
  }

  return findRelationByKeyIncludes(properties, ["book", "multimedia", "content", "media"]);
}

function getPropertyByExactKey(
  properties: Record<string, NotionPropertyValue>,
  exactKey: string
): NotionPropertyValue | null {
  for (const [key, value] of Object.entries(properties)) {
    if (key.trim() === exactKey) {
      return value;
    }
  }

  return null;
}

function findByExactKey(
  properties: Record<string, NotionPropertyValue>,
  exactKey: string
): string | null {
  const value = getPropertyByExactKey(properties, exactKey);
  if (!value) {
    return null;
  }

  if (value.type === "title") {
    return extractRichText(value.title);
  }

  if (value.type === "rich_text") {
    return extractRichText(value.rich_text);
  }

  if (value.type === "url") {
    return value.url ?? "";
  }

  return null;
}

function findRelationByExactKey(
  properties: Record<string, NotionPropertyValue>,
  exactKey: string
): string | null {
  const value = getPropertyByExactKey(properties, exactKey);
  if (value?.type !== "relation") {
    return null;
  }

  return (value.relation ?? []).map((item) => item.id ?? "").find(Boolean) ?? null;
}

function findRelationByKeyIncludes(
  properties: Record<string, NotionPropertyValue>,
  candidates: string[]
): string | null {
  for (const [key, value] of Object.entries(properties)) {
    const normalized = key.toLowerCase();
    const match = candidates.some((candidate) => normalized.includes(candidate));
    if (!match || value.type !== "relation") {
      continue;
    }

    return (value.relation ?? []).map((item) => item.id ?? "").find(Boolean) ?? null;
  }

  return null;
}

async function fetchBookReference(bookPageId: string): Promise<BookReference | null> {
  const cached = bookReferenceCache.get(bookPageId);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const page = await notionFetch<NotionPage>(`/pages/${bookPageId}`, {
      method: "GET"
    });

    const properties = page.properties ?? {};
    const title =
      findByPropertyType(properties, "title") ??
      findByKeyIncludes(properties, ["book", "title"]) ??
      "Untitled";

    const reference: BookReference = {
      id: page.id,
      title,
      url: page.url ?? ""
    };

    bookReferenceCache.set(bookPageId, reference);
    return reference;
  } catch {
    bookReferenceCache.set(bookPageId, null);
    return null;
  }
}

function findByPropertyType(properties: Record<string, NotionPropertyValue>, type: "title"): string | null {
  for (const property of Object.values(properties)) {
    if (property.type === type) {
      return extractRichText(property.title);
    }
  }

  return null;
}

function findByKeyIncludes(
  properties: Record<string, NotionPropertyValue>,
  candidates: string[]
): string | null {
  for (const [key, value] of Object.entries(properties)) {
    const normalized = key.toLowerCase();
    const match = candidates.some((candidate) => normalized.includes(candidate));
    if (!match) {
      continue;
    }

    if (value.type === "title") {
      return extractRichText(value.title);
    }

    if (value.type === "rich_text") {
      return extractRichText(value.rich_text);
    }
  }

  return null;
}

function findMultiSelectByKeyIncludes(
  properties: Record<string, NotionPropertyValue>,
  candidates: string[]
): string[] | null {
  for (const [key, value] of Object.entries(properties)) {
    const normalized = key.toLowerCase();
    const match = candidates.some((candidate) => normalized.includes(candidate));

    if (match && value.type === "multi_select") {
      return (value.multi_select ?? []).map((item) => item.name ?? "").filter(Boolean);
    }
  }

  return null;
}

function findMultiSelectByExactKey(
  properties: Record<string, NotionPropertyValue>,
  exactKey: string
): string[] | null {
  const value = getPropertyByExactKey(properties, exactKey);

  if (value?.type === "multi_select") {
    return (value.multi_select ?? []).map((item) => item.name ?? "").filter(Boolean);
  }

  return null;
}

function blockPlainText(block: NotionBlock): string {
  const entry = block[block.type] as { rich_text?: NotionRichText[]; caption?: NotionRichText[]; url?: string } | undefined;
  if (!entry) {
    return "";
  }

  const richText = extractRichText(entry.rich_text);
  const caption = extractRichText(entry.caption);

  if (block.type === "embed" && entry.url) {
    return [richText, caption, entry.url].filter(Boolean).join(" ").trim();
  }

  return [richText, caption].filter(Boolean).join(" ").trim();
}

async function getBlockChildren(blockId: string): Promise<NotionBlock[]> {
  const children: NotionBlock[] = [];
  let cursor: string | null | undefined = null;

  do {
    const query = new URLSearchParams({ page_size: "100" });
    if (cursor) {
      query.set("start_cursor", cursor);
    }

    const response = await notionFetch<NotionBlockChildrenResponse>(`/blocks/${blockId}/children?${query.toString()}`);
    children.push(...(response.results ?? []));
    cursor = response.has_more ? response.next_cursor : null;
  } while (cursor);

  return children;
}

export async function flattenPageContent(pageId: string): Promise<string> {
  const lines: string[] = [];

  async function walk(blockId: string) {
    const blocks = await getBlockChildren(blockId);

    for (const block of blocks) {
      const text = blockPlainText(block);
      if (text) {
        lines.push(text);
      }

      if (block.has_children) {
        await walk(block.id);
      }
    }
  }

  await walk(pageId);

  return lines.join("\n").trim();
}
