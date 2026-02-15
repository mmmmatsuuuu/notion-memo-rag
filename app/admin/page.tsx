import AdminSyncClient from "../../components/admin-sync-client";
import Link from "next/link";

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

      <AdminSyncClient />
    </main>
  );
}
