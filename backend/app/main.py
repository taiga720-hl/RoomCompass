from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session
import bcrypt
import requests
import anthropic
import redis
from app.config import settings

from app.db import Base, SessionLocal, engine
from app.models import Property, User, Favorite, CompareHistory
from app.schemas import (
    PropertyCreate, PropertyResponse, RecommendResponse, 
    UserCreate, UserLogin, UserResponse, LoginResponse, 
    FavoriteCreate, FavoriteResponse, 
    CompareHistoryCreate, CompareHistoryResponse,
    ChatRequest, ChatResponse
)

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="RoomCompass API")


#* Anthropicのクライアント
anthropic_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

# Redisクライアント(一日あたりのAIチャット利用回数を数えるため)
redis_client = redis.from_url(settings.REDIS_URL)

# 1ユーザーが一日に送信できるチャットの上限
CHAT_DAILY_LIMIT = 30

#* チャットのレート制限をチェックする関数
def check_chat_rate_limit(user_id: int) -> None:
    key = f"chat_limit:{user_id}"

    #? Redisのincr：キーの値を+1して返す
    count = redis_client.incr(key)

    # 初回のリクエストのときだけ、24時間で自動的にリセットされるよう有効期限をセット
    if count == 1:
        redis_client.expire(key, 60 * 60 * 24)

    if count > CHAT_DAILY_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"本日のAIチャット利用上限({CHAT_DAILY_LIMIT}件)に達しました"
        )

# フロントからのアクセスを許可(CORS)
# CORS：ブラウザのセキュリティ機能で、異なるドメインからのアクセスを制限する仕組み
# それをここで制限→許可してる
app.add_middleware(
    CORSMiddleware,
    # アクセスを許可するフロントのURL(本番のURLは環境変数FRONTEND_ORIGINで追加する)
    allow_origins=(
        # URL複数指定可能
        ["http://localhost:3000", settings.FRONTEND_ORIGIN]
        if settings.FRONTEND_ORIGIN
        else ["http://localhost:3000"]
    ),
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

def hash_password(password: str) -> str:
    # パスワードをハッシュ化してDB保存用の文字列に変換
    hashed = bcrypt.hashpw(password.encode("UTF-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")

#   ↓ verify：確認
def verify_password(password: str, password_hash: str) -> bool:
    # 入力されたパスワードが保存済みハッシュと一致するか確認
    return bcrypt.checkpw(
        password.encode("utf-8"),
        password_hash.encode("utf-8"),
    )

@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "backend"}

#* ユーザー新規登録API
@app.post("/users/register", response_model=UserResponse, summary="ユーザー登録")
def register_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
) -> UserResponse:
    # 同じメアドが既にあるか
    #? db.query(User)：Userテーブルでクエリ(照合)を開始
    existing_user = db.query(User).filter(User.email == payload.email).first()

    if existing_user is not None:
        # これ投げると即座にエラー返して処理終了
        raise HTTPException(status_code=400, detail="このメールアドレスは既に登録されています")
    
    # パスワードハッシュ化してuserに格納
    user = User(
        name = payload.name,
        email = payload.email,
        #? hash_password()：ハッシュ化する関数
        password_hash = hash_password(payload.password),
    )

    db.add(user)
    db.commit()
    # DBから最新情報を再取得
    db.refresh(user)

    return user

#* ログインAPI
@app.post("/users/login", response_model=LoginResponse, summary="ログイン")
def login_user(
    payload: UserLogin,
    db: Session = Depends(get_db),
) -> LoginResponse:
    # メアドでユーザー検索
    user = db.query(User).filter(User.email == payload.email).first()

    # ユーザーが存在しない時
    if user is None:
        raise HTTPException(status_code=401, detail="メールアドレスまたはパスワードが違います")

    # パスワードが一致しない時
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="メールアドレスまたはパスワードが違います")
    
    return LoginResponse(
        message="ログイン成功",
        user_id=user.id,
        name=user.name,
        email=user.email,
    )

