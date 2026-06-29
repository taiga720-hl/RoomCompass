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

// 物件データの型定義(取得用)←DBから
export type PropertyItem = {
    id: number;
    name: string;
    address: string;
    rent: number;
    area: number;
    station_minutes: number;
};

// 物件データ(登録用)
// 登録時にサーバーに送る物件のデータの型
export type PropertyRequest = {
    name: string;
    address: string;
    rent: number;
    area: number;
    station_minutes: number;
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
    favoriteOnly: boolean;
};