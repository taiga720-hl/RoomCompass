# RoomCompass

気になる物件を登録して加重スコアで比較できるアプリ

## 機能

- **物件登録(properties/create)**: 名前、住所、家賃、面積、駅徒歩分数を登録
- **物件一覧(properties)**: 登録した物件をリスト表示
- **加重比較(compare)**: 複数物件を選択し、重み付けスコアで最適な物件を見つける

## 技術スタック

- **フロントエンド**: Next.js + TypeScript + Tailwind css
- **バックエンド**: FastAPI + SQLAlchemy
- **データベース**: PostgreSQL
- **キャッシュ**: Redis
- **インフラ**: Docker

## セットアップ

```bash
# 1. リポジトリをクローン
git clone <repo-url>
cd RoomCompass

# 2. Docker Compose で起動
docker compose up

# 3. ブラウザで開く
# フロントエンド: http://localhost:3000
# バックエンド: http://localhost:8000
```
