import AuthControls from "../components/auth-controls";
import FixedLogoutButton from "../components/fixed-logout-button";
import { createClient } from "../lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams: Promise<{ auth_error?: string }>;
};

type MockMemo = {
  id: string;
  bookTitle: string;
  memoUrl: string;
  tags: string[];
  note: string;
  preview: string;
  scholarQueries: string[];
};

const mockResults: MockMemo[] = [
  {
    id: "memo-1",
    bookTitle: "思考の整理学",
    memoUrl: "https://www.notion.so/memo-1",
    tags: ["思考法", "メタ認知"],
    note: "p.44",
    preview:
      "行き詰まった状態は、思考が不足しているのではなく、寝かせる時間が不足している可能性が高い。短期記憶に貼り付いたままのメモは、別視点の接続が起こりにくい。いったん問題を離れて歩く、別の本を挟む、問いの主語を変える。これらは逃避ではなく、構造化のための操作だ。",
    scholarQueries: [
      "incubation effect creative problem solving",
      "memory consolidation and insight",
      "note-taking reflection and cognition"
    ]
  },
  {
    id: "memo-2",
    bookTitle: "知的生産の技術",
    memoUrl: "https://www.notion.so/memo-2",
    tags: ["読書術", "メモ"],
    note: "p.118",
    preview:
      "要約は内容を削る作業ではなく、判断軸を抽出する作業である。どの文を残すかより、なぜその文が意思決定に寄与するかを先に明確にする。メモは記録で終わらせず、次の行動に変換できる単位にする。",
    scholarQueries: [
      "knowledge work summarization decision making",
      "active reading note-taking strategy",
      "external cognition and personal knowledge management"
    ]
  },
  {
    id: "memo-3",
    bookTitle: "Lean Analytics",
    memoUrl: "https://www.notion.so/memo-3",
    tags: ["MVP", "指標"],
    note: "p.76",
    preview:
      "初期プロダクトでは、測る指標を増やすほど意思決定が遅くなる。チームで一つの指標に焦点を当て、仮説検証サイクルを短くすることで、解像度の高い学習が得られる。重要なのは網羅性ではなく、次の改善に直結する信号の強さだ。",
    scholarQueries: [
      "one metric that matters startup",
      "lean experimentation product teams",
      "north star metric and growth"
    ]
  },
  {
    id: "memo-4",
    bookTitle: "実践デザイン思考",
    memoUrl: "https://www.notion.so/memo-4",
    tags: ["UX", "問い"],
    note: "p.201",
    preview:
      "ユーザーインタビューの失敗は質問の粗さではなく、聞く順序の粗さで起きる。最初に課題を尋ねると一般論が返る。最初に最近の具体行動を聞くと文脈が立ち上がる。抽象は最後に回すことで、記憶の捏造を減らせる。",
    scholarQueries: [
      "retrospective bias in interviews",
      "contextual inquiry user research",
      "question order effects qualitative research"
    ]
  },
  {
    id: "memo-5",
    bookTitle: "構造化文章術",
    memoUrl: "https://www.notion.so/memo-5",
    tags: ["文章", "論理展開"],
    note: "p.52",
    preview:
      "読者に伝わらない文章は、語彙の問題より接続詞の設計不足である。結論と理由の距離が長いほど、読み手は推測コストを払う。主張、根拠、具体例を最小ループで回し、段落ごとに問いに答える構造を守る。",
    scholarQueries: [
      "argument structure writing clarity",
      "coherence and discourse markers",
      "cognitive load in technical writing"
    ]
  },
  {
    id: "memo-6",
    bookTitle: "The Effective Engineer",
    memoUrl: "https://www.notion.so/memo-6",
    tags: ["開発生産性", "優先順位"],
    note: "p.139",
    preview:
      "重要だが曖昧なタスクは着手されにくい。逆に、重要で具体化されたタスクは自然に進む。タスク定義時点で完了条件と依存を明示し、実行前の不確実性を下げることが、個人の生産性よりチームの速度に効く。",
    scholarQueries: [
      "task clarity and software team productivity",
      "goal specificity execution speed",
      "coordination cost in engineering teams"
    ]
  }
];

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const authError = params.auth_error;
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  const isSignedIn = Boolean(user);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10 pb-44">
      <p className="text-sm font-medium tracking-[0.18em] text-[var(--ink-muted)] uppercase">
        Notion Memo RAG
      </p>
      <h1
        className="mt-2 text-3xl leading-tight md:text-4xl"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        思考支援用メモ検索のMVP
      </h1>
      <p className="mt-4 max-w-3xl text-[var(--ink-muted)]">
        このアプリは「答えを作る」ためではなく、関連メモ断片への最短導線を作るためのRAGです。
      </p>
      {authError ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {authError === "forbidden_email"
            ? "ログインエラー: 許可されていないメールアドレスです。"
            : `ログインエラー: ${authError}`}
        </p>
      ) : null}
      <AuthControls isSignedIn={isSignedIn} />
      {isSignedIn ? <FixedLogoutButton /> : null}

      {isSignedIn ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">検索結果（モック）</h2>
          <div className="mt-3 grid gap-4">
            {mockResults.map((memo) => (
              <article
                key={memo.id}
                className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <a
                    href="#"
                    className="font-semibold text-[var(--accent)] underline decoration-1 underline-offset-3"
                  >
                    {memo.bookTitle}
                  </a>
                  <a href={memo.memoUrl} className="text-[var(--ink-muted)] underline">
                    memo_url
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
                  <p className="text-xs font-semibold text-[var(--ink-muted)]">
                    一次資料クエリ候補
                  </p>
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
      ) : (
        <section className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <p className="text-sm text-[var(--ink-muted)]">
            ログイン後、この画面に検索結果カードと下部ツールバーが表示されます。
          </p>
        </section>
      )}

      {isSignedIn ? (
        <footer className="fixed right-0 bottom-0 left-0 border-t border-[var(--line)] bg-[#fffcf2]/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-end">
            <div className="flex-1">
              <label htmlFor="context" className="text-xs font-semibold text-[var(--ink-muted)]">
                文脈入力
              </label>
              <textarea
                id="context"
                className="mt-1 h-20 w-full rounded-xl border border-[var(--line)] bg-white p-3 text-sm outline-none ring-[var(--accent)] focus:ring-2"
                placeholder="今考えている課題、仮説、問いを入力..."
                defaultValue="新しい機能を作るとき、調査と実装の切り替えで迷って進行が遅くなる。過去メモから、意思決定を速くする運用ルールを探したい。"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="h-11 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white"
              >
                Search (topK=6)
              </button>
              <Link
                href="/admin"
                className="inline-flex h-11 items-center rounded-full border border-[var(--accent)] bg-white px-5 text-sm font-semibold text-[var(--accent)]"
              >
                /admin
              </Link>
            </div>
          </div>
        </footer>
      ) : null}
    </main>
  );
}
