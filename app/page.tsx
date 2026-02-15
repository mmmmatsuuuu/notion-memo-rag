import AuthControls from "../components/auth-controls";
import FixedLogoutButton from "../components/fixed-logout-button";
import SearchClient from "../components/search-client";
import { createClient } from "../lib/supabase/server";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams: Promise<{ auth_error?: string }>;
};

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
        <SearchClient defaultContextText="新しい機能を作るとき、調査と実装の切り替えで迷って進行が遅くなる。過去メモから、意思決定を速くする運用ルールを探したい。" />
      ) : (
        <section className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <p className="text-sm text-[var(--ink-muted)]">
            ログイン後、この画面に検索結果カードと下部ツールバーが表示されます。
          </p>
        </section>
      )}
    </main>
  );
}
