// Google Maps JavaScript APIのスクリプトを二重読み込みしないための管理用変数
//? let：後で値を変更できる変数の定義
let googleMapsScriptPromise: Promise<void> | null = null;

export function loadGoogleMapsScript(): Promise<void> {
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
