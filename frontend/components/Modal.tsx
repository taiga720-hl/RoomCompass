"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

type ModalProps = {
  // 開いているかどうか
  open: boolean;

  // 閉じる時に呼ばれる関数(背景クリック・×ボタン共通)
  onClose: () => void;

  title: string;
  icon?: ReactNode;
  children: ReactNode;

  // モーダルの横幅("md"が通常、"lg"は物件一覧など中身が多い時用)
  size?: "md" | "lg";
};

// サイズごとの最大横幅クラス
const SIZE_CLASS = {
  md: "max-w-2xl",
  lg: "max-w-5xl",
};

//* 画面中央にふわっと拡大表示されるモーダル
export default function Modal({
  open,
  onClose,
  title,
  icon,
  children,
  size = "md",
}: ModalProps) {
  // モーダルが開いている間は、背景のページがスクロールしないようにする
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    // ページを離れる時などに、念のため元に戻す
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div
      // 閉じてる間はpointer-events-noneにして、透明なまま裏側のクリックを邪魔しないようにする
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {/* 背景の半透明+ぼかし(クリックで閉じる) */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 中身のパネル本体。scaleとopacityを同時に動かすことで「ふわっと拡大」する動きになる */}
      <div
        className={`relative flex max-h-[85vh] w-full ${SIZE_CLASS[size]} flex-col overflow-hidden rounded-2xl bg-white shadow-xl transition-all duration-300 ${
          open ? "scale-100 opacity-100" : "scale-90 opacity-0"
        }`}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            {icon && <span className="text-slate-400">{icon}</span>}
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* スクロールする中身エリア */}
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
