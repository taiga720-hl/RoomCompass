"use client";

//* 物件比較ページ

import { fetchProperties, getRecommend } from "@/lib/propertyApi";

import { PropertyItem, Recommend } from "@/lib/propertyTypes";
import { useEffect, useState } from "react";

export default function CompareProperties() {
  // 物件一覧の定義
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  // UI系の定義
  const [loading, setLoading] = useState<boolean>(false);
  const [errMessage, setErrMessage] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // 重みの定義
  // 何を重視するかをユーザーが操作できるようにする
  const [rentWeight, setRentWeight] = useState<number>(40);
  const [areaWeight, setAreaWeight] = useState<number>(30);
  const [stationWeight, setStationWeight] = useState<number>(30);

  // どれ重視かのプリセットの定義
  //                                    ↓ これは型はstringかnullのどっちかという意味
  const [preset, setPreset] = useState<string | null>(null);

  // リコメンドの定義
  // Record<Number, boolean>：キーが物件ID、値がリコメンドが開いてるかの型定義
  // これで物件ごとの状態管理をできる
  //                                                 ↓キー    ↓値
  const [recommend, setRecommend] = useState<Record<number, boolean>>({});
  // ↑booleanだけだと、全カードが一緒に開閉したりするので、IDごとの状態も必要！

  // リコメンド関連の定義
  // 実データ
  const [recommendData, setRecommendData] = useState<Record<number, Recommend>>(
    {},
  );
  // 今どの物件のリコメンドを読み込み中かの保持
  const [loadingRecommend, setLoadingRecommend] = useState<number | null>(null);
  // リコメンド取得失敗のエラー
  const [recommendError, setRecommendError] = useState<Record<number, string>>(
    {},
  );

  //* 一覧取得関数
  async function loadProperties() {
    setLoading(true);
    setErrMessage("");

    try {
      const data = await fetchProperties();
      setProperties(data);
    } catch (error) {
      if (error instanceof Error) {
        setErrMessage(error.message);
      } else {
        setErrMessage("物件一覧の取得に失敗しました");
      }
    } finally {
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

  //* チェック切り替え処理
  // number型のidを引数として受け取る
  function checkProperty(id: number) {
    // prevSelectedIdsは今既に選ばれてるIDたち
    setSelectedIds((prevSelectedIds) => {
      // includes()：配列のなかに既に存在しているか調べる
      // 今回は、既に選ばれてるIDたちの中にidが含まれてるか
      const alreadySelected = prevSelectedIds.includes(id);

      // alreadySelectedがTrueの時は実行(→既に含まれてる)
      if (alreadySelected) {
        return prevSelectedIds.filter((selectedIds) => selectedIds !== id);
      }

      // 未選択なら追加
      return [...prevSelectedIds, id];
    });
  }

  // 選択済み物件のみ抜き出す
  // filter：条件に合う要素だけを残して新しい配列を作るメソッド
  // 配列.filter((要素) => 条件)
  const selectedProperties = properties.filter((property) =>
    selectedIds.includes(property.id),
  );

  //* レコメンドを開閉する関数(選択したものだけfalse⇔trueするだけ)
  // propertyIdはどの物件IDを受け取るかを格納する引数
  async function toggleRecommend(propertyId: number) {
    // recommendはnumber, booleanで構成されてるので、
    // ここではpropertyIDをキーにとして、開閉状態を取得してる
    const isOpen = recommend[propertyId];
    //    ↑開閉状態

    // すでに開いているなら閉じる
    if (isOpen) {
      setRecommend((prev) => ({
        // 前の状態の保持
        ...prev,
        [propertyId]: false, // falseにして閉じる
      }));
      return;
    }

    // 閉じてるなら開く
    setRecommend((prev) => ({
      ...prev,
      [propertyId]: true, // 開ける
    }));

    // まだデータを持ってないときのみAPI呼ぶ
    // キーにpropertyIDを渡して、値があるかチェック(!なので今回はないとき)
    if (!recommendData[propertyId]) {
      await loadRecommend(propertyId);
    }
  }

  //* backendからおすすめ理由を取得する関数
  async function loadRecommend(propertyId: number) {
    // 物件のエラー表示を消す
    setRecommendError((prev) => {
      const next = { ...prev };
      delete next[propertyId];
      return next;
    });

    // 今どの物件を読み込み中か
    setLoadingRecommend(propertyId);

    try {
      // backendAPIを呼び出す
      const data = await getRecommend({
        propertyId,
        rentWeight,
        areaWeight,
        stationWeight,
      });

      // 取得したrecommendationを物件IDごとに保存
      setRecommendData((prev) => ({
        ...prev,
        [propertyId]: data,
      }));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "おすすめ理由の取得に失敗しました";

      setRecommendError((prev) => ({
        ...prev,
        [propertyId]: message,
      }));
    } finally {
      // 成功失敗どちらでも解除
      setLoadingRecommend(null);
    }
  }

  //* 比較対象データの範囲

  // 何も選ばれてない時の安全な初期値を決める
  // nullにしとくと、「まだ計算できない」状態を明確にできる
  // 再代入するためにlet使用
  let minRent: number | null = null;
  let maxRent: number | null = null;

  let minArea: number | null = null;
  let maxArea: number | null = null;

  let minStation: number | null = null;
  let maxStation: number | null = null;

  // selectedPropetiesが一件以上のときに計算
  if (selectedProperties.length > 0) {
    // 計算用の家賃
    const rents = selectedProperties.map((p) => p.rent);

    // 計算用の面積
    const areas = selectedProperties.map((p) => p.area);

    // 計算用の駅徒歩分数
    const stations = selectedProperties.map((p) => p.station_minutes);

    // それぞれ min/max を計算
    // Math.min：最小値を返す
    // Math.max：最大値を返す
    //                  ↓ 配列をそのまま渡せないので...rentsで渡せる！
    minRent = Math.min(...rents);
    maxRent = Math.max(...rents);

    minArea = Math.min(...areas);
    maxArea = Math.max(...areas);

    minStation = Math.min(...stations);
    maxStation = Math.max(...stations);
  }

  //* 値の正規化関数
  // 0~100の値に変換する
  function normalizeNum(
    value: number,
    min: number,
    max: number,
    reverse: boolean, // 小さいほど高得点にするかどうか→Trueだと小さいほど高得点
    // 返り値をnumber型にする
  ): number {
    // 全件同値なら比較できないので100点にする
    // 下のratioで0/0になってエラーになるのを防ぐため
    if (min === max) return 100;

    // ratioは比率という意味
    const ratio = (value - min) / (max - min); // 0~1の範囲
    const score = ratio * 100; // 0~100の範囲

    // reverse=trueは小さいほど高得点
    return reverse ? 100 - score : score;
  }

  //* 各項目のスコアをまとめて返す関数
  function returnScore(property: PropertyItem) {
    // 比較対象がない/計算不可なら0
    if (
      minRent === null ||
      maxRent === null ||
      minArea === null ||
      maxArea === null ||
      minStation === null ||
      maxStation === null
    ) {
      return {
        rentScore: 0,
        areaScore: 0,
        stationScore: 0,
      };
    }

    const rentScore = normalizeNum(property.rent, minRent, maxRent, true); // trueなので安いほど高い
    const areaScore = normalizeNum(property.area, minArea, maxArea, false); // 広いほど高い
    const stationScore = normalizeNum(
      property.station_minutes,
      minStation,
      maxStation,
      true,
    ); // 短いほど高い

    return {
      rentScore,
      areaScore,
      stationScore,
    };
  }

  //* 総合スコア計算関数
  function totalScore(property: PropertyItem): number {
    // 比較対象がない/計算不可なら0
    if (
      minRent === null ||
      maxRent === null ||
      minArea === null ||
      maxArea === null ||
      minStation === null ||
      maxStation === null
    ) {
      return 0;
    }

    // 1個上のreturnScoreから各項目の値を再利用
    const { rentScore, areaScore, stationScore } = returnScore(property);

    const totalWeight = rentWeight + areaWeight + stationWeight;
    if (totalWeight === 0) return 0;

    const weighted =
      rentScore * rentWeight +
      areaScore * areaWeight +
      stationScore * stationWeight;

    return weighted / totalWeight;
  }

  //* 重視プリセット適用関数
  //      　↓ applyは適用という意味
  function applyPreset(
    presetName: string,
    rent: number,
    area: number,
    station: number,
  ) {
    // 3つの重みを更新する
    setRentWeight(rent);
    setAreaWeight(area);
    setStationWeight(station);

    // どのプリセットを選択したか保存
    setPreset(presetName);
  } //? このままだと、プリセット選択と自分で重み付けが被るとエラーになる
  //  ! 重みのスライダーを触ったら、presetをnullにする！ → HtMLの各選択スライダーでできる

  //* スコア付き配列
  const scoredProperties = selectedProperties
    .map((property) => ({
      ...property,
      totalScore: totalScore(property),
    }))
    .sort((a, b) => b.totalScore - a.totalScore);

  //* グラフ表示用のスコア付き配列
  const chartProperties = scoredProperties.map((property) => {
    const { rentScore, areaScore, stationScore } = returnScore(property);

    return {
      ...property,
      rentScore,
      areaScore,
      stationScore,
    };
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      {/* ページタイトル */}
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        物件比較
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        比較したい物件を選択してください
      </p>

      {/* 再読み込みボタン */}
      <div className="mt-4">
        <button
          onClick={loadProperties}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          再読み込み
        </button>
      </div>

      {/* 一覧表示エリア */}
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">物件一覧</h2>

        {/* 読み込み中 */}
        {loading && (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            読み込み中...
          </p>
        )}

        {/* エラー */}
        {!loading && errMessage && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errMessage}
          </p>
        )}

        {/* データなし */}
        {!loading && !errMessage && properties.length === 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            比較できる物件がまだありません
          </p>
        )}

        {!loading && !errMessage && properties.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => {
              const isSelected = selectedIds.includes(property.id);

              return (
                <label
                  key={property.id}
                  className={`cursor-pointer rounded-xl border p-4 shadow-sm transition ${
                    isSelected
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {property.name}
                      </p>
                      {/*                                        ↓ line-clamp-1は一行目を超えてからは...で省略される */}
                      <p className="mt-1 text-sm text-slate-600 line-clamp-1">
                        {property.address}
                      </p>
                    </div>

                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => checkProperty(property.id)}
                      className="mt-1 h-4 w-4"
                    />
                  </div>

                  <div className="mt-4 space-y-1 text-sm text-slate-700">
                    <p>家賃: {property.rent.toLocaleString()}円</p>
                    <p>面積: {property.area}㎡</p>
                    <p>駅徒歩: {property.station_minutes}分</p>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </section>

      {/* 比較結果エリア */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">比較結果</h2>

        {/* 重み調整UI */}
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-slate-900">重み調整</p>

          <div className="space-y-3 text-sm">
            {/* 重視プリセット */}
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-slate-500">
                価値観プリセット
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset("通勤重視", 20, 20, 60)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    preset === "通勤重視"
                      ? "bg-slate-900 text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  通勤重視
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset("家賃重視", 60, 20, 20)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    preset === "家賃重視"
                      ? "bg-slate-900 text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  家賃重視
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset("広さ重視", 20, 60, 20)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    preset === "広さ重視"
                      ? "bg-slate-900 text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  広さ重視
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset("バランス重視", 34, 33, 33)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    preset === "バランス重視"
                      ? "bg-slate-900 text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  バランス重視
                </button>
              </div>
            </div>

            {/* プリセットかカスタム調整かどちらを反映してるか表示 */}
            <p className="mb-3 text-xs text-slate-500">
              {preset
                ? `現在の比較モード： ${preset}`
                : "現在の比較モード： カスタム調整"}
            </p>

            <label className="block">
              家賃重視: {rentWeight}
              <input
                type="range"
                min={0}
                max={100}
                value={rentWeight}
                onChange={(e) => {
                  setRentWeight(Number(e.target.value));
                  setPreset(null); // nullにしてプリセットとの重複を防ぐ
                }}
                className="mt-1 w-full"
              />
            </label>

            <label className="block">
              面積重視: {areaWeight}
              <input
                type="range"
                min={0}
                max={100}
                value={areaWeight}
                onChange={(e) => {
                  setAreaWeight(Number(e.target.value));
                  setPreset(null);
                }}
                className="mt-1 w-full"
              />
            </label>

            <label>
              駅徒歩分数重視: {stationWeight}
              <input
                type="range"
                min={0}
                max={100}
                value={stationWeight}
                onChange={(e) => {
                  setStationWeight(Number(e.target.value));
                  setPreset(null);
                }}
                className="mt-1 w-full"
              />
            </label>
          </div>
        </div>

        {/* 総合スコアのグラフ */}
        {scoredProperties.length > 0 && ( // 選択中の物件が一件以上の時の処理
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">
              総合スコア比較
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              重み付けに応じて、各物件の総合スコアを可視化しています
            </p>

            <div className="mt-4 space-y-4">
              {chartProperties.map((property, index) => (
                // ↓ mapで生成する時は必ずキーがいる
                <div key={property.id}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-slate-700">
                      {index + 1}位: {property.name}
                      {/* indexは0始まりなので+1で増やしてく */}
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      {property.totalScore.toFixed(1)}点
                      {/* toFixed(1)は小数点一桁にフォーマットするメソッド */}
                    </p>
                  </div>

                  {/* 横棒グラフ本体 */}
                  <div className="h-3 rounded-full bg-slate-100">
                    <div
                      className={`h-3 rounded-full ${
                        // 1位の物件のみ緑、それ以外はグレー
                        index === 0 ? "bg-emerald-500" : "bg-slate-500"
                      }`}
                      style={{ width: `${property.totalScore}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 何も選ばれていないとき */}
        {selectedProperties.length === 0 && (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            比較したい物件を選択してください
          </p>
        )}

        {/* 選ばれた物件を横並び表示 */}
        {selectedProperties.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {chartProperties.map((property, index) => {
              return (
                // 1位のときだけUIを変える!
                <div
                  key={property.id}
                  className={`rounded-xl border bg-white p-4 shadow-sm ${
                    index === 0 // index === 0：1位  index !== 0：2位以下
                      ? "border-emerald-400 bg-emerald-50/40"
                      : "border-slate-200"
                  }`}
                >
                  <p className="text-base font-semibold text-slate-900">
                    {property.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 line-clamp-1">
                    {property.address}
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    総合スコア: {property.totalScore.toFixed(1)}
                  </p>

                  <div className="mt-4 space-y-2 text-sm text-slate-700">
                    <p>家賃: {property.rent.toLocaleString()}円</p>
                    <p>面積: {property.area}㎡</p>
                    <p>駅徒歩: {property.station_minutes}分</p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                    <p>赤: 家賃スコア</p>
                    <p>青: 面積スコア</p>
                    <p>黄: 駅徒歩スコア</p>
                  </div>

                  {/* 各項目スコアのミニグラフ */}
                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                        <span>家賃スコア</span>
                        <span>{property.rentScore.toFixed(1)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-rose-400"
                          style={{ width: `${property.rentScore}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                        <span>面積スコア</span>
                        <span>{property.areaScore.toFixed(1)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-sky-400"
                          style={{ width: `${property.areaScore}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                        <span>駅徒歩スコア</span>
                        <span>{property.stationScore.toFixed(1)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-amber-400"
                          style={{ width: `${property.stationScore}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* リコメンド開閉ボタン */}
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => toggleRecommend(property.id)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {recommend[property.id]
                        ? "おすすめ理由を閉じる"
                        : "おすすめ理由を見る"}
                    </button>

                    {/* リコメンド欄 */}
                    {recommend[property.id] && (
                      <div className="mt-3 h-45 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 ">
                        <p className="text-sm font-semibold text-emerald-900">
                          おすすめ理由
                        </p>

                        {/* 読み込み中ならローディング */}
                        {loadingRecommend === property.id && (
                          <p className="mt-2 text-sm text-emerald-800">
                            おすすめ理由を取得中...
                          </p>
                        )}

                        {/* エラー有るなら表示 */}
                        {recommendError[property.id] && (
                          <p className="mt-2 text-sm text-rose-700">
                            {recommendError[property.id]}
                          </p>
                        )}

                        {/* recommendationが取れていたら、レコメンドと理由を表示 */}
                        {recommendData[property.id] && (
                          <>
                            <p className="mt-2 text-sm text-emerald-800">
                              {recommendData[property.id].recommend}
                            </p>

                            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-emerald-900">
                              {recommendData[property.id].reasons.map(
                                (reason, reasonIndex) => (
                                  <li
                                    key={`${property.id}-reason-${reasonIndex}`}
                                  >
                                    {reason}
                                  </li>
                                ),
                              )}
                            </ul>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
