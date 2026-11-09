# DBに保存したいデータの形を定義

# 物件情報をDBに保存するためのテーブル定義

from sqlalchemy import Column, Float, Integer, String, JSON, DateTime, Boolean
from sqlalchemy.sql import func

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

    # 築年数
    age_years = Column(Integer, nullable=True)

    # 建物の構造
    structure = Column(String(50), nullable=True)

    # 物件写真のURL(Cloudinaryにアップロード)
    image_url = Column(String(500), nullable=True)

    # 緯度・経度(住所からGoogle Geocoding APIで自動取得)
    # latitude：緯度
    # longitude：経度
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

#* お気に入りモデル
class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, nullable=False, index=True)

    property_id = Column(Integer, nullable=False, index=True)

#* 比較履歴モデル
class CompareHistory(Base):
    __tablename__ = "compare_histories"

    id = Column(Integer, primary_key=True, index=True)

    # どのユーザーの履歴か
    user_id = Column(Integer, nullable=False, index=True)

    # 比較対象にえらんだ物件IDのリスト
    # [1, 2, 3]のように配列が入る
    selected_ids = Column(JSON, nullable=False)

    # 重み付けの項目
    rent_weight = Column(Integer, nullable=False)
    area_weight = Column(Integer, nullable=False)
    station_weight = Column(Integer, nullable=False)

    # プリセット名(未選択はNULL)
    preset = Column(String(255), nullable=True)

    # 検索条件
    keyword = Column(String(255), nullable=True)
    max_rent_filter = Column(String(50), nullable=True)
    min_area_filter = Column(String(50), nullable=True)
    max_station_filter = Column(String(50), nullable=True)
    max_age_filter = Column(String(50), nullable=True)
    structure_filter = Column(String(50), nullable=True)

    # お気に入りのみ表示にしてたか?
    favorite_only = Column(Boolean, nullable=False, default=False)

    # 保存日時
    #? server_default=func.now()：DBが自動的に日時をセットしてくれる
    created_at = Column(DateTime, nullable=False, server_default=func.now())


#* 内見予定カレンダーモデル
class ViewingSchedule(Base):
    __tablename__ = "viewing_schedules"

    id = Column(Integer, primary_key=True, index=True)

    # どのユーザーの予定か
    user_id = Column(Integer, nullable=False, index=True)

    # どの物件の予定か
    property_id = Column(Integer, nullable=False, index=True)

    # 内見予定日時
    scheduled_at = Column(DateTime, nullable=False)

    # メモ(任意)
    memo = Column(String(500), nullable=True)

    # 登録日時
    created_at = Column(DateTime, nullable=False, server_default=func.now())


#* 物件口コミモデル
class PropertyReview(Base):
    __tablename__ = "property_reviews"

    id = Column(Integer, primary_key=True, index=True)

    # 投稿したユーザー
    user_id = Column(Integer, nullable=False, index=True)

    # 口コミ対象の物件
    property_id = Column(Integer, nullable=False, index=True)

    # 星評価(1~5)
    star = Column(Integer, nullable=False)

    # コメント本文
    comment = Column(String(1000), nullable=False)

    # 投稿日時
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    # 更新日時
    #? onupdate=func.now()：レコードがアップデートされる度にDB側が自動で現在時刻を入れてくれる
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())



#* チャットルームモデル(DM・グループ共通の入れ物)
class ChatRoom(Base):
    __tablename__ = "chat_rooms"

    id = Column(Integer, primary_key=True, index=True)

    # グループチャットの名前(DMならNullのまま)
    name = Column(String(255), nullable=True)

    # Trueのときグループチャット、FalseのときDM
    is_group = Column(Boolean, nullable=False, default=False)

    # 作成したユーザー
    created_by = Column(Integer, nullable=False)

    created_at = Column(DateTime, nullable=False, server_default=func.now())


#* チャットルームの参加者モデル(誰がどのルーム入ってるか)
class ChatRoomMember(Base):
    __tablename__ = "chat_room_members"

    id = Column(Integer, primary_key=True, index=True)

    # どのルームか
    room_id = Column(Integer, nullable=False, index=True)

    # どのユーザーか
    user_id = Column(Integer, nullable=False, index=True)

    joined_at = Column(DateTime, nullable=False, server_default=func.now())


#* チャットメッセージモデル
class RoomMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)

    # どのルームへの投稿か
    room_id = Column(Integer, nullable=False, index=True)

    # 送信者
    sender_id = Column(Integer, nullable=False)

    # メッセージ本体
    content = Column(String(2000), nullable=False)

    created_at = Column(DateTime, nullable=False, server_default=func.now())