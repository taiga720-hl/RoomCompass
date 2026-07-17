//* 型定義エリア

// ユーザー登録用の型
export type RegisterRequest = {
    name: string;
    email: string;
    password: string;
};

// ログイン用の型
export type LoginRequest = {
    email: string;
    password: string;
};

// 登録後に返ってくるユーザー情報
export type RegisterResponse = {
    id: number;
    name: string;
    email: string;
};

// ログイン成功時のレスポンス
export type LoginResponse = {
    message: string;
    user_id: number;
    name: string;
    email: string;
};

// お気に入り追加時の型
export type FavoriteRequest = {
    user_id: number;
    property_id: number;
};

// お気に入り取得時の型
export type FavoriteResponse = {
    id: number;
    user_id: number;
    property_id: number;
};

// 物件データの型定義(取得用)←DBから
export type PropertyItem = {
    id: number;
    name: string;
    address: string;
    rent: number;
    area: number;
    station_minutes: number;
    age_years: number | null;
    structure: string | null;
    image_url: string | null;
    latitude: number | null;
    longitude: number | null;
};

// 物件データ(登録用)
// 登録時にサーバーに送る物件のデータの型
export type PropertyRequest = {
    name: string;
    address: string;
    rent: number;
    area: number;
    station_minutes: number;
    age_years: number | null;
    structure: string | null;
    image_url: string | null;
};

// レコメンドの型定義
export type Recommend = {
    property_id: number;
    total_score: number;
    recommend: string;
    // 送られてくるのはstringのリストだから[]
    reasons: string[];
};

// 比較条件の保存の型
export type SaveCompare = {
    selectedIds: number[];
    rentWeight: number;
    areaWeight: number;
    stationWeight: number;
    preset: string | null; // stringかnull型を持つ
    keyword: string;
    maxRentFilter: string;
    minAreaFilter: string;
    maxStationFilter: string;
    maxAgeFilter: string;
    structureFilter: string;
    favoriteOnly: boolean;
};

// 比較履歴保存時に送る型(バックエンドのCompareHistoryCreateに対応)
export type CompareHistoryRequest = {
    user_id: number;
    selected_ids: number[];
    rent_weight: number;
    area_weight: number;
    station_weight: number;
    preset: string | null;
    keyword: string | null;
    max_rent_filter: string | null;
    min_area_filter: string | null;
    max_station_filter: string | null;
    max_age_filter: string | null;
    structure_filter: string | null;
    favorite_only: boolean;
}

// 比較履歴取得時に返ってくる型(バックエンドのCompareHistoryResponseに対応)
export type CompareHistoryResponse = {
    id: number;
    user_id: number;
    selected_ids: number[];
    rent_weight: number;
    area_weight: number;
    station_weight: number;
    preset: string | null;
    keyword: string | null;
    max_rent_filter: string | null;
    min_area_filter: string | null;
    max_station_filter: string | null;
    max_age_filter: string | null;
    structure_filter: string | null;
    favorite_only: boolean;
    created_at: string; // JSONにはDate型が無いのでstringで受け取る
};

// AIチャット1件分のメッセージの型
export type ChatMessage = {
    role: "user" | "assistant";
    content: string;
};

// チャット送信時に送るデータの型(バックエンドのChatRequestに対応)
export type ChatRequest = {
    user_id: number;
    messages: ChatMessage[];
};

// チャットの返信の型(バックエンドのChatResponseに対応)
export type ChatResponse = {
    reply: string;
};