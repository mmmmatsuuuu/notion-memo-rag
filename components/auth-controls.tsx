"use client";

import { useState } from "react";

type AuthControlsProps = {
  isSignedIn: boolean;
  email?: string;
};

export default function AuthControls({
  isSignedIn,
  email
}: AuthControlsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = () => {
    setIsLoading(true);
    window.location.href = "/auth/login";
  };

  const handleLogout = async () => {
    setIsLoading(true);
    await fetch("/auth/logout", { method: "POST" });

    window.location.reload();
  };

  return (
    <section style={{ marginTop: 16, display: "grid", gap: 8 }}>
      <p>
        {isSignedIn
          ? `ログイン中: ${email ?? "(email unknown)"}`
          : "未ログイン"}
      </p>

      {isSignedIn ? (
        <button type="button" onClick={handleLogout} disabled={isLoading}>
          {isLoading ? "処理中..." : "ログアウト"}
        </button>
      ) : (
        <button type="button" onClick={handleGoogleLogin} disabled={isLoading}>
          {isLoading ? "リダイレクト中..." : "Googleでログイン"}
        </button>
      )}
    </section>
  );
}
