"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchPropertyById,
  getPropertyReviews,
  upsertPropertyReview,
  deletePropertyReview,
} from "@/lib/propertyApi";
import { PropertyItem, PropertyReviewResponse } from "@/lib/propertyTypes";

//* URLの /properties/〇〇 の 〇〇 を取り出して使う
//  URLの[id]部分がparamsとして渡される(Next.jsではPromiseで渡される)
export default function PropertyDetailPage({
  // ここにはURLのidが入る
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  //? use()：Promiseの中身を取り出すためのReactの新しいフック
  const { id } = use(params);
  const propertyId = Number(id);

  const [property, setProperty] = useState<PropertyItem | null>(null);
  const [reviews, setReviews] = useState<PropertyReviewResponse[]>([]);

  // ログイン中ユーザーID
  const [userId, setUserId] = useState<number | null>(null);

  // 星評価
  const [starInput, setStarInput] = useState<number>(5);
  // 口コミコメント
  const [commentInput, setCommentInput] = useState<string>("");

  // UI系
  const [loading, setLoading] = useState<boolean>(true);
  const [posting, setPosting] = useState<boolean>(false);
  const [errMessage, setErrMessage] = useState<string>("");

  // ログイン中ユーザーIDをlocalStorageから復元
  useEffect(() => {
    async function restoreUser() {
      const raw = window.localStorage.getItem("roomcompass-user");
      if (!raw) return;

      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.userId === "number") {
          setUserId(parsed.userId);
        }
      } catch {
        // 壊れたデータが入ってた場合は未ログイン扱いのまま
      }
    }

    restoreUser();
  }, []);

  // 物件情報とクチコミ一覧を取得
  async function loadData() {
    try {
      const [propertyData, reviewData] = await Promise.all([
        fetchPropertyById(propertyId),
        getPropertyReviews(propertyId),
      ]);
      setProperty(propertyData);
      setReviews(reviewData);
    } catch {
      setErrMessage("物件情報の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function load() {
      await loadData();
    }

    load();
    // propertyIdが変わらない限り1回だけでよいので、依存配列は空でOK
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 自分が既に投稿したクチコミ(あれば編集フォームの初期値に使う)
  const myReview = reviews.find((r) => r.user_id === userId);

  useEffect(() => {
    function sync() {
      if (myReview) {
        setStarInput(myReview.star);
        setCommentInput(myReview.comment);
      }
    }

    sync();
  }, [myReview]);

  // 平均評価を計算
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.star, 0) / reviews.length
      : 0;

  // クチコミ投稿・編集
  async function handleSubmitReview() {
    if (userId === null) return;

    if (commentInput.trim() === "") {
      setErrMessage("コメントを入力してください");
      return;
    }

    setPosting(true);
    setErrMessage("");

    try {
      await upsertPropertyReview(propertyId, {
        user_id: userId,
        property_id: propertyId,
        star: starInput,
        comment: commentInput.trim(),
      });

      // 投稿後に一覧を取り直して画面に反映
      const reviewData = await getPropertyReviews(propertyId);
      setReviews(reviewData);
    } catch {
      setErrMessage("クチコミの投稿に失敗しました");
    } finally {
      setPosting(false);
    }
  }

  // クチコミ削除
  async function handleDeleteReview() {
    if (userId === null) return;

    try {
      await deletePropertyReview(propertyId, userId);
      const reviewData = await getPropertyReviews(propertyId);
      setReviews(reviewData);
      setCommentInput("");
      setStarInput(5);
    } catch {
      setErrMessage("クチコミの削除に失敗しました");
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-16 sm:px-8">
        <p className="text-sm text-slate-500">読み込み中...</p>
      </main>
    );
  }

  if (!property) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-16 sm:px-8">
        <p className="text-sm text-rose-600">物件が見つかりませんでした</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 sm:px-8">
      <Link
        href="/properties"
        className="text-xs text-slate-400 transition hover:text-slate-900"
      >
        ← 物件一覧に戻る
      </Link>

      {/* 物件情報 */}
      <div className="mt-6">
        {property.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={property.image_url}
            alt={property.name}
            className="h-64 w-full rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-64 w-full items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-400">
            写真無し
          </div>
        )}

        <p className="mt-6 text-xs font-medium uppercase tracking-[0.3em] text-slate-400">
          RoomCompass
        </p>
        <h1 className="mt-3 font-serif text-3xl text-slate-900">
          {property.name}
        </h1>
        <p className="mt-2 text-sm text-slate-500">{property.address}</p>

        {/* 平均評価 */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-base font-semibold text-amber-500">
            ★ {averageRating.toFixed(1)}
          </span>
          <span className="text-sm text-slate-400">
            ({reviews.length}件のクチコミ)
          </span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-y-3 border-t border-slate-200 py-6 text-sm text-slate-700 sm:grid-cols-3">
          <p>家賃: {property.rent.toLocaleString()}円</p>
          <p>面積: {property.area}㎡</p>
          <p>駅徒歩: {property.station_minutes}分</p>
          {property.age_years !== null && <p>築年数: {property.age_years}年</p>}
          {property.structure !== null && <p>構造: {property.structure}</p>}
        </div>
      </div>

      {errMessage && (
        <p className="mt-4 text-sm text-rose-600">{errMessage}</p>
      )}

      {/* クチコミ投稿フォーム */}
      <div className="border-t border-slate-200 pt-8">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {myReview ? "自分のクチコミを編集" : "クチコミを投稿"}
        </p>

        {userId === null ? (
          <p className="mt-3 text-sm text-slate-500">
            クチコミの投稿はログイン後に利用できます。{" "}
            <Link
              href="/login"
              className="font-medium text-slate-900 underline underline-offset-4"
            >
              ログインする
            </Link>
          </p>
        ) : (
          <>
            {/* 星評価の選択(1〜5の★ボタンを並べる) */}
            <div className="mt-4 flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setStarInput(star)}
                  className={`text-2xl transition ${
                    star <= starInput ? "text-amber-500" : "text-slate-200"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="この物件についての感想を書いてください"
              rows={3}
              className="mt-4 w-full border-b border-slate-300 bg-transparent py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            />

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={posting}
                className="bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
              >
                {posting ? "送信中..." : myReview ? "更新する" : "投稿する"}
              </button>

              {myReview && (
                <button
                  type="button"
                  onClick={handleDeleteReview}
                  className="text-sm text-rose-600 underline-offset-4 hover:underline"
                >
                  削除する
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* クチコミ一覧 */}
      <div className="mt-10 border-t border-slate-200 pt-8">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          クチコミ一覧
        </p>

        {reviews.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            まだクチコミがありません
          </p>
        ) : (
          <ul className="mt-2">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="border-t border-slate-100 py-5 first:border-t-0"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-900">
                    {review.user_name}
                  </p>
                  <p className="text-amber-500">{"★".repeat(review.star)}</p>
                </div>
                <p className="mt-1.5 text-sm text-slate-600">
                  {review.comment}
                </p>
                <p className="mt-1.5 text-xs text-slate-400">
                  {new Date(review.created_at).toLocaleDateString("ja-JP")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
