// 型定義エリア

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