#* お気に入り追加API
@app.post("/favorites", response_model=FavoriteResponse, summary="お気に入り追加")
def add_favorite(
    payload: FavoriteCreate,
    db: Session = Depends(get_db),
) -> FavoriteResponse:
    # ユーザー存在確認
    user = db.query(User).filter(User.id == payload.user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    
    # 物件が存在するか確認
    property_item = db.query(Property).filter(Property.id == payload.property_id).first()
    if property_item is None:
        raise HTTPException(status_code=404, detail="物件が見つかりません")
    
    # 既に同じ物件をお気に入りしてる場合
    already_favorite = db.query(Favorite).filter(
        Favorite.user_id == payload.user_id,
        Favorite.property_id == payload.property_id,
    ).first()

    if already_favorite is not None:
        return already_favorite
    
    # 新規作成
    favorite = Favorite(
        user_id=payload.user_id,
        property_id=payload.property_id,
    )

    db.add(favorite)
    db.commit()
    db.refresh(favorite)

    return favorite

#* お気に入り一覧取得API
@app.get("/users/{user_id}/favorites", response_model=list[FavoriteResponse], summary="お気に入り一覧")
def get_favorites(
    user_id: int,
    db: Session = Depends(get_db),
) -> list[FavoriteResponse]:
    # ユーザーが存在するか確認
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    
    # 新しい順で返す
    #? order_by：結果の並び順を指定
    #? id.desc()：idカラムを降順(descending)で並べる
    items = db.query(Favorite).filter(Favorite.user_id == user_id).order_by(Favorite.id.desc()).all()
    return items

#* お気に入り削除API
@app.delete("/favorites", summary="お気に入り削除")
def delete_favorite(
    user_id: int,
    property_id: int,
    db: Session = Depends(get_db),    
) -> dict: # Dictionaryのdictで、辞書型で返すという意味
    # 対象のお気に入りを検索
    favorite = db.query(Favorite).filter(
        Favorite.user_id == user_id,
        Favorite.property_id == property_id,
    ).first()

    # ない場合でも成功扱いにしとく
    if favorite is None:
        return {"message": "削除対象は見つかりませんでした"}
    
    db.delete(favorite)
    db.commit()

    return {"message": "お気に入りを削除しました"}

#* 比較履歴保存API
@app.post("/compare-histories", response_model=CompareHistoryResponse, summary="比較履歴保存")
def create_compare_history(
    payload: CompareHistoryCreate,
    db: Session = Depends(get_db),
) -> CompareHistoryResponse:
    # ユーザーが存在するか確認
    user = db.query(User).filter(User.id == payload.user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    # payloadの中身を全部取り出して、そのままCompareHistoryにコピー
    history = CompareHistory(**payload.model_dump())

    db.add(history)
    db.commit()
    db.refresh(history)

    return history

#* 比較履歴一覧取得API
@app.get("/users/{user_id}/compare-histories", response_model=list[CompareHistoryResponse], summary="比較履歴一覧")
def get_compare_histories(
    user_id: int,
    db: Session = Depends(get_db),
) -> list[CompareHistoryResponse]:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    
    # 新しい順で返す
    items = (
        db.query(CompareHistory)
        .filter(CompareHistory.user_id == user_id)
        .order_by(CompareHistory.id.desc())
        .all()
    )
    return items

#* 比較履歴削除API
@app.delete("/compare-histories/{history_id}", summary="比較履歴削除")
def delete_compare_history(
    history_id: int,
    user_id: int, # 本人以外が削除できないように
    db: Session = Depends(get_db),
) -> dict:
    history = db.query(CompareHistory).filter(
        CompareHistory.id == history_id,
        CompareHistory.user_id == user_id,
    ).first()

    if history is None:
        return {"message": "削除対象は見つかりませんでした"}
    
    db.delete(history)
    db.commit()

    return {"message": "比較対象を削除しました"}

#* 住所から緯度・経度を取得する関数(Google Geocoding APIを利用)
def geocode_address(address: str) -> tuple[float, float] | None:
    response = requests.get(
        "https://maps.googleapis.com/maps/api/geocode/json",
        params={
            "address": address,
            "key": settings.GOOGLE_MAPS_API_KEY,
            "language": "ja", # 日本語表記
        },
        timeout=5, # 5秒応答がなければ諦める
    )
    data = response.json()

    # 住所が見つからない場合
    if data.get("status") != "OK" or not data.get("results"):
        return None
    
    location = data["results"][0]["geometry"]["location"]
    return location["lat"], location["lng"]

#* 緯度経度から住所を取得する関数(Google Geocoding APIの逆引き)
def reverse_geocode_location(latitude: float, longitude: float) -> str | None:
    response = requests.get(
        "https://maps.googleapis.com/maps/api/geocode/json",
        params={
            # "address="の代わりに"latlng="を使うと逆引きになる
            "latlng": f"{latitude},{longitude}",
            "key": settings.GOOGLE_MAPS_API_KEY,
            "language": "ja", # 日本語表記
        },
        timeout=5,
    )
    data = response.json()

    if data.get("status") != "OK" or not data.get("results"):
        return None
    
    # 一番精度が高い結果の住所を使う
    return data["results"][0]["formatted_address"]

#* フロントから送られてきた物件情報をDBに保存するAPI(POST /propertiesのときに実行)
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

    # 住所から緯度経度を自動取得
    coordinates = geocode_address(item.address)
    if coordinates is not None:
        item.latitude, item.longitude = coordinates

    # 保存してIDを確定
    db.add(item) # itemをDBに送る
    db.commit() # それを保存
    db.refresh(item) # 最新情報の取得

    return item
# ↑ この関数は変数に値を入れて、レスポンスとしてPropertyResponse型のものを返すよとしている
# つまり今回はPropertyResponse型のitemを返してる

#* 既存物件をまとめて座標変換するAPI
@app.post("/properties/geocode-missing", summary="座標未設定の物件をまとめてジオコーディング")
def geocode_missing_properties(db: Session = Depends(get_db)) -> dict:
    # 緯度が未設定の物件だけ取得
    items = db.query(Property).filter(Property.latitude.is_(None)).all()

    updated = 0
    for item in items:
        coordinates = geocode_address(item.address)
        if coordinates is not None:
            item.latitude, item.longitude = coordinates
            updated += 1
    
    db.commit()

    return {"message": f"{updated}件の物件に座標を設定しました", "total_checked": len(items)}


#* 地図クリック地点の住所を取得するAPI(物件登録フォーム用)
@app.get("/geocode/reverse", summary="緯度経度から住所を逆引き")
def reverse_geocode(lat: float, lng: float) -> dict:
    address = reverse_geocode_location(lat, lng)

    if address is None:
        raise HTTPException(status_code=404, detail="この地点の住所は見つかりませんでした")
    
    return {"address": address }


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
        rent_weight: int,
        area_weight: int,
        station_weight: int,
    #? tuple：複数の値をセットにして返せる型
) -> tuple[str, list[str]]:
    # 判断基準となる変数の定義
    rent_score = normalize_num(property_item.rent, min_rent, max_rent, True)
    area_score = normalize_num(property_item.area, min_area, max_area, False)
    station_score = normalize_num(property_item.station_minutes, min_station, max_station, True)

    # 重みとスコアと良いときの文をセットで持つ
    candidates = [
        (rent_weight, rent_score, "家賃が比較的抑えめです"),
        (area_weight, area_score, "面積に余裕があります"),
        (station_weight, station_score, "駅までのアクセスが良好です"),
    ]

    # 重視度が高い項目を優先的に判定する
    #? key=ooで何を基準に並べ替えするか決める
    #? lambda c: c[0]：引数cを受け取り、c[0]を返す
    #? reverse=True：大きい順、sort()だけなら小さい順
    candidates.sort(key=lambda c: c[0], reverse=True)

    # 理由を入れてく空のリストを用意
    reasons: list[str] = []

    # 重視度順に見ていき、70点以上のものを理由として採用
    for weight, score, text in candidates:
        if score >= 70:
            reasons.append(text)

    # reasonsが空の時の処理(→全部70未満のときも)
    if not reasons:
        reasons.append("全体のバランスの取れた物件です")

    # 一番重視してる項目なのに粗コアが低い場合は弱点を書く
    caution_map = {
        "家賃が比較的抑えめです": "家賃はやや高めです",
        "面積に余裕があります": "面積はやや手狭です",
        "駅までのアクセスが良好です": "駅までのアクセスはやや不便です",
    }
    top_weight, top_score, top_text = candidates[0]
    if top_weight > 0 and top_score < 40:
        caution = caution_map[top_text]
        if caution not in reasons:
            reasons.append(caution)
    
    # 例：["家賃が安い", "駅が近い"] → "家賃が安い / 駅が近い"
    summary: str = " / ".join(reasons[:2]) + "。"

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
        rent_weight,
        area_weight,
        station_weight,
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

#* AIとの物件相談チャットAPI
@app.post("/chat", response_model=ChatResponse, summary="AI物件相談チャット")
def chat_with_ai(payload: ChatRequest, db: Session = Depends(get_db)) -> ChatResponse:
    # レート制限チェック
    check_chat_rate_limit(payload.user_id)

    # DBにある全物件を取得(AIにすでに知ってるとわからせるため)
    items = db.query(Property).all()

    # 物件情報を一見ずつAIが読みやすいテキストに変換
    # 例: "ID:3 名前:タワマン東京 住所:... 家賃:70000円 面積:28.5㎡ 駅徒歩:2分"
    property_lines = [
        f"ID:{p.id} 名前:{p.name} 住所:{p.address} "
        f"家賃:{p.rent}円 面積:{p.area}㎡ 駅徒歩:{p.station_minutes}分"
        for p in items
    ]
    property_list_text = "\n".join(property_lines)

    # AIへの指示
    system_prompt = (
        "あなたは物件比較サービス「RoomCompass」のAIアシスタントです。\n"
        "以下は現在DBに登録されている物件の一覧です。ユーザーからの物件相談には、"
        "この一覧に載っている物件の情報だけを使って答えてください。"
        "一覧に無い物件については「登録されていません」と正直に答えてください。\n\n"
        f"{property_list_text}"
    )

    # フロントから送られてきた会話履歴を、Anthropic APIが期待する形式に変換
    #
    conversation = [
        {"role": m.role, "content": m.content} for m in payload.messages
    ]

    # Anthropic APIを呼び出す(Claude Opus 4.8使用)
    response = anthropic_client.messages.create(
        model="claude-opus-4-8",
        max_tokens=1024,
        system=system_prompt,
        messages=conversation,
    )

    # 返信テキスト部分だけ取り出す
    reply_text = response.content[0].text

    return ChatResponse(reply=reply_text)