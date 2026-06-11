# DB接続設定ファイル

#     ↓ PythonからDBを操作するためのライブラリ
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

# DB接続エンジン
engine = create_engine(settings.DATABASE_URL, future=True)
# engine：データベースへの接続を作成・管理するオブジェクト

# 1回のリクエストで使うセッション
# DB操作をするためのもの
SessionLocal = sessionmaker(
    bind=engine, # どのDBに接続するかを指す→今回だとengine→DATABASE_URL
    autocommit=False, # 自動で保存しない(db.commit()をしてようやく保存)
    autoflush=False, # SQLを自動送信しない
    future=True,
)

# SQLAlchemyモデルの親クラス
Base = declarative_base()