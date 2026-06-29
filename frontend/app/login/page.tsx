"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginUser } from "../../lib/propertyApi";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setErrorMessage("");

    try {
      const result = await loginUser({
        email,
        password,
      });

      localStorage.setItem(
        "roomcompass-user",
        JSON.stringify({
          userId: result.user_id,
          name: result.name,
          email: result.email,
        }),
      );

      router.push("/main");
    } catch {
      setErrorMessage("メールアドレスまたはパスワードが違います");
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

      <h1 className="text-2xl font-bold text-slate-900">ログイン</h1>
      <p className="mt-2 text-slate-600">
        ログインして、お気に入りや比較データをユーザー単位で使えるようにします
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6"
      >
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
            placeholder="パスワードを入力"
            required
          />
        </div>

        {errorMessage && (
          <p className="text-sm font-medium text-rose-600">{errorMessage}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "ログイン中..." : "ログインする"}
        </button>
      </form>

      <div className="mt-6 text-sm text-slate-600">
        まだ登録していない方は{" "}
        <Link href="/register" className="font-medium text-slate-900 underline">
          新規登録へ
        </Link>
      </div>
    </main>
  );
}
