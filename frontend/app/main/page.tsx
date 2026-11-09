"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

//* localStorageに保存されてるユーザー型
type LocalStorageUser = {
  userId: number;
  name: string;
  email: string;
};

//* メニュー1件分のデータ型
type MenuItem = {
  number: string;
  title: string;
  description: string;
  href: string;
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

  // メニュー本体(番号付きの一覧として表示する)
  const menuItems: MenuItem[] = [
    {
      number: "01",
      title: "物件を登録する",
      description: "比較したい物件情報を追加します",
      href: "/properties/create",
    },
    {
      number: "02",
      title: "物件一覧を見る",
      description: "登録済みデータを確認します",
      href: "/properties",
    },
    {
      number: "03",
      title: "物件を比較する",
      description: "登録済みの物件を比較します",
      href: "/compare",
    },
    {
      number: "04",
      title: "AIに物件相談する",
      description: "AIに物件について質問できます",
      href: "/chat",
    },
    {
      number: "05",
      title: "内見予定を管理する",
      description: "カレンダーで内見の予定を登録・確認できます",
      href: "/schedule",
    },
    {
      number: "06",
      title: "メッセージ",
      description: "他のユーザーとDM・グループチャットができます",
      href: "/messages",
    },
  ];

  // 未ログインの時だけ追加する項目(新規登録・ログイン)
  const guestItems: MenuItem[] = [
    {
      number: "07",
      title: "新規登録",
      description: "ユーザーを作成します",
      href: "/register",
    },
    {
      number: "08",
      title: "ログイン",
      description: "登録済みユーザーでログインします",
      href: "/login",
    },
  ];

  const visibleItems = user ? menuItems : [...menuItems, ...guestItems];

  return (
    <main className="mx-auto w-full max-w-3xl px-6 pb-24 pt-20 sm:px-8">
      {/* 小さいラベル(雑誌のノド見出しのようなイメージ) */}
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-slate-400">
        RoomCompass
      </p>

      {/* ログイン状態の表示エリア */}
      <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-5">
        {user ? (
          <p className="text-sm text-slate-500">
            ようこそ、
            <span className="font-medium text-slate-900">{user.name}</span>
            さん
          </p>
        ) : (
          <p className="text-sm text-slate-400">未ログイン</p>
        )}

        {user && (
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-slate-400 underline-offset-4 transition hover:text-slate-900 hover:underline"
          >
            ログアウト
          </button>
        )}
      </div>

      {/* メニュー一覧(番号付きの、罫線だけで区切るエディトリアルなリスト) */}
      <ul className="mt-4 border-b border-slate-200">
        {visibleItems.map((item) => (
          <li key={item.href} className="border-t border-slate-200">
            <Link
              href={item.href}
              className="group flex items-center justify-between gap-6 border-l-2 border-transparent py-6 pl-4 transition-all duration-150 hover:border-slate-900 hover:bg-slate-100"
            >
              <div className="flex items-baseline gap-5 sm:gap-8">
                {/* 番号(細めのグレーで控えめに) */}
                <span className="font-serif text-sm text-slate-300">
                  {item.number}
                </span>

                <div>
                  <p className="text-base font-medium text-slate-900 sm:text-lg">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* 矢印アイコン(ホバーで少し右に動く) */}
              <ArrowRight
                size={18}
                className="shrink-0 text-slate-300 transition-all duration-200 group-hover:translate-x-1 group-hover:text-slate-900"
              />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
