"use client";

// 物件を一覧で表示するページ

import { fetchProperties } from "@/lib/propertyApi";
import { PropertyItem } from "@/lib/propertyTypes";
import { useEffect, useState } from "react";

export default function PropertiesList() {
  // 物件一覧の定義
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  // UI系の定義
  const [loading, setLoading] = useState<boolean>(true);
  const [errMessage, setErrMessage] = useState<string>("");

  // 一覧取得処理
  async function loadProperties() {
    // 読み込み開始
    setLoading(true);

    // 前回エラーを初期化
    setErrMessage("");

    try {
      // APIからデータ取得
      const data = await fetchProperties();

      // 成功時に一覧を更新
      setProperties(data);
    } catch (error) {
      // 失敗時にエラーメッセージを表示
      if (error instanceof Error) {
        setErrMessage(error.message);
      } else {
        setErrMessage("物件一覧の取得に失敗しました");
      }
    } finally {
      // 成功/失敗どちらでも読み込み終了
      setLoading(false);
    }
  }

  // 初回表示時に1回だけ取得(loadPropertiesとほぼ同じ)
  useEffect(() => {
    let cancelled = false;

    async function loadInitialProperties() {
      try {
        const data = await fetchProperties();
        if (!cancelled) {
          setProperties(data);
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof Error) {
            setErrMessage(error.message);
          } else {
            setErrMessage("物件一覧の取得に失敗しました");
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInitialProperties();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      {/* ページタイトル */}
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        物件一覧
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        登録済みの物件を確認できます
      </p>

      {/* 再読み込みボタン */}
      <div className="mt-4">
        <button
          //         ↓一覧取得関数
          onClick={loadProperties}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          再読み込み
        </button>
      </div>

      {/* 状態ごとの表示 */}
      <section className="mt-6">
        {/* 読み込み中 */}
        {/* loadingがTrueのときのみ表示 */}
        {loading && (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            読み込み中
          </p>
        )}

        {/* エラー */}
        {/* loadingがFalse∧errorMessagesが存在するときのみ表示 */}
        {!loading && errMessage && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errMessage}
          </p>
        )}

        {/* 一覧が空の時 */}
        {/* loadingがFalse∧errMessageが存在しない∧propetiesのlength(要素数)が0のときのみ表示 */}
        {!loading && !errMessage && properties.length === 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            まだ物件が登録されていません
          </p>
        )}

        {/* 一覧表示 */}
        {!loading && !errMessage && properties.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left">物件名</th>
                  <th className="px-3 py-2 text-left">住所</th>
                  <th className="px-3 py-2 text-right">家賃</th>
                  <th className="px-3 py-2 text-right">面積</th>
                  <th className="px-3 py-2 text-right">駅徒歩分数</th>
                </tr>
              </thead>

              <tbody>
                {/* 配列を1件ずつ描画 */}
                {/*        ↓ propertiesの中身を一件ずつ取り出してる */}
                {/*              ↓ それをpropertyに入れてる */}
                {properties.map((property) => (
                  <tr key={property.id} className="border-t border-slate-200">
                    <td className="px-3 py-2">{property.name}</td>
                    <td className="px-3 py-2">{property.address}</td>
                    <td className="px-3 py-2 text-right">
                      {property.rent.toLocaleString()}円
                    </td>
                    <td className="px-3 py-2 text-right">{property.area}㎡</td>
                    <td className="px-3 py-2 text-right">
                      {property.station_minutes}分
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
