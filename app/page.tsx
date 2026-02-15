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
        <SearchClient defaultContextText="" />
      ) : null}
    </main>
  );
}
