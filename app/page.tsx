import AuthControls from "../components/auth-controls";
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

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Notion Memo RAG</h1>
      <p>Google OAuth login test page</p>
      {authError ? (
        <p style={{ color: "red" }}>ログインエラー: {authError}</p>
      ) : null}
      <AuthControls isSignedIn={Boolean(user)} email={user?.email} />
    </main>
  );
}
