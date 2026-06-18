"use client";

import Link from "next/link";

export default function TopPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold text-slate-900">RoomCompass</h1>
      <p className="mt-3 text-slate-600">
        住まい候補を登録・一覧・比較できるアプリです
      </p>

      <div className="mt-8">
        <Link
          href="/main"
          className="inline-flex rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
        >
          メインへ進む
        </Link>
      </div>
    </main>
  );
}
