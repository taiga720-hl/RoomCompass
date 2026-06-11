# APIで受け取るデータと、返すデータの型を定義

from pydantic import BaseModel, Field

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