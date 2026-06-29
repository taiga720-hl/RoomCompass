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
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <div className="mb-6">
        <Link
          href="/main"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← メインに戻る
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-slate-900">新規登録</h1>
      <p className="mt-2 text-slate-600">
        ユーザーを作成して、お気に入りや比較機能を広げられるようにします
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6"
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            名前
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
            placeholder="田中 太郎"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            メールアドレス
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
            placeholder="sample@example.com"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            パスワード
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
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
          className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "登録中..." : "登録する"}
        </button>
      </form>

      <div className="mt-6 text-sm text-slate-600">
        すでに登録済みの方は{" "}
        <Link href="/login" className="font-medium text-slate-900 underline">
          ログインへ
        </Link>
      </div>
    </main>
  );
}
