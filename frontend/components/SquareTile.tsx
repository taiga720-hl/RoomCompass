"use client";

import { ReactNode } from "react";

type SquareTileProps = {
  title: string;
  icon: ReactNode;

  // タイルの下に出す小さい説明(件数など)
  badge?: string;

  onClick: () => void;

  // タイルの中にうっすら透けて見える装飾プレビュー(任意)
  preview?: ReactNode;
};

// ノイズ(粒状の質感)をSVGで作って背景に薄く重ねる
// 色を使わずに"チープなAI感"を消して質感を出すための定番テクニック
const NOISE_BG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E";

//* クリックでモーダルを開く正方形タイル
//  色は使わず、白いガラス質感+グレインテクスチャで「作り込まれた」印象を出している
export default function SquareTile({
  title,
  icon,
  badge,
  onClick,
  preview,
}: SquareTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 p-4 text-left backdrop-blur-xl transition-all duration-200 ease-out hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.18)]"
    >
      {/* 粒状のノイズ質感(ごく薄く) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply"
        style={{ backgroundImage: `url("${NOISE_BG}")` }}
      />

      {/* 中身がうっすら透けて見える背景プレビュー(モノトーンで控えめに) */}
      {preview && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-300 opacity-60 blur-[1px] transition-all duration-300 group-hover:opacity-90 group-hover:blur-0">
          {preview}
        </div>
      )}

      {/* 右上→左下の、ごく薄い一方向の光沢 */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/70 via-transparent to-transparent" />

      <div className="relative flex h-full flex-col justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors duration-200 group-hover:border-slate-900 group-hover:bg-slate-900 group-hover:text-white">
          {icon}
        </div>

        <div>
          <p className="text-sm font-semibold tracking-tight text-slate-900">
            {title}
          </p>
          {badge && (
            <p className="mt-0.5 text-xs font-medium text-slate-400">
              {badge}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
