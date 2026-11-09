"use client";

import { registerUser } from "@/lib/propertyApi";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function Register() {
  // ユーザー関連の定義
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  // UI関連の定義
  const [loading, setLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    // ページリロードを停止
    e.preventDefault();

    setLoading(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      await registerUser({
        name,
        email,
        password,
      });

      setSuccessMessage("ユーザー登録が完了しました");
      // 入力欄をクリア
      setName("");
      setEmail("");
      setPassword("");
    } catch {
      setErrorMessage("ユーザー登録に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-6 py-20 sm:px-8">
      <Link
        href="/main"
        className="text-xs text-slate-400 transition hover:text-slate-900"
      >
        ← メインに戻る
      </Link>

      {/* 小さいラベル+明朝体の見出し(/mainと同じ構成) */}
      <p className="mt-10 text-xs font-medium uppercase tracking-[0.3em] text-slate-400">
        RoomCompass
      </p>
      <h1 className="mt-3 font-serif text-3xl text-slate-900">新規登録</h1>
      <p className="mt-3 text-sm text-slate-500">
        ユーザーを作成して、お気に入りや比較機能を広げられるようにします
      </p>

      <form onSubmit={handleSubmit} className="mt-10 space-y-7">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">
            名前
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full border-b border-slate-300 bg-transparent py-2 text-slate-900 outline-none transition focus:border-slate-900"
            placeholder="田中 太郎"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">
            メールアドレス
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full border-b border-slate-300 bg-transparent py-2 text-slate-900 outline-none transition focus:border-slate-900"
            placeholder="sample@example.com"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">
            パスワード
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full border-b border-slate-300 bg-transparent py-2 text-slate-900 outline-none transition focus:border-slate-900"
            placeholder="6文字以上で入力"
            required
          />
        </div>

        {successMessage && (
          <p className="text-sm font-medium text-emerald-600">
            {successMessage}
          </p>
        )}

        {errorMessage && (
          <p className="text-sm font-medium text-rose-600">{errorMessage}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 py-3.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "登録中..." : "登録する"}
        </button>
      </form>

      <p className="mt-8 text-sm text-slate-500">
        すでに登録済みの方は{" "}
        <Link
          href="/login"
          className="font-medium text-slate-900 underline underline-offset-4"
        >
          ログインへ
        </Link>
      </p>
    </main>
  );
}
