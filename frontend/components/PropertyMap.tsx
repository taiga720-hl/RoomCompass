"use client";

import { useEffect, useRef } from "react";
import { PropertyItem } from "@/lib/propertyTypes";

type PropertyMapProps = {
  // 地図上にピン表示したい物件の配列(緯度経度が無いものは無視する)
  properties: PropertyItem[];
  // 現在選択中(比較対象)の物件IDの配列(ピンの色分けに使う)
  selectedIds: number[];
  // ピンをクリックした時に呼ばれる関数(選択のON/OFF切り替え用)
  //? 関数 => void：なにも返さないという意味
  onToggleProperty: (propertyId: number) => void;
};

// Google Maps JavaScript APIのスクリプトを二重読み込みしないための管理用変数
let googleMapsScriptPromise: Promise<void> | null = null;

function loadGoogleMapsScript(): Promise<void> {
  if (googleMapsScriptPromise) {
    return googleMapsScriptPromise;
  }

  googleMapsScriptPromise = new Promise((resolve, reject) => {
    if (typeof google !== "undefined" && google.maps) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Google Mapsの読み込みに失敗しました"));

    document.head.appendChild(script);
  });

  return googleMapsScriptPromise;
}

export default function PropertyMap({
  properties,
  selectedIds,
  onToggleProperty,
}: PropertyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  // 常に最新のonToggleProperty関数を参照するためのref
  // (これをuseEffectの依存配列に直接入れると、親コンポーネントが
  //  再レンダリングされるたびにマーカーを作り直してしまい、
  //  地図のズーム位置が勝手にリセットされてしまうため、refで回避する)
  const onToggleRef = useRef(onToggleProperty);
  useEffect(() => {
    onToggleRef.current = onToggleProperty;
  }, [onToggleProperty]);

  useEffect(() => {
    let cancelled = false;

    async function setupMap() {
      await loadGoogleMapsScript();
      if (cancelled || !mapContainerRef.current) return;

      // 初回だけ地図インスタンスを作成(2回目以降は使い回す)
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new google.maps.Map(mapContainerRef.current, {
          center: { lat: 35.1815, lng: 136.9066 }, // 初期位置(名古屋駅付近)
          zoom: 12,
        });
      }

      // 前回分のマーカーを地図から消してから、新しく打ち直す
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];

      const bounds = new google.maps.LatLngBounds();
      let hasValidLocation = false;

      properties.forEach((property) => {
        // 座標が無い物件(ジオコーディング未実施/失敗)はスキップ
        if (property.latitude == null || property.longitude == null) return;

        const position = { lat: property.latitude, lng: property.longitude };
        const isSelected = selectedIds.includes(property.id);

        const marker = new google.maps.Marker({
          position,
          map: mapInstanceRef.current!,
          title: property.name,
          // 選択中は緑ピン、未選択は通常の赤ピンで区別する
          icon: isSelected
            ? "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
            : undefined,
        });

        // ピンをクリックしたら選択のON/OFFを切り替える
        marker.addListener("click", () => {
          onToggleRef.current(property.id);
        });

        markersRef.current.push(marker);
        bounds.extend(position);
        hasValidLocation = true;
      });

      // マーカーが1件以上あれば、全部が画面に収まるように表示範囲を自動調整
      if (hasValidLocation) {
        mapInstanceRef.current.fitBounds(bounds);
      }
    }

    setupMap();

    return () => {
      cancelled = true;
    };
  }, [properties, selectedIds]);

  return (
    <div
      ref={mapContainerRef}
      className="h-96 w-full rounded-xl border border-slate-200"
    />
  );
}
