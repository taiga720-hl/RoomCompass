from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session
import bcrypt
import requests
import anthropic
import redis
from app.config import settings

from app.db import Base, SessionLocal, engine
from app.models import Property, User, Favorite, CompareHistory, ViewingSchedule, PropertyReview, ChatRoom, ChatRoomMember, RoomMessage
from app.schemas import (
    PropertyCreate, PropertyResponse, RecommendResponse, 
    UserCreate, UserLogin, UserResponse, LoginResponse, 
    FavoriteCreate, FavoriteResponse, 
    CompareHistoryCreate, CompareHistoryResponse,
    ChatRequest, ChatResponse,
    ViewingScheduleCreate, ViewingScheduleResponse,
    PropertyReviewCreate, PropertyReviewResponse,
    ChatRoomCreate, ChatRoomResponse, RoomMessageCreate, RoomMessageResponse
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


#* 物件詳細取得API(1件だけ)
@app.get("/properties/{property_id}", response_model=PropertyResponse, summary="物件詳細を取得")
def get_property(property_id: int, db: Session = Depends(get_db)) -> PropertyResponse:
    property_item = db.query(Property).filter(Property.id == property_id).first()

    if property_item is None:
        raise HTTPException(status_code=404, detail="物件が見つかりません")

    return property_item


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


#* 内見予定登録API
@app.post("/viewing-schedules", response_model=ViewingScheduleResponse, summary="内見予定を登録")
def create_viewing_schedule(
    payload: ViewingScheduleCreate,
    db: Session = Depends(get_db)
) -> ViewingScheduleResponse:
    # ユーザーが存在するか確認
    user = db.query(User).filter(User.id == payload.user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    # 物件が存在するか
    property_item = db.query(Property).filter(Property.id == payload.property_id).first()
    if property_item is None:
        raise HTTPException(status_code=404, detail="物件が見つかりません")
    
    schedule = ViewingSchedule(**payload.model_dump())

    db.add(schedule)
    db.commit()
    db.refresh(schedule)

    return schedule

#* 内見予定一覧取得API
@app.get(
    "/users/{user_id}/viewing-schedules",
    response_model=list[ViewingScheduleResponse],
    summary="内見予定一覧"
)
def get_viewing_schedules(
    user_id: int,
    db: Session = Depends(get_db),
) -> list[ViewingScheduleResponse]:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    # 日付が早い順に返す
    items = (
        db.query(ViewingSchedule)
        .filter(ViewingSchedule.user_id == user_id)
        #? order_by()：()内の指示に従って並び替え
        #? asc()：昇順
        .order_by(ViewingSchedule.scheduled_at.asc())
        .all()
    )
    return items

#* 内見予定削除API
@app.delete("/viewing-schedules/{schedule_id}", summary="内見予定削除")
def delete_viewing_schedule(
    schedule_id: int,
    user_id: int, # 本人以外できないように
    db: Session = Depends(get_db),
) -> dict:
    schedule = db.query(ViewingSchedule).filter(
        ViewingSchedule.id == schedule_id,
        ViewingSchedule.user_id == user_id,
    ).first()

    if schedule is None:
        return {"message": "削除対象は見つかりませんでした"}

    db.delete(schedule)
    db.commit()

    return {"message": "内見予定を削除しました"}


#* 口コミ投稿・編集API
#! 一人のユーザーが同じ物件に投稿できるのは一件まで！
#! → 既に投稿済みなら「編集」、なければ「新規作成」
@app.post("/properties/{property_id}/reviews", response_model=PropertyReviewResponse, summary="口コミを投稿・編集")
# upsertは、「データがすでに存在すれば更新（UPDATE）し、存在しなければ新規追加（INSERT）する」という意味
def upsert_property_review(
    property_id: int,
    payload: PropertyReviewCreate,
    db: Session = Depends(get_db),
) -> PropertyReviewResponse:
    # URLのproperty_idと送られてきたデータの〃がズレてないか確認
    if property_id != payload.property_id:
        raise HTTPException(status_code=400, detail="物件IDが一致しません")

    # ユーザーが存在するか確認
    user = db.query(User).filter(User.id == payload.user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    # 物件が存在するか確認
    property_item = db.query(Property).filter(Property.id == property_id).first()
    if property_item is None:
        raise HTTPException(status_code=404, detail="物件が見つかりません")

    # このユーザーが既にこの物件に口コミを投稿済みか確認
    existing = (
        db.query(PropertyReview).filter(
            PropertyReview.user_id == payload.user_id,
            PropertyReview.property_id == property_id,
        )
        .first()
    )

    if existing is not None:
        # 既にあれば内容を上書き(編集)
        existing.star = payload.star
        existing.comment = payload.comment
        db.commit()
        db.refresh(existing)
        review = existing
    else:
        # なければ新規作成
        review = PropertyReview(
            user_id=payload.user_id,
            property_id=property_id,
            star=payload.star,
            comment=payload.comment,
        )
        db.add(review)
        db.commit()
        db.refresh(review)

    # 投稿者名も一緒に返す
    return PropertyReviewResponse(
        id=review.id,
        user_id=review.user_id,
        property_id=review.property_id,
        star=review.star,
        comment=review.comment,
        created_at=review.created_at,
        updated_at=review.updated_at,
        user_name=user.name,
    )

#* 口コミ一覧取得API
#  口コミは複数件想定なので、返り値はリスト型
@app.get("/properties/{property_id}/reviews", response_model=list[PropertyReviewResponse], summary="口コミ一覧を取得")
def get_property_reviews(
    property_id: int,
    db: Session = Depends(get_db),
) -> list[PropertyReviewResponse]:
    #? join():2つのテーブルを紐づけて同時に取得するためのメソッド
    rows = (
        db.query(PropertyReview, User)
        .join(User, PropertyReview.user_id == User.id)
        .filter(PropertyReview.property_id == property_id)
        .order_by(PropertyReview.created_at.desc())
        .all()
    )

    return [
        PropertyReviewResponse(
            id=review.id,
            user_id=review.user_id,
            property_id=review.property_id,
            star=review.star,
            comment=review.comment,
            created_at=review.created_at,
            updated_at=review.updated_at,
            user_name=user.name,
        )
        for review, user in rows
    ]

#* 口コミ削除API(自分の投稿だけ削除)
@app.delete("/properties/{property_id}/reviews", summary="口コミ削除")
def delete_property_review(
    property_id: int,
    user_id: int,
    db: Session = Depends(get_db),
) -> dict:
    review = (
        db.query(PropertyReview)
        .filter(
            PropertyReview.property_id == property_id,
            PropertyReview.user_id == user_id,
        )
        .first()
    )

    if review is None:
        return {"message": "削除対象は見つかりませんでした"}

    db.delete(review)
    db.commit()

    return {"message": "口コミを削除しました"}



#* ユーザー一覧取得API(DM相手、グループチャット作成に役立つ)
@app.get("/users", response_model=list[UserResponse], summary="ユーザー一覧")
def list_users(db: Session = Depends(get_db)) -> list[UserResponse]:
    users = db.query(User).order_by(User.name.asc()).all()
    return users


#* 指定したユーザーたちで構成されてるルームを探す関数
#! 同じメンバーで同じルームを複数作成するのを防ぐため
#? set：重複を自動的に取り除いてくれる型
def find_existing_dm_room(db: Session, member_id_set: set[int]) -> ChatRoom | None:
    # DMのルームだけを対象に調べる
    candidate_rooms = db.query(ChatRoom).filter(ChatRoom.is_group == False).all()

    for room in candidate_rooms:
        room_member_ids = {
            m.user_id
            for m in db.query(ChatRoomMember).filter(ChatRoomMember.room_id == room.id)
        }
        # 参加者の集合が完全一致の場合
        if room_member_ids == member_id_set:
            return room

    return None


#* ルームの情報を、レスポンス用の形(ChatRoomResponse)に組み立てる関数
#  "自分以外"のメンバー名一覧を作るのがポイント(表示名に使うため)
def build_chat_room_response(db: Session, room: ChatRoom, viewer_id: int) -> ChatRoomResponse:
    members = db.query(ChatRoomMember).filter(ChatRoomMember.room_id == room.id).all()

    # 自分(viewer_id)以外のuser_idだけ抜き出す
    other_ids = [m.user_id for m in members if m.user_id != viewer_id]

    # そのIDに対応する名前を取得
    #? in_()：「IDがこのリストのどれかに一致する」という条件を作るメソッド
    other_users = db.query(User).filter(User.id.in_(other_ids)).all()
    member_names = [u.name for u in other_users]

    return ChatRoomResponse(
        id=room.id,
        name=room.name,
        is_group=room.is_group,
        created_by=room.created_by,
        created_at=room.created_at,
        member_names=member_names,
    )


#* チャットルーム作成API
#  is_groupがFalseならDM、Trueならグループ作成
@app.post("/chat-rooms", response_model=ChatRoomResponse, summary="チャットルーム作成/DM開始")
def create_chat_room(
    payload: ChatRoomCreate,
    db: Session = Depends(get_db),
) -> ChatRoomResponse:
    # 作成者自身も含めた参加者全員のIDをまとめる
    #? set()：重複を自動的に取り除いてくれる型
    member_id_set = set(payload.member_ids) | {payload.created_by}

    if not payload.is_group:
        if len(member_id_set) != 2:
            raise HTTPException(status_code=400, detail="DMは相手を一人だけ指定してください")

        # 既に同じ2人のDMルームが無いか確認し、あれば使い回す
        existing_room = find_existing_dm_room(db, member_id_set)
        if existing_room is not None:
            return build_chat_room_response(db, existing_room, payload.created_by)

    # 新しいルームを作成
    room = ChatRoom(
        name=payload.name,
        is_group=payload.is_group,
        created_by=payload.created_by,
    )
    db.add(room)
    db.commit()
    db.refresh(room)

    # 参加者全員をchat_room_membersに登録
    for member_id in member_id_set:
        db.add(ChatRoomMember(room_id=room.id, user_id=member_id))
    db.commit()

    return build_chat_room_response(db, room, payload.created_by)


#* 自分が参加しているチャットルーム一覧取得API
@app.get(
    "/users/{user_id}/chat-rooms",
    response_model=list[ChatRoomResponse],
    summary="チャットルーム一覧",
)
def get_chat_rooms(user_id: int, db: Session = Depends(get_db)) -> list[ChatRoomResponse]:
    # 自分が参加しているルームIDを取得
    my_memberships = db.query(ChatRoomMember).filter(ChatRoomMember.user_id == user_id).all()
    room_ids = [m.room_id for m in my_memberships]

    rooms = (
        db.query(ChatRoom)
        .filter(ChatRoom.id.in_(room_ids))
        .order_by(ChatRoom.created_at.desc())
        .all()
    )

    return [build_chat_room_response(db, room, user_id) for room in rooms]



#* チャットルームのメッセージ一覧取得API
@app.get(
    "/chat-rooms/{room_id}/messages",
    response_model=list[RoomMessageResponse],
    summary="メッセージ一覧",
)
def get_room_messages(
    room_id: int,
    user_id: int,  # このユーザーが本当にこのルームの参加者か確認するため
    db: Session = Depends(get_db),
) -> list[RoomMessageResponse]:
    # 参加者チェック(部外者がメッセージを覗けないようにする)
    is_member = (
        db.query(ChatRoomMember)
        .filter(ChatRoomMember.room_id == room_id, ChatRoomMember.user_id == user_id)
        .first()
    )
    if is_member is None:
        raise HTTPException(status_code=403, detail="このルームのメンバーではありません")

    # メッセージと送信者名を結合して取得(古い順)
    rows = (
        db.query(RoomMessage, User)
        .join(User, RoomMessage.sender_id == User.id)
        .filter(RoomMessage.room_id == room_id)
        .order_by(RoomMessage.created_at.asc())
        .all()
    )

    return [
        RoomMessageResponse(
            id=message.id,
            room_id=message.room_id,
            sender_id=message.sender_id,
            sender_name=user.name,
            content=message.content,
            created_at=message.created_at,
        )
        for message, user in rows
    ]

#* メッセージ送信API
@app.post(
    "/chat-rooms/{room_id}/messages",
    response_model=RoomMessageResponse,
    summary="メッセージ送信",
)
def send_room_message(
    room_id: int,
    payload: RoomMessageCreate,
    db: Session = Depends(get_db),
) -> RoomMessageResponse:
    # 参加者チェック
    is_member = (
        db.query(ChatRoomMember)
        .filter(ChatRoomMember.room_id == room_id, ChatRoomMember.user_id == payload.sender_id)
        .first()
    )
    if is_member is None:
        raise HTTPException(status_code=403, detail="このルームのメンバーではありません")

    sender = db.query(User).filter(User.id == payload.sender_id).first()
    if sender is None:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    message = RoomMessage(
        room_id=room_id,
        sender_id=payload.sender_id,
        content=payload.content,
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    return RoomMessageResponse(
        id=message.id,
        room_id=message.room_id,
        sender_id=message.sender_id,
        sender_name=sender.name,
        content=message.content,
        created_at=message.created_at,
    )
