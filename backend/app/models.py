# DBに保存したいデータの形を定義

# 物件情報をDBに保存するためのテーブル定義

from sqlalchemy import Column, Float, Integer, String

from app.db import Base

# 一件の物件を定義するモデル
class Property(Base):
    # テーブル名
    __tablename__ = "properties"

    # 主キー
    id = Column(Integer, primary_key=True, index=True)
    # Column：カラムを定義
    # Integer：INT型
    # index=True：検索を早くする機能

    # 物件名
    name = Column(String(255), nullable=False)
    # nullable=False：空白禁止

    # 住所
    address = Column(String(255), nullable=False)

    # 家賃
    rent = Column(Integer, nullable=False)

    # 専有面積
    area = Column(Float, nullable=False)
    # Float：小数を保存する型

    # 駅徒歩分数
    station_minutes = Column(Integer, nullable=False)
