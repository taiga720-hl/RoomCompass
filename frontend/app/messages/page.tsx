"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Plus, Send, Users, X } from "lucide-react";
import {
  fetchUsers,
  createChatRoom,
  fetchChatRooms,
  fetchRoomMessages,
  sendRoomMessage,
} from "@/lib/propertyApi";
import {
  UserSummary,
  ChatRoomInfo,
  RoomMessageInfo,
} from "@/lib/propertyTypes";
import LoadingSpinner from "@/components/LoadingSpinner";

// メッセージを何秒おきに自動更新するか(ミリ秒)
const POLLING_INTERVAL_MS = 3000;

// アバターの配色バリエーション
// (原色でベタ塗りにすると玩具っぽく見えるので、薄い背景色+濃い文字色の
//  落ち着いたトーンにしている。名前の文字コードで割り振り、毎回同じ人が同じ色になる)
const AVATAR_COLORS = [
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-slate-200 text-slate-700",
];

// 名前の文字から、いつも同じ色を割り当てる関数
function getAvatarColor(name: string): string {
  const code = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

// アバター用の丸いアイコン(頭文字、グループはユーザーアイコン)
function Avatar({ name, isGroup }: { name: string; isGroup?: boolean }) {
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${getAvatarColor(
        name,
      )}`}
    >
      {isGroup ? <Users size={16} /> : name.charAt(0)}
    </div>
  );
}

export default function MessagesPage() {
  // ログイン中ユーザーID
  const [userId, setUserId] = useState<number | null>(null);

  // 会話ルーム一覧
  const [rooms, setRooms] = useState<ChatRoomInfo[]>([]);

  // 今開いているルームID
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

  // 開いているルームのメッセージ
  const [messages, setMessages] = useState<RoomMessageInfo[]>([]);

  // 入力欄
  const [messageInput, setMessageInput] = useState<string>("");

  // 新しい会話を作る画面の表示・入力内容
  const [showNewChat, setShowNewChat] = useState<boolean>(false);
  const [allUsers, setAllUsers] = useState<UserSummary[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [groupName, setGroupName] = useState<string>("");

  // UI系
  const [errMessage, setErrMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  // 自動スクロール用
  const bottomRef = useRef<HTMLDivElement>(null);

  // ログイン中ユーザーIDをlocalStorageから復元
  useEffect(() => {
    async function restoreUser() {
      const raw = window.localStorage.getItem("roomcompass-user");
      if (!raw) return;

      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.userId === "number") {
          setUserId(parsed.userId);
        }
      } catch {
        // 壊れたデータが入ってた場合は未ログイン扱いのまま
      } finally {
        setLoading(false);
      }
    }

    restoreUser();
  }, []);

  // ルーム一覧を取得する関数(初回・新規作成後に呼ぶ)
  async function loadRooms(currentUserId: number) {
    try {
      const data = await fetchChatRooms(currentUserId);
      setRooms(data);
    } catch {
      setErrMessage("会話一覧の取得に失敗しました");
    }
  }

  useEffect(() => {
    if (userId === null) return;

    async function load() {
      await loadRooms(userId as number);
    }

    load();
  }, [userId]);

  // ユーザー一覧を取得(新しい会話を作る画面を開いた時)
  useEffect(() => {
    if (!showNewChat) return;

    async function loadUsers() {
      try {
        const data = await fetchUsers();
        // 自分自身は選択肢から除外する
        setAllUsers(data.filter((u) => u.id !== userId));
      } catch {
        setErrMessage("ユーザー一覧の取得に失敗しました");
      }
    }

    loadUsers();
  }, [showNewChat, userId]);

  // メッセージを取得する関数
  async function loadMessages(roomId: number, currentUserId: number) {
    try {
      const data = await fetchRoomMessages(roomId, currentUserId);
      setMessages(data);
    } catch {
      setErrMessage("メッセージの取得に失敗しました");
    }
  }

  // ルームを選んだ時 & 一定間隔で、メッセージをポーリング(自動更新)する
  useEffect(() => {
    if (selectedRoomId === null || userId === null) return;

    const currentRoomId = selectedRoomId;
    const currentUserId = userId;

    async function poll() {
      await loadMessages(currentRoomId, currentUserId);
    }

    // 開いた瞬間に1回取得
    poll();

    // その後は一定間隔で取り直す
    const timer = setInterval(poll, POLLING_INTERVAL_MS);

    // ルームを切り替えた時・ページを離れた時にタイマーを止める(止めないとメモリリークする)
    return () => {
      clearInterval(timer);
    };
  }, [selectedRoomId, userId]);

  // メッセージが増えたら一番下までスクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 会話一覧に表示する名前を決める関数
  // (グループなら名前、DMなら相手の名前)
  function getRoomLabel(room: ChatRoomInfo): string {
    if (room.is_group) {
      return room.name ?? room.member_names.join("・");
    }
    return room.member_names[0] ?? "(不明なユーザー)";
  }

  // 今開いているルームの情報(ヘッダー表示用)
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? null;

  // チェックボックスの選択切り替え
  function toggleUserSelection(id: number) {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  }

  // 新しい会話(DM or グループ)を作る
  async function handleCreateRoom() {
    if (userId === null) return;

    if (selectedUserIds.length === 0) {
      setErrMessage("相手を1人以上選択してください");
      return;
    }

    // 2人以上選んだら自動的にグループ扱いにする
    const isGroup = selectedUserIds.length >= 2;

    if (isGroup && groupName.trim() === "") {
      setErrMessage("グループ名を入力してください");
      return;
    }

    try {
      const room = await createChatRoom({
        created_by: userId,
        member_ids: selectedUserIds,
        name: isGroup ? groupName.trim() : null,
        is_group: isGroup,
      });

      // 作成後は一覧を更新して、そのまま開く
      await loadRooms(userId);
      setSelectedRoomId(room.id);

      // フォームをリセット
      setShowNewChat(false);
      setSelectedUserIds([]);
      setGroupName("");
      setErrMessage("");
    } catch {
      setErrMessage("会話の作成に失敗しました");
    }
  }

  // メッセージ送信
  async function handleSendMessage() {
    if (userId === null || selectedRoomId === null) return;
    if (messageInput.trim() === "") return;

    try {
      await sendRoomMessage(selectedRoomId, {
        sender_id: userId,
        content: messageInput.trim(),
      });

      setMessageInput("");

      // 送信後すぐに反映されるよう、その場でも取り直す
      await loadMessages(selectedRoomId, userId);
    } catch {
      setErrMessage("メッセージの送信に失敗しました");
    }
  }

  if (userId === null) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-16 sm:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-slate-400">
          RoomCompass
        </p>
        <h1 className="mt-3 font-serif text-3xl text-slate-900">メッセージ</h1>
        <p className="mt-4 text-sm text-slate-500">
          この機能はログイン後に利用できます。{" "}
          <a
            href="/login"
            className="font-medium text-slate-900 underline underline-offset-4"
          >
            ログインする
          </a>
        </p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-16 sm:px-8">
        <LoadingSpinner label="読み込み中..." />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 sm:px-8">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-slate-400">
        RoomCompass
      </p>
      <h1 className="mt-3 font-serif text-3xl text-slate-900">メッセージ</h1>

      {errMessage && (
        <p className="mt-4 text-sm text-rose-600">{errMessage}</p>
      )}

      {/* チャットウィンドウ全体を1枚のカードにまとめる */}
      <div className="mt-8 grid overflow-hidden border border-slate-200 bg-white md:grid-cols-3">
        {/* 左側: 会話一覧 */}
        <div className="border-b border-slate-200 md:col-span-1 md:border-b-0 md:border-r">
          <div className="p-3">
            <button
              type="button"
              onClick={() => setShowNewChat((prev) => !prev)}
              className={`flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                showNewChat
                  ? "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200"
                  : "border-slate-900 bg-slate-900 text-white hover:bg-slate-700"
              }`}
            >
              {showNewChat ? <X size={15} /> : <Plus size={15} />}
              {showNewChat ? "閉じる" : "新しい会話"}
            </button>
          </div>

          {/* 新しい会話を作るフォーム */}
          {showNewChat && (
            <div className="mx-3 mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Users size={13} className="text-slate-400" />
                相手を選択
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                複数選ぶと自動でグループになります
              </p>

              <div className="mt-2 max-h-40 space-y-0.5 overflow-y-auto rounded-md border border-slate-200 bg-white p-1">
                {allUsers.map((user) => (
                  <label
                    key={user.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                      className="h-3.5 w-3.5 accent-slate-900"
                    />
                    {user.name}
                  </label>
                ))}
                {allUsers.length === 0 && (
                  <p className="px-1.5 py-1 text-xs text-slate-400">
                    他のユーザーがいません
                  </p>
                )}
              </div>

              {/* 2人以上選んだ時だけグループ名入力を表示 */}
              {selectedUserIds.length >= 2 && (
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="グループ名"
                  className="mt-2 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-slate-500"
                />
              )}

              <button
                type="button"
                onClick={handleCreateRoom}
                className="mt-2 w-full rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
              >
                {selectedUserIds.length >= 2 ? "グループを作成" : "DMを開始"}
              </button>
            </div>
          )}

          {/* 会話一覧 */}
          <ul className="space-y-0.5 px-2 pb-3">
            {rooms.map((room) => {
              const label = getRoomLabel(room);
              const isSelected = selectedRoomId === room.id;

              return (
                <li key={room.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition ${
                      isSelected
                        ? "bg-slate-100 font-medium text-slate-900"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Avatar name={label} isGroup={room.is_group} />
                    <span className="truncate">{label}</span>
                  </button>
                </li>
              );
            })}
            {rooms.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-slate-400">
                まだ会話がありません。
                <br />
                「新しい会話」から始めましょう
              </p>
            )}
          </ul>
        </div>

        {/* 右側: メッセージ画面 */}
        <div className="flex flex-col md:col-span-2">
          {selectedRoomId === null || selectedRoom === null ? (
            <div className="flex h-full min-h-[24rem] flex-1 flex-col items-center justify-center gap-2 text-slate-400">
              <MessageSquare size={28} strokeWidth={1.5} />
              <p className="text-sm">
                左の一覧から会話を選ぶか、新しい会話を作成してください
              </p>
            </div>
          ) : (
            <>
              {/* ヘッダーバー(今どの会話を開いているか常に分かるようにする) */}
              <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
                <Avatar name={getRoomLabel(selectedRoom)} isGroup={selectedRoom.is_group} />
                <div>
                  <p className="font-semibold text-slate-900">
                    {getRoomLabel(selectedRoom)}
                  </p>
                  {selectedRoom.is_group && (
                    <p className="text-xs text-slate-500">
                      {selectedRoom.member_names.join("・")}
                    </p>
                  )}
                </div>
              </div>

              <div
                className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4"
                style={{ height: "50vh" }}
              >
                {messages.length === 0 && (
                  <p className="text-center text-xs text-slate-400">
                    まだメッセージがありません。最初の一言を送ってみましょう
                  </p>
                )}

                {messages.map((message) => {
                  const isMine = message.sender_id === userId;
                  return (
                    <div
                      key={message.id}
                      className={`flex items-end gap-2 ${
                        isMine ? "justify-end" : "justify-start"
                      }`}
                    >
                      {/* 相手の発言には小さいアバターを添える */}
                      {!isMine && (
                        <div className="mb-0.5">
                          <Avatar name={message.sender_name} />
                        </div>
                      )}

                      <div className="flex max-w-[70%] flex-col">
                        <div
                          className={`rounded-lg px-3.5 py-2 text-sm ${
                            isMine
                              ? "bg-slate-900 text-white"
                              : "border border-slate-200 bg-white text-slate-900"
                          }`}
                        >
                          {/* 自分以外の発言には送信者名を出す(グループで誰の発言か分かるように) */}
                          {!isMine && (
                            <p className="mb-0.5 text-xs font-semibold text-slate-500">
                              {message.sender_name}
                            </p>
                          )}
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>

                        <span
                          className={`mt-0.5 text-[10px] text-slate-400 ${
                            isMine ? "text-right" : "text-left"
                          }`}
                        >
                          {new Date(message.created_at).toLocaleTimeString("ja-JP", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div className="flex gap-2 border-t border-slate-200 bg-white p-3">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSendMessage();
                    }
                  }}
                  placeholder="メッセージを入力"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={messageInput.trim() === ""}
                  className="flex items-center justify-center rounded-lg bg-slate-900 px-3.5 py-2 text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
