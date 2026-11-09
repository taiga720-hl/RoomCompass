"use client";

// 物件を一覧で表示するページ

import { fetchProperties } from "@/lib/propertyApi";
import { PropertyItem } from "@/lib/propertyTypes";
import Link from "next/link";
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
    <main className="mx-auto w-full max-w-5xl px-6 py-16 sm:px-8">
      {/* 小さいラベル+明朝体の見出し(/mainと同じ構成) */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-slate-400">
            RoomCompass
          </p>
          <h1 className="mt-3 font-serif text-3xl text-slate-900">
            物件一覧
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            登録済みの物件を確認できます
          </p>
        </div>

        {/* 再読み込みボタン */}
        <button
          onClick={loadProperties}
          className="text-xs text-slate-400 underline-offset-4 transition hover:text-slate-900 hover:underline"
        >
          再読み込み
        </button>
      </div>

      {/* 状態ごとの表示 */}
      <section className="mt-10">
        {/* 読み込み中 */}
        {/* loadingがTrueのときのみ表示 */}
        {loading && <p className="text-sm text-slate-500">読み込み中...</p>}

        {/* エラー */}
        {/* loadingがFalse∧errorMessagesが存在するときのみ表示 */}
        {!loading && errMessage && (
          <p className="text-sm text-rose-600">{errMessage}</p>
        )}

        {/* 一覧が空の時 */}
        {/* loadingがFalse∧errMessageが存在しない∧propetiesのlength(要素数)が0のときのみ表示 */}
        {!loading && !errMessage && properties.length === 0 && (
          <p className="text-sm text-slate-500">
            まだ物件が登録されていません
          </p>
        )}

        {/* 一覧表示(枠で囲んだ表ではなく、罫線だけで区切る) */}
        {!loading && !errMessage && properties.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400">
                  <th className="py-3 pr-4 text-left font-medium">写真</th>
                  <th className="py-3 pr-4 text-left font-medium">物件名</th>
                  <th className="py-3 pr-4 text-left font-medium">住所</th>
                  <th className="py-3 pr-4 text-right font-medium">家賃</th>
                  <th className="py-3 pr-4 text-right font-medium">面積</th>
                  <th className="py-3 text-right font-medium">駅徒歩分数</th>
                </tr>
              </thead>

              <tbody>
                {/* 配列を1件ずつ描画 */}
                {/*        ↓ propertiesの中身を一件ずつ取り出してる */}
                {/*              ↓ それをpropertyに入れてる */}
                {properties.map((property) => (
                  <tr
                    key={property.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50"
                  >
                    <td className="py-3 pr-4">
                      {property.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={property.image_url}
                          alt={property.name}
                          className="h-12 w-16 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-16 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-400">
                          写真無し
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <Link
                        href={`/properties/${property.id}`}
                        className="font-medium text-slate-900 underline underline-offset-4 hover:text-slate-600"
                      >
                        {property.name}
                      </Link>
                    </td>

                    <td className="py-3 pr-4 text-slate-600">
                      {property.address}
                    </td>
                    <td className="py-3 pr-4 text-right text-slate-600">
                      {property.rent.toLocaleString()}円
                    </td>
                    <td className="py-3 pr-4 text-right text-slate-600">
                      {property.area}㎡
                    </td>
                    <td className="py-3 text-right text-slate-600">
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
