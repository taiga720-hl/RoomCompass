from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

from app.db import Base, SessionLocal, engine
from app.models import Property
from app.schemas import PropertyCreate, PropertyResponse, RecommendResponse

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

# バラバラのデータ、数値を比較するために0~100の数値で表して比較する
# ↓↓↓↓↓↓↓↓↓↓↓
# 家賃:   5万〜30万円   ← スケールがバラバラ
# 駅距離: 1分〜30分     ← 単位も違う
# 築年数: 1年〜50年     ← 範囲も違う
#        ↓ normalize_num を通すと
# 全部:   0〜100点      ← 同じ土俵で足し算・比較できる！
def normalize_num(value: float, min_value: float, max_value: float, reverse: bool) -> float:
    # 全件同値なら比較できないので100点にする
    if min_value == max_value:
        return 100.0 # ゼロ除算エラーになるのを防ぐため
    
    # 0~1の比率に変換
    ratio = (value - min_value) / (max_value - min_value) 
    # 例↓
    # value=60000,min_value=45000,max_value=70000 => 40
    # value=50000,min_value=45000,max_value=70000 => 80

    # 0~100の点数に変換
    score = ratio * 100

    # reverse=Trueのときは「小さいほど高得点」
    # return 100.0 - score if reverse else score ← 慣れればこの書き方のが楽]
    if reverse == True:
        return 100.0 - score
    else:
        return score

# 一つの物件に対して、各項目を重み付けで計算した総合スコアをだすAPI
def total_score(
    property_item: Property, 
    min_rent: int,
    max_rent: int,
    min_area: int,
    max_area: int,
    min_station: int,
    max_station: int,
    rent_weight: int,
    area_weight: int,
    station_weight:int,
) -> float:
    # 重みの合計を出す
    total_weight = rent_weight + area_weight + station_weight
    
    # 重みの合計が0だったら、0を返す
    if total_weight == 0:
        return 0.0
    
    # 各項目の点数を出す
    rent_score = normalize_num(property_item.rent, min_rent, max_rent, True)
    area_score = normalize_num(property_item.area, min_area, max_area, False)
    station_score = normalize_num(property_item.station_minutes, min_station, max_station, True)

    # 重み付けした各項目の総合点
    weighted_score = (
        rent_score * rent_weight + area_score * area_weight + station_score * station_weight
    )

    # 結果を同じスケールに揃えるため
    return weighted_score / total_weight

def display_recommend(
        property_item: Property,
        min_rent: int,
        max_rent: int,
        min_area: float,
        max_area: float,
        min_station: int,
        max_station: int,
    # tupleは複数の値をセットにして返せる型
) -> tuple[str, list[str]]:
    # 理由を入れてく空のリストを用意
    reasons: list[str] = []

    # 判断基準となる変数の定義
    rent_score = normalize_num(property_item.rent, min_rent, max_rent, True)
    area_score = normalize_num(property_item.area, min_area, max_area, False)
    station_score = normalize_num(property_item.station_minutes, min_station, max_station, True)

    # 判断基準を書く
    if rent_score >= 70:
        # appendは追加するという意味
        reasons.append("家賃が比較的抑えめです")
    
    if area_score >= 70:
        reasons.append("面積に余裕があります")
    
    if station_score >= 70:
        reasons.append("駅までのアクセスが良好です")

    # reasonsが空のときの処理(全部70点未満だった時)(reasonsがない時True)
    if not reasons:
        reasons.append("全体のバランスが取れた物件です")
    
    # reasons[:2]は先頭から2個だけ取り出すスライス
    # " / ".join(reasons[:2])は取り出した2個のスライスを/でつなげる
    # 例:["家賃が安い", "駅が近い"] → "家賃が安い / 駅が近い"
    summary: str = " / ".join(reasons[:2]) + "。"

    # tuple[str, list[str]]にあった型のものを返す
    return summary, reasons


# レコメンド表示API
@app.get("/properties/{property_id}/recommendation", response_model=RecommendResponse)
def send_recommend(
    property_id: int,
    rent_weight: int,
    area_weight: int,
    station_weight: int,
    db: Session = Depends(get_db),
) -> RecommendResponse:
    # DBから全物件取得
    items = db.query(Property).all()

    # 物件が1個もない時エラーを返す
    if not items:
        # raiseはエラーを出すときに使う
        # HTTPExceptionはHTTPレスポンスとしてエラーを返す
        # detailはクライアントに返す説明文
        raise HTTPException(status_code=404, detail="物件が見つかりません")
    
    # どの物件についてか、URLで指定されたIDの物件を探す
    url_property = next((item for item in items if item.id == property_id), None)

    # 対象物件がない場合エラーを返す
    # 値が一件なので if not ではなく、is None
    if url_property is None:
        raise HTTPException(status_code=404, detail="対象の物件が見つかりません")
    
    # 比較用の最小値と最大値を計算
    rents = [item.rent for item in items]
    areas = [item.area for item in items]
    stations = [item.station_minutes for item in items]

    # 最小値と最大値を取り出す
    min_rent = min(rents)
    max_rent = max(rents)

    min_area = min(areas)
    max_area = max(areas)
    
    min_station = min(stations)
    max_station = max(stations)

    # 総合スコアを計算
    final_score = total_score(
        url_property,
        min_rent,
        max_rent,
        min_area,
        max_area,
        min_station,
        max_station,
        rent_weight,
        area_weight,
        station_weight,
    )

    # 推薦文をつくる
    recommend, reasons = display_recommend(
        url_property,
        min_rent,
        max_rent,
        min_area,
        max_area,
        min_station,
        max_station,
    )

    # フロントに送るレコメンド
    return RecommendResponse(
        property_id=url_property.id,
        # 数値を小数点第一位で四捨五入する
        # round(数値, 小数点以下の桁数)
        total_score=round(final_score, 1),
        recommend=recommend,
        reasons=reasons,
    )
