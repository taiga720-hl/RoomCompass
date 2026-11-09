// API通信の関数をまとめるエリア

import { LoginRequest, LoginResponse, FavoriteRequest, FavoriteResponse, PropertyItem, PropertyRequest, Recommend, RegisterRequest, RegisterResponse, CompareHistoryRequest, CompareHistoryResponse, ChatRequest, ChatResponse, ViewingScheduleRequest, ViewingScheduleResponse, PropertyReviewRequest, PropertyReviewResponse, RoomMessageInfo, RoomMessageRequest, ChatRoomInfo, ChatRoomRequest, UserSummary } from "./propertyTypes";

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

//* お気に入り追加API
export async function addFavorite(payload: FavoriteRequest): Promise<FavoriteResponse> {
  const res = await fetch(`${API_BASE_URL}/favorites`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("お気に入り追加に失敗しました");
  }

  return res.json();
}

//* お気に入り一覧取得API
export async function getFavorites(userId: number): Promise<FavoriteResponse[]> {
  const res = await fetch(`${API_BASE_URL}/users/${userId}/favorites`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("お気に入り一覧の取得に失敗しました")
  }

  return res.json();
}

//* お気に入り削除API
export async function deleteFavorite(userId: number, propertyId: number): Promise<{ message: string }> {
  const query = new URLSearchParams({
    user_id: String(userId),
    property_id: String(propertyId),
  });

  const res = await fetch(`${API_BASE_URL}/favorites?${query.toString()}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error("お気に入り削除に失敗しました");
  }

  return res.json();
}

//* 比較履歴保存API
export async function saveCompareHistory(
  payload: CompareHistoryRequest,
): Promise<CompareHistoryResponse> {
  const res = await fetch(`${API_BASE_URL}/compare-histories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("比較履歴の保存に失敗しました");
  }

  return res.json();
}

//* 比較履歴一覧取得API
export async function getCompareHistories(
  userId: number,
): Promise<CompareHistoryResponse[]> {
  const res = await fetch(`${API_BASE_URL}/users/${userId}/compare-histories`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("比較履歴一覧の取得に失敗しました");
  }

  return res.json();
}

//* 比較履歴削除API
export async function deleteCompareHistory(
  historyId: number,
  userId: number,
): Promise<{ message: string }> {
  // deleteFavoriteと同じく、所有者確認用のuser_idをクエリで渡す
  const query = new URLSearchParams({ user_id: String(userId) });

  const res = await fetch(
    `${API_BASE_URL}/compare-histories/${historyId}?${query.toString()}`,
    {
      method: "DELETE",
    },
  );

  if (!res.ok) {
    throw new Error("比較履歴の削除に失敗しました");
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

//* 緯度経度から住所を逆引きするAPI(地図クリップ用)
export async function reverseGeocode(lat: number, lng: number): Promise<{ address: string }> {
  const query = new URLSearchParams({ lat: String(lat), lng: String(lng) });

  const res = await fetch(`${API_BASE_URL}/geocode/reverse?${query.toString()}`, {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error("住所の取得に失敗しました");
  }

  return res.json();
}

//* AIチャット送信API
export async function sendChatMessage(payload: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`AIとの通信に失敗しました (${res.status})`);
  }

  return res.json();
}

//* 内見予定登録API
export async function createViewingSchedule(
  payload: ViewingScheduleRequest,
): Promise<ViewingScheduleResponse> {
  const res = await fetch(`${API_BASE_URL}/viewing-schedules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("内見予定の登録に失敗しました");
  }

  return res.json();
}

//* 内見予定一覧取得API
export async function getViewingSchedules(
  userId: number,
): Promise<ViewingScheduleResponse[]> {
  const res = await fetch(`${API_BASE_URL}/users/${userId}/viewing-schedules`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("内見予定一覧の取得に失敗しました");
  }

  return res.json();
}

//* 内見予定削除API
export async function deleteViewingSchedule(
  scheduleId: number,
  userId: number,
): Promise<{ message: string }> {
  const query = new URLSearchParams({ user_id: String(userId) });

  const res = await fetch(
    `${API_BASE_URL}/viewing-schedules/${scheduleId}?${query.toString()}`,
    { method: "DELETE" },
  );

  if (!res.ok) {
    throw new Error("内見予定の削除に失敗しました");
  }

  return res.json();
}

//* 物件詳細取得API(1件だけ)
export async function fetchPropertyById(propertyId: number): Promise<PropertyItem> {
  const res = await fetch(`${API_BASE_URL}/properties/${propertyId}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("物件情報の取得に失敗しました");
  }

  return res.json();
}

//* クチコミ投稿・編集API(POSTだが、既にあれば上書きされる)
export async function upsertPropertyReview(
  propertyId: number,
  payload: PropertyReviewRequest,
): Promise<PropertyReviewResponse> {
  const res = await fetch(`${API_BASE_URL}/properties/${propertyId}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("クチコミの投稿に失敗しました");
  }

  return res.json();
}

//* クチコミ一覧取得API
export async function getPropertyReviews(
  propertyId: number,
): Promise<PropertyReviewResponse[]> {
  const res = await fetch(`${API_BASE_URL}/properties/${propertyId}/reviews`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("クチコミ一覧の取得に失敗しました");
  }

  return res.json();
}

//* クチコミ削除API
export async function deletePropertyReview(
  propertyId: number,
  userId: number,
): Promise<{ message: string }> {
  const query = new URLSearchParams({ user_id: String(userId) });

  const res = await fetch(
    `${API_BASE_URL}/properties/${propertyId}/reviews?${query.toString()}`,
    { method: "DELETE" },
  );

  if (!res.ok) {
    throw new Error("クチコミの削除に失敗しました");
  }

  return res.json();
}


//* ユーザー一覧取得API(DM相手・グループメンバー選び用)
export async function fetchUsers(): Promise<UserSummary[]> {
  const res = await fetch(`${API_BASE_URL}/users`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("ユーザー一覧の取得に失敗しました");
  }

  return res.json();
}

//* チャットルーム作成/DM開始API
export async function createChatRoom(payload: ChatRoomRequest): Promise<ChatRoomInfo> {
  const res = await fetch(`${API_BASE_URL}/chat-rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("チャットルームの作成に失敗しました");
  }

  return res.json();
}

//* チャットルーム一覧取得API
export async function fetchChatRooms(userId: number): Promise<ChatRoomInfo[]> {
  const res = await fetch(`${API_BASE_URL}/users/${userId}/chat-rooms`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("チャットルーム一覧の取得に失敗しました");
  }

  return res.json();
}

//* メッセージ一覧取得API
export async function fetchRoomMessages(
  roomId: number,
  userId: number,
): Promise<RoomMessageInfo[]> {
  const query = new URLSearchParams({ user_id: String(userId) });

  const res = await fetch(
    `${API_BASE_URL}/chat-rooms/${roomId}/messages?${query.toString()}`,
    { method: "GET", cache: "no-store" },
  );

  if (!res.ok) {
    throw new Error("メッセージの取得に失敗しました");
  }

  return res.json();
}

//* メッセージ送信API
export async function sendRoomMessage(
  roomId: number,
  payload: RoomMessageRequest,
): Promise<RoomMessageInfo> {
  const res = await fetch(`${API_BASE_URL}/chat-rooms/${roomId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("メッセージの送信に失敗しました");
  }

  return res.json();
}
