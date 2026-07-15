# APIで受け取るデータと、返すデータの型を定義

# pydanticはデータのバリデーションと型定義を自動でしてくれるライブラリ
from pydantic import BaseModel, Field
from datetime import datetime

#! Create側は「必須項目」を明示
#! Response側は「DBに保存された全項目を返す」

#* 新規登録用
#  新規登録時に受け取るデータ
class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=6, max_length=255) # 最低6文字

#* ログイン用
#  ログイン時に受け取るデータ
class UserLogin(BaseModel):
    email: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=6, max_length=255)

#* 登録後に返すユーザー情報
#  フロントに返すユーザー情報
class UserResponse(BaseModel):
    id: int
    name: str
    email: str

    # ORMモデルをそのままPydanticモデルに変換できるようにする設定
    class Config:
        from_attributes = True

#* ログイン成功時に返す情報
#  ログイン成功時に返すデータ
class LoginResponse(BaseModel):
    message: str
    user_id: int
    name: str
    email: str

# BaseModelを継承すると、型チェック、インスタンス生成が楽、JSON変換が楽
class PropertyCreate(BaseModel):
    # 物件名(1文字以上)
    name: str = Field(min_length=1, max_length=255)

    # 住所(1文字以上)
    address: str = Field(min_length=1, max_length=255)

    # 家賃(0以上)
    rent: int = Field(ge=0) # ge：～以上

    # 専有面積(0より大きい)
    area: float = Field(gt=0) # gt：～より大きい

    # 駅徒歩分数(0以上)
    station_minutes: int = Field(ge=0)

    # 築年数
    age_years: int | None = Field(default=None, ge=0)

    # 構造
    structure: str | None = None

class PropertyResponse(BaseModel):
    # DBの主キー
    id: int

    # 物件基本情報
    name: str
    address: str
    rent: int
    area: float
    station_minutes: int
    age_years: int | None
    structure: str | None

    # 緯度・経度
    latitude: float | None
    longitude: float | None

    class Config:
        # SQLAlchemyモデルをそのまま返せるようにする
        from_attributes = True


class RecommendResponse(BaseModel):
    # どの物件に対するレコメンドか(idで判断)
    property_id: int

    # 重み付け後の総合スコア
    total_score: float

    # レコメンドコメント
    recommend: str

    # 理由一覧
    reasons: list[str]

#* お気に入り追加用
class FavoriteCreate(BaseModel):
    user_id: int
    property_id: int

#* お気に入り一覧取得用
class FavoriteResponse(BaseModel):
    id: int
    user_id: int
    property_id: int

    class Config:
        from_attributes = True

#* AIチャット1件分のメッセージ(誰が発言したか＋内容)
class ChatMessage(BaseModel):
    # "user"か"AI"のどちらか
    role: str
    content: str = Field(min_length=1)

#* フロントから送られてくるチャットリクエスト
# 会話は毎回、全履歴を送る!
class ChatRequest(BaseModel):
    messages: list[ChatMessage]

#* AIからの返信
class ChatResponse(BaseModel):
    reply: str

#* 比較履歴保存用(受け取るデータ)
class CompareHistoryCreate(BaseModel):
    user_id: int
    selected_ids: list[int]

    rent_weight: int = Field(ge=0)
    area_weight: int = Field(ge=0)
    station_weight: int = Field(ge=0)

    preset: str | None = None
    keyword: str | None = None
    max_rent_filter: str | None = None
    min_area_filter: str | None = None
    max_station_filter: str | None = None
    max_age_filter: str | None = None
    structure_filter: str | None = None

    favorite_only: bool = False

#* 比較履歴一覧・保存後に返すデータ
class CompareHistoryResponse(BaseModel):
    id: int
    user_id: int
    selected_ids: list[int]

    rent_weight: int
    area_weight: int
    station_weight: int

    preset: str | None
    keyword: str | None
    max_rent_filter: str | None
    min_area_filter: str | None
    max_station_filter: str | None
    max_age_filter: str | None
    structure_filter: str | None

    favorite_only: bool
    created_at: datetime

    class Config:
        from_attributes = True