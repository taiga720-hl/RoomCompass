"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  Cell,
} from "recharts";
import { fetchProperties } from "@/lib/propertyApi";
import { PropertyItem, SaveCompare } from "@/lib/propertyTypes";
import {
  computeRange,
  computeScores,
  computeTotalScore,
  getPropertyColor,
} from "@/lib/scoring";

export default function CompareAnalysis() {
  // 物件一覧
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // /compare/page.tsxで選んだ内容
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [rentWeight, setRentWeight] = useState<number>(40);
  const [areaWeight, setAreaWeight] = useState<number>(30);
  const [stationWeight, setStationWeight] = useState<number>(30);

  // 物件一覧をAPIから取得
  useEffect(() => {
    let cancelled = false;

    async function loadProperties() {
      try {
        const data = await fetchProperties();
        if (!cancelled) {
          setProperties(data);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProperties();

    return () => {
      cancelled = true;
    };
  }, []);

  // /compareページが保存したlocalStorageの内容を読み込み専用で復元
  useEffect(() => {
    async function restoreCompareConditions() {
      const raw = window.localStorage.getItem("roomcompass-compare-conditions");
      if (!raw) return;

      try {
        const prev = JSON.parse(raw) as SaveCompare;

        if (Array.isArray(prev.selectedIds)) {
          setSelectedIds(prev.selectedIds);
        }
        if (typeof prev.rentWeight === "number") {
          setRentWeight(prev.rentWeight);
        }
        if (typeof prev.areaWeight === "number") {
          setAreaWeight(prev.areaWeight);
        }
        if (typeof prev.stationWeight === "number") {
          setStationWeight(prev.stationWeight);
        }
      } catch {
        // 壊れたデータが入ってた場合は何もしない(初期値のまま)
      }
    }

    restoreCompareConditions();
  }, []);

  // 選択中の物件だけ抜き出す
  const selectedProperties = properties.filter((property) =>
    selectedIds.includes(property.id),
  );

  // スコア計算に使う最小値・最大値の範囲
  const range = computeRange(selectedProperties);

  // グラフ用に、各物件のスコア・色をまとめて1つのデータにする
  const chartData = selectedProperties.map((property, index) => {
    const scores = range
      ? computeScores(property, range)
      : { rentScore: 0, areaScore: 0, stationScore: 0 };

    const totalScore = range
      ? computeTotalScore(scores, { rentWeight, areaWeight, stationWeight })
      : 0;

    return {
      id: property.id,
      name: property.name,
      rent: property.rent,
      area: property.area,
      color: getPropertyColor(index),
      ...scores,
      totalScore,
    };
  });

  // 総合スコアが高い順に並べ替えた配列(ランキング用)
  const rankedData = [...chartData].sort((a, b) => b.totalScore - a.totalScore);

  // レーダーチャート用に「軸ごとに1行」の形へ変換
  // 例: { axis: "家賃", "12": 80.5, "15": 42.0 } のように、物件IDをキーにして各軸のスコアを持たせる
  const radarData = [
    {
      axis: "家賃",
      ...Object.fromEntries(chartData.map((d) => [String(d.id), d.rentScore])),
    },
    {
      axis: "面積",
      ...Object.fromEntries(chartData.map((d) => [String(d.id), d.areaScore])),
    },
    {
      axis: "駅徒歩",
      ...Object.fromEntries(
        chartData.map((d) => [String(d.id), d.stationScore]),
      ),
    },
  ];

  // 重視度の内訳(1本の横棒を3色に分けて表現)
  const weightData = [
    {
      name: "重視度",
      家賃: rentWeight,
      面積: areaWeight,
      駅徒歩: stationWeight,
    },
  ];

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <p className="text-sm text-slate-600">読み込み中...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            比較の詳細グラフ
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            /compareで選択した物件をもとに表示しています
          </p>
        </div>
        <Link
          href="/compare"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          比較画面に戻る
        </Link>
      </div>

      {selectedProperties.length === 0 ? (
        <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          物件が選択されていません。まず/compareで比較したい物件を選んでください。
        </p>
      ) : (
        <div className="mt-6 space-y-8">
          {/* 総合スコアランキング */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              総合スコアランキング
            </h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rankedData}
                  layout="vertical"
                  margin={{ left: 24 }}
                >
                  <CartesianGrid horizontal={false} stroke="#e1e0d9" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: "#898781", fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fill: "#52514e", fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) =>
                      typeof value === "number" ? value.toFixed(1) : value
                    }
                  />
                  <Bar dataKey="totalScore" radius={[0, 4, 4, 0]}>
                    {rankedData.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* 項目バランス比較(レーダーチャート) */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              項目バランス比較
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              軸の外側ほど高得点。丸に近いほど「バランス型」、いびつな形ほど「一点特化型」です
            </p>
            <div className="mt-4 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e1e0d9" />
                  <PolarAngleAxis
                    dataKey="axis"
                    tick={{ fill: "#52514e", fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    domain={[0, 100]}
                    tick={{ fill: "#898781", fontSize: 10 }}
                  />
                  {chartData.map((property) => (
                    <Radar
                      key={property.id}
                      name={property.name}
                      dataKey={String(property.id)}
                      stroke={property.color}
                      fill={property.color}
                      fillOpacity={0.2}
                    />
                  ))}
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* 家賃×面積の分布(散布図) */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              家賃×面積の分布
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              左上に近いほど「安くて広い」物件です
            </p>
            <div className="mt-4 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ left: 8, right: 24, bottom: 8 }}>
                  <CartesianGrid stroke="#e1e0d9" />
                  <XAxis
                    type="number"
                    dataKey="rent"
                    name="家賃"
                    unit="円"
                    tick={{ fill: "#898781", fontSize: 12 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="area"
                    name="面積"
                    unit="㎡"
                    tick={{ fill: "#898781", fontSize: 12 }}
                  />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Legend />
                  {chartData.map((property) => (
                    <Scatter
                      key={property.id}
                      name={property.name}
                      data={[property]}
                      fill={property.color}
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* 重視度の内訳 */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              現在の重視度の内訳
            </h2>
            <div className="mt-4 h-24">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weightData}
                  layout="vertical"
                  stackOffset="expand"
                >
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" hide />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="家賃"
                    stackId="weights"
                    fill="#fb7185"
                    radius={[4, 0, 0, 4]}
                  />
                  <Bar dataKey="面積" stackId="weights" fill="#38bdf8" />
                  <Bar
                    dataKey="駅徒歩"
                    stackId="weights"
                    fill="#fbbf24"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* 5件以上選択時の注記 */}
          {chartData.length > 4 && (
            <p className="text-xs text-slate-500">
              ※5件目以降は同系色になるため、グラフ内の凡例・ラベルで物件名を確認してください
            </p>
          )}
        </div>
      )}
    </main>
  );
}
