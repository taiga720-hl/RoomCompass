# 環境変数の読み込みファイル

from pydantic_settings import BaseSettings
#     ↑ 警告出てるのは気にしなくて良い

# 環境変数をまとめて管理する設定クラス
class Settings(BaseSettings): # BaseSettingsはenvファイルから値を自動で読み取ってくる
    # PostgreSQLの接続情報
    # .envから読み込む
    # ↓型定義
    POSTGRES_DB: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_HOST: str
    POSTGRES_PORT: int

    # アプリで使う接続URL
    DATABASE_URL: str

    # Redis接続URL
    # Redisコンテナ(redis)の6379番ポートに接続
    # /0 はRedisのデータベース番号（通常は0を使用）
    REDIS_URL: str = "redis://redis:6379/0"


# 全体で使う設定インスタンス
settings = Settings()