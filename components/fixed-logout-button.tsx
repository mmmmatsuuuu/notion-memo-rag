"use client";

import { useState } from "react";

export default function FixedLogoutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    await fetch("/auth/logout", { method: "POST" });
    window.location.reload();
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      className="fixed top-4 right-4 z-50 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-md disabled:opacity-50"
    >
      {isLoading ? "処理中..." : "ログアウト"}
    </button>
  );
}
