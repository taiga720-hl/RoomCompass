"use client";

// 物件を登録するページ

import { createProperty, reverseGeocode } from "@/lib/propertyApi";
import { PropertyRequest } from "@/lib/propertyTypes";
import { getCloudinaryUrl } from "@/lib/cloudinary";
import LocationPicker from "@/components/LocationPicker";
import { useRouter } from "next/navigation";
import React, { FormEvent, useState } from "react";

// 下線だけのシンプルな入力欄・セレクトに共通で使うクラス
const FIELD_CLASS =
  "mt-2 w-full border-b border-slate-300 bg-transparent py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900";

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
  const [ageYears, setAgeYears] = useState<string>("");
  const [structure, setStructure] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null); // File：ユーザーが選択したファイルを表すオブジェクト
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
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

      let ageYearsNum: number | null = null;
      if (ageYears.trim() !== "") {
        ageYearsNum = Number(ageYears);
        if (Number.isNaN(ageYearsNum) || ageYearsNum < 0) {
          throw new Error("築年数は0以上の数値を入力してください");
        }
      }

      // 画像が選択されていればCloudinaryにアップロードしてURL取得
      let imageUrl: string | null = null;
      if (imageFile) {
        setUploadingImage(true);
        try {
          imageUrl = await getCloudinaryUrl(imageFile);
        } catch {
          throw new Error("画像のアップロードに失敗しました");
        } finally {
          setUploadingImage(false);
        }
      }

      // APIへ送るデータを型付きで作る
      const payload: PropertyRequest = {
        name: name.trim(),
        address: address.trim(),
        rent: rentNum,
        area: areaNum,
        station_minutes: station_minutes_Num,
        age_years: ageYearsNum,
        structure: structure === "" ? null : structure,
        image_url: imageUrl,
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
      setAgeYears("");
      setStructure("");
      setImageFile(null);
      setImagePreviewUrl("");

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

  //* 画像ファイルが選択されたときの処理
  //? React.ChangeEvent<HTMLInputElement>：inputタグの値が変わったときのイベント
  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    //? URL.createObjectURL：選択したファイルをブラウザ内だけで一時的に表示するためのURL
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  //* 地図をクリックした時の処理
  async function handleSelectLocation(lat: number, lng: number) {
    try {
      const result = await reverseGeocode(lat, lng);
      setAddress(result.address);
    } catch {
      setMessage("この地点の住所取得に失敗しました。住所を手入力してください");
      setIsError(true);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16 sm:px-8">
      {/* 小さいラベル+明朝体の見出し(/mainと同じ構成) */}
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-slate-400">
        RoomCompass
      </p>
      <h1 className="mt-3 font-serif text-3xl text-slate-900">物件登録</h1>
      <p className="mt-3 text-sm text-slate-500">
        比較したい物件の情報を入力してください
      </p>

      {/* 登録フォーム(枠で囲まず、罫線区切りで項目を並べる) */}
      <form onSubmit={handleSubmit} className="mt-10 space-y-8">
        {/* 物件名 */}
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
            物件名
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={FIELD_CLASS}
            placeholder="例: RoomCompass新宿"
          />
        </div>

        {/* 住所 */}
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
            住所
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            className={FIELD_CLASS}
            placeholder="例: 東京都新宿区..."
          />
        </div>

        {/* 地図から選ぶ */}
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
            地図から選ぶ(クリックで住所欄に自動入力されます)
          </label>
          <div className="mt-2">
            <LocationPicker onSelectLocation={handleSelectLocation} />
          </div>
        </div>

        {/* 数値入力3項目を横並び（小画面では縦並び） */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-3">
          {/* 家賃 */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
              家賃
            </label>
            <input
              type="number"
              min="0"
              value={rent}
              onChange={(e) => setRent(e.target.value)}
              required
              className={FIELD_CLASS}
              placeholder="120000"
            />
          </div>

          {/* 面積 */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
              面積
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              required
              className={FIELD_CLASS}
              placeholder="28.5"
            />
          </div>

          {/* 駅徒歩 */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
              駅徒歩(分)
            </label>
            <input
              type="number"
              min="0"
              value={station_minutes}
              onChange={(e) => setStation_minutes(e.target.value)}
              required
              className={FIELD_CLASS}
              placeholder="7"
            />
          </div>

          {/* 築年数(任意) */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
              築年数(任意)
            </label>
            <input
              type="number"
              min="0"
              value={ageYears}
              onChange={(e) => setAgeYears(e.target.value)}
              className={FIELD_CLASS}
              placeholder="不明なら空欄"
            />
          </div>

          {/* 構造(任意) */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
              構造(任意)
            </label>
            <select
              value={structure}
              onChange={(e) => setStructure(e.target.value)}
              className={FIELD_CLASS}
            >
              <option value="">不明・未選択</option>
              <option value="木造">木造</option>
              <option value="軽量鉄骨造">軽量鉄骨造</option>
              <option value="鉄骨造">鉄骨造</option>
              <option value="鉄筋コンクリート造(RC)">
                鉄筋コンクリート造(RC)
              </option>
              <option value="鉄骨鉄筋コンクリート造(SRC)">
                鉄骨鉄筋コンクリート造(SRC)
              </option>
              <option value="その他">その他</option>
            </select>
          </div>
        </div>

        {/* 物件写真(任意) */}
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
            物件写真(任意)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="mt-2 w-full border-b border-slate-300 bg-transparent py-2 text-sm text-slate-600 outline-none transition file:mr-3 file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
          />
          {imagePreviewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imagePreviewUrl}
              alt="プレビュー"
              className="mt-3 h-40 w-full rounded-lg object-cover"
            />
          )}
        </div>

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={loading || uploadingImage}
          className="w-full bg-slate-900 py-3.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploadingImage
            ? "画像アップロード中..."
            : loading
              ? "登録中..."
              : "登録する"}
        </button>
      </form>

      {/* 結果メッセージ(成功/失敗で色分け) */}
      {message && (
        <p
          className={`mt-6 text-sm font-medium ${
            isError ? "text-rose-600" : "text-emerald-600"
          }`}
        >
          {message}
        </p>
      )}
    </main>
  );
}
