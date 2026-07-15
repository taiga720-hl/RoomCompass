"use client";

import { loadGoogleMapsScript } from "@/lib/googleMaps";
import { useEffect, useRef } from "react";

type LocationPickerProps = {
  // ピンをおいた時に呼ばれる関数
  onSelectLocation: (lat: number, lng: number) => void;
};

export default function LocationPicker({
  onSelectLocation,
}: LocationPickerProps) {
  //? useRef：値を入れる箱を作るReactの機能
  //? HTMLDivElement：ここにはHTMLのdivが入りますよという意味
  const mapContainerRef = useRef<HTMLDivElement>(null);
  //? google.maps.Map：GoogleMapsAPIが提供する地図オブジェクト(地図そのもの)
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  //? google.maps.Marker：GoogleMapsのピン！
  const markerRef = useRef<google.maps.Marker | null>(null);

  // 常に最新のonSelectLocation関数を参照するためのref
  const onSelectRef = useRef(onSelectLocation);
  useEffect(() => {
    onSelectRef.current = onSelectLocation;
  }, [onSelectLocation]);

  useEffect(() => {
    let cancelled = false;

    async function setupMap() {
      await loadGoogleMapsScript();
      if (cancelled || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new google.maps.Map(mapContainerRef.current, {
          //! 初期位置(名古屋駅付近に設定)
          center: { lat: 35.1815, lng: 136.9066 },
          zoom: 13,
        });

        // 地図上をクリックした時の処理
        mapInstanceRef.current.addListener(
          "click",
          (e: google.maps.MapMouseEvent) => {
            if (!e.latLng) return;

            const lat = e.latLng.lat();
            const lng = e.latLng.lng();

            // 既にピンがあれば移動、なければ新規作成
            if (markerRef.current) {
              markerRef.current.setPosition({ lat, lng });
            } else {
              markerRef.current = new google.maps.Marker({
                position: { lat, lng },
                map: mapInstanceRef.current!,
              });
            }

            onSelectRef.current(lat, lng);
          },
        );
      }
    }

    setupMap();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      ref={mapContainerRef}
      className="h-64 w-full rounded-xl border border-slate-200"
    />
  );
}
