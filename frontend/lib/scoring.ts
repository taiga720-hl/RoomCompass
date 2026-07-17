// 比較分析ページ専用のスコア計算ロジック
// (/compareページの計算とは別に、こちらのページ専用として持たせています)

import { PropertyItem } from "./propertyTypes";

// 0〜100の点数に変換する関数(/compareページのnormalizeNumと同じ考え方)
export function normalizeNum(
  value: number,
  min: number,
  max: number,
  reverse: boolean,
): number {
  // 全件同値なら比較できないので100点にする(ゼロ除算防止)
  if (min === max) return 100;

  const ratio = (value - min) / (max - min);
  const score = ratio * 100;

  return reverse ? 100 - score : score;
}

// 複数物件の中での、各項目の最小値・最大値をまとめて計算
export function computeRange(properties: PropertyItem[]) {
  if (properties.length === 0) {
    return null;
  }

  const rents = properties.map((p) => p.rent);
  const areas = properties.map((p) => p.area);
  const stations = properties.map((p) => p.station_minutes);

  return {
    minRent: Math.min(...rents),
    maxRent: Math.max(...rents),
    minArea: Math.min(...areas),
    maxArea: Math.max(...areas),
    minStation: Math.min(...stations),
    maxStation: Math.max(...stations),
  };
}

// computeRangeの返り値の型(nullを除いたもの)
export type PropertyRange = NonNullable<ReturnType<typeof computeRange>>;

// 1件の物件について、家賃・面積・駅徒歩の点数を計算
export function computeScores(property: PropertyItem, range: PropertyRange) {
  const rentScore = normalizeNum(property.rent, range.minRent, range.maxRent, true);
  const areaScore = normalizeNum(property.area, range.minArea, range.maxArea, false);
  const stationScore = normalizeNum(
    property.station_minutes,
    range.minStation,
    range.maxStation,
    true,
  );

  return { rentScore, areaScore, stationScore };
}

// 重み付けした総合スコアを計算
export function computeTotalScore(
  scores: { rentScore: number; areaScore: number; stationScore: number },
  weights: { rentWeight: number; areaWeight: number; stationWeight: number },
): number {
  const totalWeight = weights.rentWeight + weights.areaWeight + weights.stationWeight;
  if (totalWeight === 0) return 0;

  const weighted =
    scores.rentScore * weights.rentWeight +
    scores.areaScore * weights.areaWeight +
    scores.stationScore * weights.stationWeight;

  return weighted / totalWeight;
}

// 物件ごとに割り当てる識別色
const PROPERTY_COLORS = ["#2a78d6", "#008300", "#e87ba4", "#eda100"];
const FALLBACK_COLOR = "#898781";

export function getPropertyColor(index: number): string {
  return PROPERTY_COLORS[index] ?? FALLBACK_COLOR;
}
