# DBに保存したいデータの形を定義

# 物件情報をDBに保存するためのテーブル定義

from sqlalchemy import Column, Float, Integer, String

from app.db import Base

#* ユーザー情報モデル
class User(Base):
    # テーブル名
    __tablename__ = "users"

    # ユーザーID 主キー
    id = Column(Integer, primary_key=True, index=True)

    # アプリ内表示名
    name = Column(String(255), nullable=False)

    # メールアドレス
    email = Column(String(255), unique=True, index=True, nullable=False)
    # unique=True：重複禁止

    # パスワード(ハッシュ化済み)
    password_hash = Column(String(255), nullable=False)

#* 一件の物件を定義するモデル
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
