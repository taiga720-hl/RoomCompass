"use client";

//* 物件比較ページ

import {
  addFavorite,
  deleteFavorite,
  fetchProperties,
  getFavorites,
  getRecommend,
  getCompareHistories,
  saveCompareHistory,
  deleteCompareHistory,
} from "@/lib/propertyApi";

import {
  PropertyItem,
  Recommend,
  SaveCompare,
  CompareHistoryResponse,
} from "@/lib/propertyTypes";
import { useEffect, useState, useMemo } from "react";

import PropertyMap from "@/components/PropertyMap";

import Link from "next/link";

export default function CompareProperties() {
  // 比較情報の保存キー
  const compareStorageKey = "roomcompass-compare-conditions";

  // 物件一覧の定義
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  // UI系の定義
  const [loading, setLoading] = useState<boolean>(false);
  const [errMessage, setErrMessage] = useState<string>("");

  // 保存済みのデータがあればそれを読み込む(最初の一回だけ)
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

  // 検索・絞り込み用の定義
  // 物件名・住所をまとめて検索するための文字列
  const [keyword, setKeyword] = useState<string>("");

  // 家賃の上限
  const [maxRentFilter, setMaxRentFilter] = useState<string>("");
  // 面積の下限
  const [minAreaFilter, setMinAreaFilter] = useState<string>("");
  // 駅徒歩分数の上限
  const [maxStationFilter, setMaxStationFilter] = useState<string>("");

  // お気に入り機能の定義
  // お気に入りにした物件IDの配列
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);

  // お気に入り物件のみ表示用
  const [favoriteOnly, setFavoriteOnly] = useState<boolean>(false);

  // ログイン中ユーザーID
  const [userId, setUserId] = useState<number | null>(null);

  // localStorage復元が終わる前に保存effectが走ると上書きするためガードする
  const [isRestoreDone, setIsRestoreDone] = useState<boolean>(false);

  // 比較一覧履歴
  const [histories, setHistories] = useState<CompareHistoryResponse[]>([]);

  // 履歴保存中フラグ ← 連打防止とボタン表示切り替え用
  const [savingHistory, setSavingHistory] = useState<boolean>(false);

  // 履歴に関するメッセージ
  const [historyMessage, setHistoryMessage] = useState<string>("");

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

  //* 初回表示時に1回だけ取得(loadPropertiesとほぼ同じ)
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

  //* 初回マウント後にlocalStorageから比較条件とユーザーを復元
  useEffect(() => {
    let cancelled = false;

    async function restoreFromLocalStorage() {
      if (typeof window === "undefined") {
        return;
      }

      try {
        const rawCompare = window.localStorage.getItem(compareStorageKey);
        if (rawCompare) {
          const prev = JSON.parse(rawCompare) as SaveCompare;

          if (!cancelled) {
            setSelectedIds(
              Array.isArray(prev.selectedIds) ? prev.selectedIds : [],
            );
            setRentWeight(
              typeof prev.rentWeight === "number" ? prev.rentWeight : 40,
            );
            setAreaWeight(
              typeof prev.areaWeight === "number" ? prev.areaWeight : 30,
            );
            setStationWeight(
              typeof prev.stationWeight === "number" ? prev.stationWeight : 30,
            );
            setPreset(
              typeof prev.preset === "string" || prev.preset === null
                ? prev.preset
                : null,
            );
            setKeyword(typeof prev.keyword === "string" ? prev.keyword : "");
            setMaxRentFilter(
              typeof prev.maxRentFilter === "string" ? prev.maxRentFilter : "",
            );
            setMinAreaFilter(
              typeof prev.minAreaFilter === "string" ? prev.minAreaFilter : "",
            );
            setMaxStationFilter(
              typeof prev.maxStationFilter === "string"
                ? prev.maxStationFilter
                : "",
            );
            setFavoriteOnly(
              typeof prev.favoriteOnly === "boolean"
                ? prev.favoriteOnly
                : false,
            );
          }
        }
      } catch {
        // 復元失敗時はデフォルト値で継続
      }

      try {
        const rawUser = window.localStorage.getItem("roomcompass-user");
        if (!cancelled) {
          if (!rawUser) {
            setUserId(null);
          } else {
            const parsedUser = JSON.parse(rawUser);
            setUserId(
              typeof parsedUser?.userId === "number" ? parsedUser.userId : null,
            );
          }
        }
      } catch {
        if (!cancelled) {
          setUserId(null);
        }
      }

      if (!cancelled) {
        setIsRestoreDone(true);
      }
    }

    restoreFromLocalStorage();

    return () => {
      cancelled = true;
    };
  }, [compareStorageKey]);

  //* ログイン中ユーザーのお気に入りをAPIから取得
  useEffect(() => {
    if (userId === null) return;

    const currentUserId = userId;

    let cancelled = false;

    async function loadFavorites() {
      try {
        // backendから該当ユーザーのお気に入り一覧を取得
        const favorites = await getFavorites(currentUserId);

        if (!cancelled) {
          // property_id だけ抜き出して compare 側の favoriteIds に反映
          setFavoriteIds(favorites.map((item) => item.property_id));
        }
      } catch {
        if (!cancelled) {
          setErrMessage("お気に入り一覧の取得に失敗しました");
          setFavoriteIds([]);
        }
      }
    }

    loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  //* ログイン中ユーザーの比較履歴をAPIから取得
  useEffect(() => {
    if (userId === null) return;

    const currentUserId = userId;
    let cancelled = false;

    async function loadHistories() {
      try {
        const data = await getCompareHistories(currentUserId);
        if (!cancelled) {
          setHistories(data);
        }
      } catch {
        if (!cancelled) {
          setHistoryMessage("比較履歴の取得に失敗しました");
        }
      }
    }

    loadHistories();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  //* 比較条件保存用
  // useEffect(() => {
  //  やりたい処理
  // }, [依存配列]);
  useEffect(() => {
    if (!isRestoreDone) return;

    // 1つのオブジェクトにまとめる(オブジェクト：関連するデータをひとまとめにしたもの)
    const nowCompare: SaveCompare = {
      selectedIds,
      rentWeight,
      areaWeight,
      stationWeight,
      preset,
      keyword,
      maxRentFilter,
      minAreaFilter,
      maxStationFilter,
      favoriteOnly,
    };

    window.localStorage.setItem(compareStorageKey, JSON.stringify(nowCompare));
  }, [
    //! この下の依存配列の値が変化した時に実行
    selectedIds,
    rentWeight,
    areaWeight,
    stationWeight,
    preset,
    keyword,
    maxRentFilter,
    minAreaFilter,
    maxStationFilter,
    favoriteOnly,
    isRestoreDone,
  ]);

  //* チェック切り替え処理
  // number型のidを引数として受け取る
  function checkProperty(id: number) {
    // prevSelectedIdsは今既に選ばれてるIDたち
    setSelectedIds((prevSelectedIds) => {
      //? includes()：配列のなかに既に存在しているか調べる
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

  //* お気に入り追加・削除機能(API版)
  async function toggleFavorite(propertyId: number) {
    // ログインしていない場合は操作不可
    if (userId === null) {
      setErrMessage("お気に入り機能はログイン後に利用できます");
      return;
    }

    const alreadyFavorite = favoriteIds.includes(propertyId);

    try {
      if (alreadyFavorite) {
        // 既に登録済みなら削除
        await deleteFavorite(userId, propertyId);

        // 画面状態も更新
        setFavoriteIds((prev) => prev.filter((id) => id !== propertyId));
      } else {
        // 未登録なら追加
        await addFavorite({
          user_id: userId,
          property_id: propertyId,
        });

        // 画面状態も更新
        setFavoriteIds((prev) => [...prev, propertyId]);
      }
    } catch {
      setErrMessage("お気に入り更新に失敗しました");
    }
  }

  //* 現在の比較条件を履歴として保存
  async function saveCurrentCompare() {
    // 未ログイン時の処理
    if (userId === null) {
      setHistoryMessage("比較履歴の保存はログイン後に利用できます");
      return;
    }

    setSavingHistory(true);
    setHistoryMessage("");

    try {
      const saved = await saveCompareHistory({
        user_id: userId,
        selected_ids: selectedIds,
        rent_weight: rentWeight,
        area_weight: areaWeight,
        station_weight: stationWeight,
        preset,
        // 空文字は保存する意味が薄いのでnullに寄せる
        keyword: keyword || null,
        max_rent_filter: maxRentFilter || null,
        min_area_filter: minAreaFilter || null,
        max_station_filter: maxStationFilter || null,
        favorite_only: favoriteOnly,
      });

      // 一覧を取り直さず、新しい履歴を先頭に追加してすぐ画面に反映
      setHistories((prev) => [saved, ...prev]);
      setHistoryMessage("比較条件を保存しました");
    } catch {
      setHistoryMessage("比較条件の保存に失敗しました");
    } finally {
      setSavingHistory(false);
    }
  }

  //* 履歴を選んで比較条件を復元
  function loadHistory(history: CompareHistoryResponse) {
    setSelectedIds(history.selected_ids);
    setRentWeight(history.rent_weight);
    setAreaWeight(history.area_weight);
    setStationWeight(history.station_weight);
    setPreset(history.preset);
    setKeyword(history.keyword ?? "");
    setMaxRentFilter(history.max_rent_filter ?? "");
    setMinAreaFilter(history.min_area_filter ?? "");
    setMaxStationFilter(history.max_station_filter ?? "");
    setFavoriteOnly(history.favorite_only);

    setHistoryMessage("比較条件を読み込みました");
  }

  //* 履歴を削除
  async function removeHistory(historyId: number) {
    if (userId === null) return;

    try {
      await deleteCompareHistory(historyId, userId);
      setHistories((prev) => prev.filter((item) => item.id !== historyId));
    } catch {
      setHistoryMessage("比較履歴の削除に失敗しました");
    }
  }

  //* 検索・絞り込み後の物件一覧
  //? useMemo()を使うことで...↓
  //? 検索条件が変わった時だけ物件一覧を再検索し、それ以外は前回の結果を再利用できる
  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      // キーボードを小文字にして比較しやすくする
      const normalizedKeyword = keyword.trim().toLowerCase();

      // 物件名と住所をまとめて検索対象にする
      const matchesKeyword =
        normalizedKeyword === "" ||
        property.name.toLowerCase().includes(normalizedKeyword) ||
        property.address.toLowerCase().includes(normalizedKeyword);

      // 家賃上限フィルタ
      const matchesMaxRent =
        maxRentFilter === "" || property.rent <= Number(maxRentFilter);

      // 面積下限フィルタ
      const matchesMinArea =
        minAreaFilter === "" || property.area >= Number(minAreaFilter);

      // 駅徒歩上限フィルタ
      const matchesMaxStation =
        maxStationFilter === "" ||
        property.station_minutes <= Number(maxStationFilter);

      // お気に入りフィルタ
      const matchesFavorite =
        !favoriteOnly || favoriteIds.includes(property.id);

      // 全条件を満たすものだけ残す
      return (
        matchesKeyword &&
        matchesMaxRent &&
        matchesMinArea &&
        matchesMaxStation &&
        matchesFavorite
      );
    });
  }, [
    properties,
    keyword,
    maxRentFilter,
    minAreaFilter,
    maxStationFilter,
    favoriteOnly,
    favoriteIds,
  ]);

  //* 選択済み物件のみ抜き出す
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

      {/* 未ログイン時のバナー */}
      {userId === null && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          お気に入り・比較履歴の保存はログイン後に利用できます。{" "}
          <Link href="/login" className="font-medium underline">
            ログインする
          </Link>
        </div>
      )}

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

        {/* 検索・絞り込みフォーム */}
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-slate-900">
            検索・絞り込み
          </p>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {/* キーワード検索 */}
            <label className="block text-sm text-slate-700">
              キーワード
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="物件名・住所で検索"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </label>

            {/* 家賃上限 */}
            <label className="block text-sm text-slate-700">
              家賃上限
              <input
                type="number"
                value={maxRentFilter}
                onChange={(e) => setMaxRentFilter(e.target.value)}
                placeholder="例: 80000"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </label>

            {/* 面積下限 */}
            <label className="block text-sm text-slate-700">
              面積下限
              <input
                type="number"
                value={minAreaFilter}
                onChange={(e) => setMinAreaFilter(e.target.value)}
                placeholder="例: 25"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </label>

            {/* 駅徒歩上限 */}
            <label className="block text-sm text-slate-700">
              駅徒歩上限
              <input
                type="number"
                value={maxStationFilter}
                onChange={(e) => setMaxStationFilter(e.target.value)}
                placeholder="例: 10"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </label>
          </div>

          {/* お気に入り物件のみ表示用 */}
          <div className="mt-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                //? checked：チェックボックス専用の属性
                checked={favoriteOnly}
                onChange={(e) => setFavoriteOnly(e.target.checked)}
                className="h-4 w-4"
              />
              お気に入りのみ表示
            </label>
          </div>

          {/* 条件リセットボタン */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                setKeyword("");
                setMaxRentFilter("");
                setMinAreaFilter("");
                setMaxStationFilter("");
                setFavoriteOnly(false);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              条件をリセット
            </button>
          </div>
        </div>

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

        {/* 検索条件に一致する物件がないとき */}
        {!loading &&
          !errMessage &&
          properties.length > 0 &&
          filteredProperties.length === 0 && (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              条件に一致する物件が見つかりません
            </p>
          )}

        {!loading && !errMessage && filteredProperties.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProperties.map((property) => {
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

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        //? labelで囲まれてるのでチェックボックスまで作動してしまう可能性がある
                        //! → preventDefault()でクリック連動を止める
                        e.preventDefault();
                        toggleFavorite(property.id);
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                        favoriteIds.includes(property.id)
                          ? "border-amber-300 bg-amber-50 text-amber-700"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {favoriteIds.includes(property.id)
                        ? "お気に入り削除"
                        : "お気に入り追加"}
                      {/* ?がTrueのとき、:がFlaseのとき */}
                    </button>
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

        {/* 比較履歴 */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">比較履歴</p>
            <button
              type="button"
              onClick={saveCurrentCompare}
              disabled={savingHistory}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {savingHistory ? "保存中..." : "現在の条件を保存"}
            </button>
          </div>

          {historyMessage && (
            <p className="mt-2 text-xs text-slate-500">{historyMessage}</p>
          )}

          {userId === null && (
            <p className="mt-3 text-sm text-slate-500">
              比較履歴の保存・閲覧はログイン後に利用できます
            </p>
          )}

          {userId !== null && histories.length === 0 && (
            <p className="mt-3 text-sm text-slate-500">
              保存された履歴はまだありません
            </p>
          )}

          {userId !== null && histories.length > 0 && (
            <ul className="mt-3 space-y-2">
              {histories.map((history) => (
                <li
                  key={history.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-800">
                      {history.preset ?? "カスタム調整"} ・ 物件
                      {history.selected_ids.length}件
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(history.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => loadHistory(history)}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      読み込む
                    </button>
                    <button
                      type="button"
                      onClick={() => removeHistory(history.id)}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                    >
                      削除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 地図から物件を選ぶ */}
        {filteredProperties.length > 0 && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-slate-900">
              地図から選ぶ(緑ピン: 選択中 / 赤ピン: 未選択、クリックで切り替え)
            </p>
            <PropertyMap
              properties={filteredProperties}
              selectedIds={selectedIds}
              onToggleProperty={checkProperty}
            />
          </div>
        )}

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
