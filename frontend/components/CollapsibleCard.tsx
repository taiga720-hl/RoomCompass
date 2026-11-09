"use client";

import { ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";

type CollapsibleCardProps = {
  // カードのタイトル
  title: string;

  // タイトルの左に置く小さいアイコン(任意)
  icon?: ReactNode;

  // タイトルの右に置く小さいラベル(例: "3件選択中")
  badge?: string;

  // 初期状態で開いているかどうか(省略時は閉じた状態)
  defaultOpen?: boolean;

  // 開いた時に表示する中身
  children: ReactNode;
};

//* クリックで開閉するカード
//  CSSのgrid-template-rowsを 0fr ⇔ 1fr で切り替えることで、
//  中身の高さをJSで測らなくても滑らかに開閉アニメーションできる(モダンブラウザの定番テクニック)
export default function CollapsibleCard({
  title,
  icon,
  badge,
  defaultOpen = false,
  children,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* ヘッダー部分(クリックで開閉) */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <span className="flex items-center gap-2">
          {icon && <span className="text-slate-400">{icon}</span>}
          <span className="text-sm font-semibold text-slate-900">{title}</span>
          {badge && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {badge}
            </span>
          )}
        </span>

        <ChevronDown
          size={18}
          className={`shrink-0 text-slate-400 transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* 中身部分: grid-template-rowsのアニメーションで開閉する */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        {/* overflow-hiddenが無いと、閉じている間も中身がはみ出て見えてしまう */}
        <div className="overflow-hidden">
          {/* 開閉に合わせてふわっと浮かび上がるように、透明度と位置も一緒にアニメーションさせる */}
          <div
            className={`border-t border-slate-100 px-4 py-4 transition-all duration-300 ${
              open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
