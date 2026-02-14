"use client";

import { useState } from "react";

type AuthControlsProps = {
  isSignedIn: boolean;
};

export default function AuthControls({ isSignedIn }: AuthControlsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = () => {
    setIsLoading(true);
    window.location.href = "/auth/login";
  };

  if (isSignedIn) {
    return null;
  }

  return (
    <section className="mt-4 grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <p className="text-sm text-[var(--ink-muted)]">未ログイン</p>
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="w-fit rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isLoading ? "リダイレクト中..." : "Googleでログイン"}
      </button>
    </section>
  );
}
