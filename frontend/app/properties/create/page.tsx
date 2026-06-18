"use client";

// 物件を登録するページ

import { createProperty } from "@/lib/propertyApi";
import { PropertyRequest } from "@/lib/propertyTypes";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function Create() {
  const router = useRouter();

  // 物件の型定義と宣言
  const [name, setName] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  // 下3つはnumber型だけど、待機中はstringで待ったほうが安全
  // inputのvalueは文字列として扱うから
  const [rent, setRent] = useState<string>("");
  const [area, setArea] = useState<string>("");
  const [station_minutes, setStation_minutes] = useState<string>("");
  // UI系の宣言
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [isError, setIsError] = useState<boolean>(false);

  // フォーム送信時に呼ばれる関数
  // async：非同期処理
  // awaitのとこで一時停止で、それまでは上から順に処理
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    // ブラウザ標準の再読み込み送信を止める
    e.preventDefault();

    // 処理開始時にUIを初期化
    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      // 文字列を数値へ変換
      const rentNum = Number(rent);
      const areaNum = Number(area);
      const station_minutes_Num = Number(station_minutes);

      // バリデーションチェック
      // trim()で前後の空白を削除
      if (!name.trim()) throw new Error("物件名を入力してください");
      if (!address.trim()) throw new Error("住所を入力してください");
      // NoN：Not a Numberの略
      // Number.isNaN()：数値変換に失敗したか（NaNになったか）を調べる
      if (Number.isNaN(rentNum) || rentNum < 0) {
        throw new Error("家賃は0以上の数値を入力してください");
      }
      if (Number.isNaN(areaNum) || areaNum <= 0) {
        throw new Error("面積は0より大きい数値を入力してください");
      }
      if (Number.isNaN(station_minutes_Num) || station_minutes_Num < 0) {
        throw new Error("駅徒歩分数は0以上の数値を入力してください");
      }

      // APIへ送るデータを型付きで作る
      const payload: PropertyRequest = {
        name: name.trim(),
        address: address.trim(),
        rent: rentNum,
        area: areaNum,
        station_minutes: station_minutes_Num,
      };

      // 登録APIを実行
      await createProperty(payload);

      // 成功時メッセージ
      setMessage("物件を登録しました");
      setIsError(false); // エラー時にTrueになるため今回はFalse

      // 入力欄をクリア
      setName("");
      setAddress("");
      setRent("");
      setArea("");
      setStation_minutes("");

      // 少し待ってから一覧ページに遷移
      // ↑すぐ遷移だとメッセージが見えないため
      setTimeout(() => {
        router.push("/properties");
      }, 700); // 700=0.7秒後
    } catch (error) {
      // 失敗時メッセージ
      setIsError(true);

      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("登録に失敗しました");
      }
    } finally {
      // 成功/失敗に関係なくローディング解除
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      {/* ページ見出し */}
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        物件登録
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        比較したい物件の情報を入力してください
      </p>

      {/* 登録フォーム */}
      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        {/* 物件名 */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">物件名</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            placeholder="例: RoomCompass新宿"
          />
        </div>

        {/* 住所 */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">住所</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            placeholder="例: 東京都新宿区..."
          />
        </div>

        {/* 数値入力3項目を横並び（小画面では縦並び） */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* 家賃 */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">家賃</label>
            <input
              type="number"
              min="0"
              value={rent}
              onChange={(e) => setRent(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              placeholder="120000"
            />
          </div>

          {/* 面積 */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">面積</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              placeholder="28.5"
            />
          </div>

          {/* 駅徒歩 */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">
              駅徒歩(分)
            </label>
            <input
              type="number"
              min="0"
              value={station_minutes}
              onChange={(e) => setStation_minutes(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              placeholder="7"
            />
          </div>
        </div>

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {/* loadingのときは登録中で、じゃないときは登録するを表示 */}
          {loading ? "登録中..." : "登録する"}
        </button>
      </form>

      {/* 結果メッセージ(成功/失敗で色分け) */}
      {message && (
        <p
          className={
            isError
              ? "mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
              : "mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
          }
        >
          {message}
        </p>
      )}
    </main>
  );
}
