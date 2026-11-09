"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles } from "lucide-react";
import { sendChatMessage } from "@/lib/propertyApi";
import { ChatMessage } from "@/lib/propertyTypes";

export default function ChatPage() {
  // これまでの会話履歴(自分の発言もAIの返信も両方ここに入れる)
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // 入力欄の中身
  const [input, setInput] = useState("");

  // AIから返信待ちの間、送信ボタンを連打できないようにする
  const [loading, setLoading] = useState(false);

  // エラーメッセージ表示用
  const [error, setError] = useState<string | null>(null);

  // 常に一番下までスクロールさせるための目印(空のdivをここに置く)
  const bottomRef = useRef<HTMLDivElement>(null);

  // ログイン中ユーザーID(未ログインならnull)
  const [userId, setUserId] = useState<number | null>(null);

  // メッセージが増えるたびに一番下へ自動スクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ログイン中ユーザーIDをlocalStorageから復元(main/compareページと同じ仕組み)
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
      }
    }

    restoreUser();
  }, []);

  async function handleSend() {
    // 空欄・送信中・未ログインは何もしない
    if (!input.trim() || loading || userId === null) {
      return;
    }

    const userMessage: ChatMessage = { role: "user", content: input };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const response = await sendChatMessage({
        user_id: userId,
        messages: nextMessages,
      });

      setMessages([
        ...nextMessages,
        { role: "assistant", content: response.reply },
      ]);
    } catch (err) {
      // 429(上限到達)の場合は専用メッセージ、それ以外は汎用メッセージ
      if (err instanceof Error && err.message.includes("429")) {
        setError(
          "本日のAIチャット利用上限に達しました。また明日お試しください",
        );
      } else {
        setError("AIとの通信に失敗しました。もう一度お試しください。");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="mx-auto flex w-full max-w-2xl flex-col px-6 py-16 sm:px-8"
      style={{ minHeight: "80vh" }}
    >
      {/* 小さいラベル+明朝体の見出し(/mainと同じ構成) */}
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-slate-400">
        RoomCompass
      </p>
      <h1 className="mt-3 font-serif text-3xl text-slate-900">AI物件相談</h1>
      <p className="mt-3 text-sm text-slate-500">
        登録物件について何でも聞いてください
      </p>

      {/* 未ログイン時のバナー */}
      {userId === null && (
        <p className="mt-4 text-sm text-slate-500">
          AI相談機能はログイン後に利用できます。{" "}
          <a
            href="/login"
            className="font-medium text-slate-900 underline underline-offset-4"
          >
            ログインする
          </a>
        </p>
      )}

      {/* チャットウィンドウ全体 */}
      <div className="mt-8 flex flex-1 flex-col overflow-hidden border border-slate-200">
        {/* 会話履歴の表示エリア */}
        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4">
          {messages.length === 0 && (
            <p className="text-sm text-slate-400">
              例:「駅近で家賃が安い物件を教えて」
            </p>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              // roleが"user"なら右寄せ、"assistant"なら左寄せにする
              className={`flex items-end gap-2 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {/* AIのアイコン(左側だけ表示) */}
              {message.role === "assistant" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
                  <Sparkles size={14} />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                  message.role === "user"
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-900"
                }`}
              >
                {message.role === "assistant" ? (
                  // AIの返信だけMarkdownとして整形して表示(見出し・太字・表など)
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: (props) => <p className="mb-2 last:mb-0" {...props} />,
                      h1: (props) => (
                        <h1 className="mb-2 text-base font-bold" {...props} />
                      ),
                      h2: (props) => (
                        <h2 className="mb-2 text-base font-bold" {...props} />
                      ),
                      h3: (props) => (
                        <h3 className="mb-1 font-semibold" {...props} />
                      ),
                      ul: (props) => (
                        <ul className="mb-2 list-disc pl-5" {...props} />
                      ),
                      ol: (props) => (
                        <ol className="mb-2 list-decimal pl-5" {...props} />
                      ),
                      strong: (props) => (
                        <strong className="font-semibold" {...props} />
                      ),
                      table: (props) => (
                        <div className="mb-2 overflow-x-auto">
                          <table
                            className="w-full border-collapse text-xs"
                            {...props}
                          />
                        </div>
                      ),
                      th: (props) => (
                        <th
                          className="border border-slate-200 bg-slate-100 px-2 py-1 text-left"
                          {...props}
                        />
                      ),
                      td: (props) => (
                        <td
                          className="border border-slate-200 px-2 py-1"
                          {...props}
                        />
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  // 自分の発言はそのまま表示
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>
          ))}

          {/* AIが返信を考えている間のタイピングアニメーション */}
          {loading && (
            <div className="flex items-end justify-start gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
                <Sparkles size={14} />
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-4 py-3">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
              </div>
            </div>
          )}

          {/* 自動スクロール用の目印(常にこの位置を画面内に入れる) */}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p className="bg-slate-50 px-4 pb-2 text-sm text-rose-600">{error}</p>
        )}

        {/* 入力エリア */}
        <div className="flex gap-2 border-t border-slate-200 bg-white p-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            // Enterキーでも送信できるようにする
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSend();
              }
            }}
            placeholder={
              userId === null ? "ログインしてください" : "メッセージを入力"
            }
            className="flex-1 border-b border-slate-300 bg-transparent px-1 py-2 text-sm outline-none transition focus:border-slate-900"
            disabled={loading || userId === null}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={loading || userId === null}
            className="bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
          >
            送信
          </button>
        </div>
      </div>
    </main>
  );
}
