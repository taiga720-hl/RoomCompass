// API通信の関数をまとめるエリア

import { LoginRequest, LoginResponse, PropertyItem, PropertyRequest, Recommend, RegisterRequest, RegisterResponse } from "./propertyTypes";

// ??の左側がnullまたはunderfinedなら右側を使う
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

//* ユーザー登録API
export async function registerUser(payload: RegisterRequest): Promise<RegisterResponse> {
  const res = await fetch(`${API_BASE_URL}/users/register`, {
    method: "POST",
    headers: {
      // JSON形式で送ると伝える
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("ユーザー登録に失敗しました");
  }

  return res.json();
}

//* ログインAPI
export async function loginUser(payload: LoginRequest): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE_URL}/users/login`, {
    method: "POST",
    headers: {
      // JSON形式で送ると伝える
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("ログインに失敗しました");
  }

  return res.json();
}

// asyncのときは必ずPromiseで返す
// async関数は処理が終わるまで待てる関数
// 処理を待ってる間に他の処理をできる
// asyncはawaitとPromiseが使える！
export async function fetchProperties(): Promise<PropertyItem[]> { // Promise<>で型を定義
  const res = await fetch(`${API_BASE_URL}/properties`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("物件一覧の取得に失敗しました");
  }

  return res.json();
}

export async function createProperty(payload: PropertyRequest): Promise<PropertyItem> {
  const res = await fetch(`${API_BASE_URL}/properties`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("物件の登録に失敗しました");
  }

  return res.json();
}

// レコメンド取得API
export async function getRecommend(params: {
  // どの物件のレコメンドを取得するか
  propertyId: number;

  // フロントで選んだ重みをそのままバックエンドに渡す
  rentWeight: number;
  areaWeight: number;
  stationWeight: number;
}): Promise<Recommend> {
  const query = new URLSearchParams({
    rent_weight: String(params.rentWeight),
    area_weight: String(params.areaWeight),
    station_weight: String(params.stationWeight),
  });

  // backendのsend_recommend APIを呼び出す
  const res = await fetch(
    `${API_BASE_URL}/properties/${params.propertyId}/recommendation?${query.toString()}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  // 通信失敗などのエラー
  if (!res.ok) {
    throw new Error("レコメンドの取得に失敗しました")
  }

  return res.json();
}