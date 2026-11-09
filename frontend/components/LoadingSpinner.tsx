type LoadingSpinnerProps = {
  // スピナーの大きさ(省略時は"md")
  size?: "sm" | "md" | "lg";

  // スピナーの横に添える文字(任意。無ければスピナーだけ表示)
  label?: string;
};

export default function LoadingSpinner({
  size = "md",
  label,
}: LoadingSpinnerProps) {
  // サイズごとにTailwindのクラスを切り替える
  const sizeClass = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-4",
  }[size];

  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {/* 
        回転する丸を作るCSSの定番テクニック:
        円形の枠線(border)を用意して、上の辺(border-t-)だけ違う色にすると
        "切れ目"ができる。それをanimate-spinで回転させると、
        グルグル回るスピナーに見える。
      */}
      <div
        className={`${sizeClass} animate-spin rounded-full border-slate-300 border-t-slate-900`}
      />
      {label && <span className="text-sm text-slate-600">{label}</span>}
    </div>
  );
}
