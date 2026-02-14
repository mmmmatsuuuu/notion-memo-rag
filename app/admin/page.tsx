import Link from "next/link";

const mockFailedIds = [
  "8f2cae6f9d2c4d55b7f1a12c9f9a301e",
  "a4e29ebf00f1418bb4d9b09821cc8e67"
];

export default function AdminPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1
          className="text-3xl md:text-4xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Sync Admin
        </h1>
        <Link
          href="/"
          className="rounded-full border border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-sm"
        >
          ← Home
        </Link>
      </div>

      <section className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm">
        <h2 className="text-lg font-semibold">手動同期</h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          MVP仕様: バックグラウンドジョブなし。必要時に手動実行。
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white"
          >
            Sync latest 50
          </button>
          <button
            type="button"
            className="rounded-full border border-[var(--accent)] bg-white px-5 py-2 text-sm font-semibold text-[var(--accent)]"
          >
            Sync latest 200
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm">
        <h2 className="text-lg font-semibold">同期結果（モック）</h2>
        <dl className="mt-3 grid gap-3 rounded-xl border border-[var(--line)] bg-white p-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-[var(--ink-muted)]">取得件数</dt>
            <dd className="mt-1 text-xl font-semibold">50</dd>
          </div>
          <div>
            <dt className="text-[var(--ink-muted)]">更新件数</dt>
            <dd className="mt-1 text-xl font-semibold">42</dd>
          </div>
          <div>
            <dt className="text-[var(--ink-muted)]">失敗件数</dt>
            <dd className="mt-1 text-xl font-semibold text-red-600">2</dd>
          </div>
        </dl>

        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4">
          <h3 className="text-sm font-semibold text-red-700">失敗ID</h3>
          <ul className="mt-2 space-y-1 text-xs text-red-700">
            {mockFailedIds.map((id) => (
              <li key={id} className="font-mono">
                {id}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
