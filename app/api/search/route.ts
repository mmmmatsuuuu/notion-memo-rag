import { NextResponse } from "next/server";
import { isAllowedEmail } from "../../../lib/auth/allowed-email";
import { createClient } from "../../../lib/supabase/server";

type SearchRequestBody = {
  contextText?: unknown;
  topK?: unknown;
};

type MockSearchResult = {
  id: string;
  memoUrl: string;
  bookId: string;
  bookTitle: string;
  bookUrl: string;
  tags: string[];
  note: string;
  preview: string;
  scholarQueries: string[];
};

const DEFAULT_TOP_K = 6;

const mockSearchResults: MockSearchResult[] = [
  {
    id: "mock-memo-1",
    memoUrl: "https://www.notion.so/mock-memo-1",
    bookId: "book-001",
    bookTitle: "思考の整理学",
    bookUrl: "https://example.com/books/001",
    tags: ["思考法", "メタ認知"],
    note: "p.44",
    preview:
      "行き詰まりは思考不足ではなく、寝かせる時間の不足で起こる。問いを寝かせると再結合が起きる。",
    scholarQueries: [
      "incubation effect creative problem solving",
      "memory consolidation and insight",
      "reflection and cognition"
    ]
  },
  {
    id: "mock-memo-2",
    memoUrl: "https://www.notion.so/mock-memo-2",
    bookId: "book-002",
    bookTitle: "知的生産の技術",
    bookUrl: "https://example.com/books/002",
    tags: ["読書術", "メモ"],
    note: "p.118",
    preview:
      "要約は削る作業ではなく判断軸を抽出する作業。記録で終わらせず次の行動単位に変換する。",
    scholarQueries: [
      "active reading note-taking strategy",
      "decision making and summarization",
      "external cognition"
    ]
  },
  {
    id: "mock-memo-3",
    memoUrl: "https://www.notion.so/mock-memo-3",
    bookId: "book-003",
    bookTitle: "Lean Analytics",
    bookUrl: "https://example.com/books/003",
    tags: ["MVP", "指標"],
    note: "p.76",
    preview:
      "初期プロダクトは指標を絞るほど学習が速い。網羅性よりも次の改善に直結する信号を選ぶ。",
    scholarQueries: [
      "one metric that matters startup",
      "lean experimentation product teams",
      "north star metric"
    ]
  },
  {
    id: "mock-memo-4",
    memoUrl: "https://www.notion.so/mock-memo-4",
    bookId: "book-004",
    bookTitle: "実践デザイン思考",
    bookUrl: "https://example.com/books/004",
    tags: ["UX", "問い"],
    note: "p.201",
    preview:
      "インタビューは質問内容より順序が重要。具体行動から入り、抽象化は最後に回す。",
    scholarQueries: [
      "contextual inquiry user research",
      "question order effects",
      "retrospective bias interview"
    ]
  },
  {
    id: "mock-memo-5",
    memoUrl: "https://www.notion.so/mock-memo-5",
    bookId: "book-005",
    bookTitle: "構造化文章術",
    bookUrl: "https://example.com/books/005",
    tags: ["文章", "論理展開"],
    note: "p.52",
    preview:
      "伝わる文章は語彙ではなく接続の設計で決まる。主張・根拠・具体例の最小ループを守る。",
    scholarQueries: [
      "argument structure writing clarity",
      "cognitive load technical writing",
      "discourse coherence"
    ]
  },
  {
    id: "mock-memo-6",
    memoUrl: "https://www.notion.so/mock-memo-6",
    bookId: "book-006",
    bookTitle: "The Effective Engineer",
    bookUrl: "https://example.com/books/006",
    tags: ["開発生産性", "優先順位"],
    note: "p.139",
    preview:
      "曖昧タスクは先送りされる。完了条件と依存を明確化するとチームの実行速度が上がる。",
    scholarQueries: [
      "task clarity software productivity",
      "goal specificity execution speed",
      "coordination cost engineering teams"
    ]
  }
];

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

  let body: SearchRequestBody;

  try {
    body = (await request.json()) as SearchRequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (typeof body.contextText !== "string" || body.contextText.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "contextText_required" }, { status: 400 });
  }

  const requestedTopK = typeof body.topK === "number" ? body.topK : undefined;
  const results = mockSearchResults.slice(0, DEFAULT_TOP_K);

  return NextResponse.json({
    ok: true,
    mode: "mock",
    topK: DEFAULT_TOP_K,
    requestedTopK,
    resultCount: results.length,
    contextTextLength: body.contextText.trim().length,
    results
  });
}
