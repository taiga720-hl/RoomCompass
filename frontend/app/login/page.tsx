"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginUser } from "../../lib/propertyApi";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(true);
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
      <h1 className="mt-3 font-serif text-3xl text-slate-900">ログイン</h1>
      <p className="mt-3 text-sm text-slate-500">
        ログインして、お気に入りや比較データをユーザー単位で使えるようにします
      </p>

      <form onSubmit={handleSubmit} className="mt-10 space-y-7">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">
            メールアドレス
          </label>
          {/* 枠で囲んだ入力欄ではなく、下線だけのミニマルな見た目にする */}
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
          className="w-full bg-slate-900 py-3.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "ログイン中..." : "ログインする"}
        </button>
      </form>

      <p className="mt-8 text-sm text-slate-500">
        まだ登録していない方は{" "}
        <Link
          href="/register"
          className="font-medium text-slate-900 underline underline-offset-4"
        >
          新規登録へ
        </Link>
      </p>
    </main>
  );
}
