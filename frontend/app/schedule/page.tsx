"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  fetchProperties,
  createViewingSchedule,
  getViewingSchedules,
  deleteViewingSchedule,
} from "@/lib/propertyApi";
import { PropertyItem, ViewingScheduleResponse } from "@/lib/propertyTypes";

//* 日付を"2026-08-01"の形に変換する関数
function dateChange(date: Date): string {
  const y = date.getFullYear();
  // 月を2桁表示する為の処理
  //! getMonth()は1月なら0、5月なら4のように1個少ない数字で表されるので、
  //! +1 をしてもとの月数字に戻してる
  //? padStart(2, "0")：文字列の長さが2以上になるまで左側に0をつける
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

//* 指定した年月のカレンダーマス目を作る関数
function calendarSquare(year: number, month: number): (Date | null)[] {
  // その月の1日
  const firstDay = new Date(year, month, 1);
  // 翌月の0日目=その月の最終日
  //! 0日は8月0日とかではなく、7月最後の日と解釈する
  const lastDay = new Date(year, month + 1, 0);

  // 1日が何曜日か(0=日曜日、6=土曜日)
  //? getDay()：Dateオブジェクトから曜日を取得するメソッド
  const startWeekday = firstDay.getDay();

  const days: (Date | null)[] = [];

  // 月初めの曜日合わせ用の空白マス
  for (let i = 0; i < startWeekday; i++) {
    days.push(null);
  }

  // 1日から最終日まで並べる
  //? getDate()：Dateオブジェクトから「日にち」(1〜31)を取得するメソッド
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  return days;
}

export default function SchedulePage() {
  // ログイン中ユーザーID
  const [userId, setUserId] = useState<number | null>(null);

  // 表示中の月(その月の一日目を保持する)
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // 物件一覧
  const [properties, setProperties] = useState<PropertyItem[]>([]);

  // 内見予定一覧
  const [schedules, setSchedules] = useState<ViewingScheduleResponse[]>([]);

  // 予定追加フォームの表示・入力内容
  const [showForm, setShowForm] = useState<boolean>(false);
  const [formDate, setFormDate] = useState<string>("");
  const [formTime, setFormTime] = useState<string>("10:00");
  const [formPropertyId, setFormPropertyId] = useState<string>("");
  const [formMemo, setFormMemo] = useState<string>("");

  // UI系
  const [loading, setLoading] = useState<boolean>(false);
  const [errMessage, setErrMessage] = useState<string>("");

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
      }
    }

    restoreUser();
  }, []);

  // 物件一覧を取得
  useEffect(() => {
    async function loadProperties() {
      try {
        const data = await fetchProperties();
        setProperties(data);
      } catch {
        setErrMessage("物件一覧の取得に失敗しました");
      }
    }

    loadProperties();
  }, []);

  // ログイン中ユーザーの内見予定一覧を取得
  async function loadSchedules(currentUserId: number) {
    try {
      const data = await getViewingSchedules(currentUserId);
      setSchedules(data);
    } catch {
      setErrMessage("内見予定の取得に失敗しました");
    }
  }
  useEffect(() => {
    if (userId === null) return;
    // nullチェック後の値を別変数に入れることで、下の関数からも「nullではない」と認識できるようにする
    const currentUserId = userId;

    async function load() {
      await loadSchedules(currentUserId);
    }

    load();
  }, [userId]);

  // 物件IDから物件名を引く関数(見つからない場合は"(削除された物件)")
  function getPropertyName(propertyId: number): string {
    const property = properties.find((p) => p.id === propertyId);
    return property ? property.name : "(削除された物件)";
  }

  // 日付ごとに予定をグループ化しておく(カレンダーの各マスで参照する)
  const schedulesByDate: Record<string, ViewingScheduleResponse[]> = {};
  for (const schedule of schedules) {
    const key = dateChange(new Date(schedule.scheduled_at));
    if (!schedulesByDate[key]) {
      schedulesByDate[key] = [];
    }
    schedulesByDate[key].push(schedule);
  }

  // 前の月・次の月に移動する関数
  function goToPrevMonth() {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
    );
  }
  function goToNextMonth() {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    );
  }

  // カレンダーの日付をクリックした時の処理
  function handleDayClick(date: Date) {
    if (userId === null) return;

    setFormDate(dateChange(date));
    setShowForm(true);
  }

  // 予定登録
  async function handleSubmit() {
    if (userId === null) return;

    if (!formDate || !formPropertyId) {
      setErrMessage("日付と物件を選択してください");
      return;
    }

    setLoading(true);
    setErrMessage("");

    try {
      // 日付+時刻をそのまま文字列としてまとめる(タイムゾーン変換はしない)
      const scheduledAt = `${formDate}T${formTime}:00`;

      await createViewingSchedule({
        user_id: userId,
        property_id: Number(formPropertyId),
        scheduled_at: scheduledAt,
        memo: formMemo.trim() === "" ? null : formMemo.trim(),
      });

      // フォームを閉じてリセット
      setShowForm(false);
      setFormPropertyId("");
      setFormMemo("");

      // 一覧を再取得して画面に反映
      await loadSchedules(userId);
    } catch {
      setErrMessage("内見予定の登録に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  // 予定削除
  async function handleDelete(scheduleId: number) {
    if (userId === null) return;

    try {
      await deleteViewingSchedule(scheduleId, userId);
      await loadSchedules(userId);
    } catch {
      setErrMessage("内見予定の削除に失敗しました");
    }
  }

  // 今表示している月のカレンダーマス目
  const days = calendarSquare(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
  );

  // 今日の日付キー(今日のマスをハイライトするため)
  const todayKey = dateChange(new Date());

  // 全予定を日時順に並べたもの(カレンダー下の一覧表示用)
  const sortedSchedules = [...schedules].sort(
    (a, b) =>
      new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
      {/* 小さいラベル+明朝体の見出し(/mainと同じ構成) */}
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-slate-400">
        RoomCompass
      </p>
      <h1 className="mt-3 font-serif text-3xl text-slate-900">
        内見予定カレンダー
      </h1>
      <p className="mt-3 text-sm text-slate-500">
        物件の内見予定を登録・管理できます
      </p>

      {/* 未ログイン時のバナー */}
      {userId === null && (
        <p className="mt-6 text-sm text-slate-500">
          この機能はログイン後に利用できます。{" "}
          <a
            href="/login"
            className="font-medium text-slate-900 underline underline-offset-4"
          >
            ログインする
          </a>
        </p>
      )}

      {errMessage && (
        <p className="mt-4 text-sm text-rose-600">{errMessage}</p>
      )}

      {/* 月の切り替え */}
      <div className="mt-10 flex items-center justify-between border-t border-slate-200 pt-6">
        <button
          type="button"
          onClick={goToPrevMonth}
          className="flex items-center gap-1 text-sm text-slate-400 transition hover:text-slate-900"
        >
          <ChevronLeft size={16} />
          前の月
        </button>
        <p className="font-serif text-xl text-slate-900">
          {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
        </p>
        <button
          type="button"
          onClick={goToNextMonth}
          className="flex items-center gap-1 text-sm text-slate-400 transition hover:text-slate-900"
        >
          次の月
          <ChevronRight size={16} />
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="mt-6 grid grid-cols-7 gap-1 text-center text-xs font-medium uppercase tracking-wider text-slate-400">
        <div>日</div>
        <div>月</div>
        <div>火</div>
        <div>水</div>
        <div>木</div>
        <div>金</div>
        <div>土</div>
      </div>

      {/* カレンダー本体(7列グリッド) */}
      <div className="mt-2 grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          // 空白マス(月初めの曜日合わせ用)
          if (date === null) {
            return <div key={`empty-${index}`} className="h-24" />;
          }

          const dateKey = dateChange(date);
          const daySchedules = schedulesByDate[dateKey] ?? [];
          const isToday = dateKey === todayKey;
          // フォームが開いていて、かつこの日付が選択されている状態かどうか
          const isSelected = showForm && dateKey === formDate;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => handleDayClick(date)}
              className={`h-24 overflow-hidden border p-1.5 text-left align-top text-xs transition ${
                isSelected
                  ? "border-slate-900 bg-slate-50"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <p
                className={`font-medium ${
                  isToday
                    ? "flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white"
                    : "text-slate-700"
                }`}
              >
                {date.getDate()}
              </p>

              {/* その日の予定を最大2件まで表示、残りは"+N件"でまとめる */}
              <div className="mt-1 space-y-0.5">
                {daySchedules.slice(0, 2).map((schedule) => (
                  <p
                    key={schedule.id}
                    className="truncate border-l-2 border-slate-900 pl-1 text-[10px] text-slate-600"
                  >
                    {new Date(schedule.scheduled_at).toLocaleTimeString(
                      "ja-JP",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}{" "}
                    {getPropertyName(schedule.property_id)}
                  </p>
                ))}
                {daySchedules.length > 2 && (
                  <p className="text-[10px] text-slate-400">
                    +{daySchedules.length - 2}件
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 予定追加フォーム */}
      {showForm && (
        <div className="mt-8 border-t border-slate-200 pt-8">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            内見予定を追加
          </p>

          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">
              日付
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="mt-2 w-full border-b border-slate-300 bg-transparent py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </label>

            <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">
              時刻
              <input
                type="time"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                className="mt-2 w-full border-b border-slate-300 bg-transparent py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </label>

            <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 sm:col-span-2">
              物件
              <select
                value={formPropertyId}
                onChange={(e) => setFormPropertyId(e.target.value)}
                className="mt-2 w-full border-b border-slate-300 bg-transparent py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              >
                <option value="">選択してください</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 sm:col-span-2">
              メモ(任意)
              <input
                type="text"
                value={formMemo}
                onChange={(e) => setFormMemo(e.target.value)}
                placeholder="例: 駅から遠回りしないよう注意"
                className="mt-2 w-full border-b border-slate-300 bg-transparent py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </label>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
            >
              {loading ? "登録中..." : "登録する"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm text-slate-400 transition hover:text-slate-900"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 予定一覧(日時順) */}
      <div className="mt-10 border-t border-slate-200 pt-8">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          予定一覧
        </p>

        {sortedSchedules.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            登録されている内見予定はありません
          </p>
        ) : (
          <ul className="mt-2">
            {sortedSchedules.map((schedule) => (
              <li
                key={schedule.id}
                className="flex items-center justify-between gap-3 border-t border-slate-100 py-4 text-sm first:border-t-0"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {new Date(schedule.scheduled_at).toLocaleString("ja-JP", {
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    ・ {getPropertyName(schedule.property_id)}
                  </p>
                  {schedule.memo && (
                    <p className="mt-1 text-xs text-slate-500">
                      {schedule.memo}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(schedule.id)}
                  className="text-xs text-rose-600 hover:underline"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
