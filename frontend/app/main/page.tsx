import Link from "next/link";

export default function MainPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">メインメニュー</h1>
      <p className="mt-2 text-slate-600">次の操作を選んでください</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/properties/create"
          className="rounded-xl border border-slate-200 bg-white p-5 hover:bg-slate-50"
        >
          <p className="font-semibold text-slate-900">物件を登録する</p>
          <p className="mt-1 text-sm text-slate-600">
            比較したい物件情報を追加します
          </p>
        </Link>

        <Link
          href="/properties"
          className="rounded-xl border border-slate-200 bg-white p-5 hover:bg-slate-50"
        >
          <p className="font-semibold text-slate-900">物件一覧を見る</p>
          <p className="mt-1 text-sm text-slate-600">
            登録済みデータを確認します
          </p>
        </Link>

        <Link
          href="/compare"
          className="rounded-xl border border-slate-200 bg-white p-5 hover:bg-slate-50"
        >
          <p className="font-semibold text-slate-900">物件を比較する</p>
          <p className="mt-1 text-sm text-slate-600">
            登録済みの物件を比較します
          </p>
        </Link>
        <Link
          href="/register"
          className="rounded-xl border border-slate-200 bg-white p-5 hover:bg-slate-50"
        >
          <p className="font-semibold text-slate-900">新規登録</p>
          <p className="mt-1 text-sm text-slate-600">ユーザーを作成します</p>
        </Link>

        <Link
          href="/login"
          className="rounded-xl border border-slate-200 bg-white p-5 hover:bg-slate-50"
        >
          <p className="font-semibold text-slate-900">ログイン</p>
          <p className="mt-1 text-sm text-slate-600">
            登録済みユーザーでログインします
          </p>
        </Link>
      </div>
    </main>
  );
}
