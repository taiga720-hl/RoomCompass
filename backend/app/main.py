from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session

from app.db import Base, SessionLocal, engine
from app.models import Property
from app.schemas import PropertyCreate, PropertyResponse

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="RoomCompass API")


# フロントからのアクセスを許可(CORS)
# CORS：ブラウザのセキュリティ機能で、異なるドメインからのアクセスを制限する仕組み
# それをここで制限→許可してる
app.add_middleware(
    CORSMiddleware,
    # アクセスを許可するフロントのURL
    allow_origins=[
        # URL複数指定可能
        "http://localhost:3000",
    ],
    # Cookie・認証ヘッダー（Authorizationなど）の送受信を許可するかどうか決めるエリア
    # ログインなど実装するときはTrueにする
    allow_credentials=True,
    # 許可するHTTPメソッドの指定
    # ["*"]は全メソッド許可
    allow_methods=["*"],
    # 許可するリクエストヘッダーの指定
    allow_headers=["*"],
)


# 起動時にテーブル自動作成
Base.metadata.create_all(bind=engine)

def get_db():
    # リクエストごとにセッションをつくる
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        # 終わったらクローズ
        db.close()

@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "backend"}


# フロントから送られてきた物件情報をDBに保存するAPI(POST /propertiesのときに実行)
@app.post("/properties", response_model=PropertyResponse, summary="物件を登録する")
# responce_model：APIが返すデータの型を指定
def create_property(
    payload: PropertyCreate,
    # 送られてきたJSONをpayload.name,payload.addressのように使える
    db: Session = Depends(get_db),
    # DB接続を自動でもらう
    # db.add()などできるようになる
) -> PropertyResponse:
    # 受け取ったデータでDBレコードを作成
    item = Property(**payload.model_dump())
    # **payload.model_dump()には送られてきたJSON形式のPropertyCreate型payloadがそのまま入る

    # 保存してIDを確定
    db.add(item) # itemをDBに送る
    db.commit() # それを保存
    db.refresh(item) # 最新情報の取得

    return item
# ↑ この関数は変数に値を入れて、レスポンスとしてPropertyResponse型のものを返すよとしている
# つまり今回はPropertyResponse型のitemを返してる


# GET /propertiesが呼ばれたら実行する関数(例えば、/propertiesにアクセスしたときに呼ばれる)
@app.get("/properties", response_model=list[PropertyResponse])
# response_model=list[PropertyResponse]：一行ではなくリストで、つまり全部取得して返す
def list_properties(db: Session = Depends(get_db)) -> list[PropertyResponse]:
    #                                                 ↑ 戻り値はPropertyResponse型のもの
    # 新規順で取得
    items = db.query(Property).order_by(Property.id.desc()).all()
    # db.query(Property)：Propertyテーブル内の検索(SELECT * from propertiesのようなもの)
    # order_by(Property.id.desc()).all()：idを降順にする
    return items