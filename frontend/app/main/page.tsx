"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

//* localStorageに保存されてるユーザー型
type LocalStorageUser = {
  userId: number;
  name: string;
  email: string;
};

export default function MainPage() {
  const router = useRouter();

  // ログイン中ユーザー情報
  // ログアウトなどもできるようにnullでログイン中か未ログインかを判定
  const [user, setUser] = useState<LocalStorageUser | null>(null);

  // localStorageからログイン状態を復元
  useEffect(() => {
    async function restoreFromLocalStorage() {
      const raw = window.localStorage.getItem("roomcompass-user");
      if (!raw) {
        return;
      }

      try {
        const parsed = JSON.parse(raw);
        if (
          // LocalStorageUserと同じ型になるかここでチェック
          typeof parsed?.userId === "number" &&
          typeof parsed?.name === "string" &&
          typeof parsed?.email === "string"
        ) {
          setUser(parsed);
        }
      } catch {
        // 壊れたデータが入ってた場合は未ログイン扱い
      }
    }

    restoreFromLocalStorage();
  }, []);

  //* ログアウト処理
  function handleLogout() {
    //? removeItem：保存されてるデータを削除する関数
    window.localStorage.removeItem("roomcompass-user");
    setUser(null); // ← nullにすることで未ログインにできる
    router.push("/");
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">メインメニュー</h1>
          <p className="mt-2 text-slate-600">次の操作を選んでください</p>
        </div>

        {/* ログイン状態表示エリア */}
        {user ? (
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-700">
              ようこそ、<span className="font-semibold">{user.name}</span>さん
            </p>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              ログアウト
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">未ログイン</p>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/properties/create"
          className="rounded-xl border border-slate-200 bg-white p-5 hover:bg-slate-50"
        >
          <p className="font-semibold text-slate-900">物件を登録する</p>
          <p className="mt-1 text-sm text-slate-600">
            比較したい物件情報を追加します
          </p>
        </Link>

        <Link
          href="/properties"
          className="rounded-xl border border-slate-200 bg-white p-5 hover:bg-slate-50"
        >
          <p className="font-semibold text-slate-900">物件一覧を見る</p>
          <p className="mt-1 text-sm text-slate-600">
            登録済みデータを確認します
          </p>
        </Link>

        <Link
          href="/compare"
          className="rounded-xl border border-slate-200 bg-white p-5 hover:bg-slate-50"
        >
          <p className="font-semibold text-slate-900">物件を比較する</p>
          <p className="mt-1 text-sm text-slate-600">
            登録済みの物件を比較します
          </p>
        </Link>

        {/* ログイン済みの時は新規登録・ログインの導線を隠す(もう使わないため) */}
        {!user && (
          <>
            <Link
              href="/register"
              className="rounded-xl border border-slate-200 bg-white p-5 hover:bg-slate-50"
            >
              <p className="font-semibold text-slate-900">新規登録</p>
              <p className="mt-1 text-sm text-slate-600">
                ユーザーを作成します
              </p>
            </Link>

            <Link
              href="/login"
              className="rounded-xl border border-slate-200 bg-white p-5 hover:bg-slate-50"
            >
              <p className="font-semibold text-slate-900">ログイン</p>
              <p className="mt-1 text-sm text-slate-600">
                登録済みユーザーでログインします
              </p>
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
