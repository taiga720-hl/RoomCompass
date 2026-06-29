# APIで受け取るデータと、返すデータの型を定義

# pydanticはデータのバリデーションと型定義を自動でしてくれるライブラリ
from pydantic import BaseModel, Field

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

class PropertyResponse(BaseModel):
    # DBの主キー
    id: int

    # 物件基本情報
    name: str
    address: str
    rent: int
    area: float
    station_minutes: int

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