import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#fffdfb] px-5 text-[#242124]">
      <section className="w-full max-w-sm rounded-[24px] bg-[#fffdfb] p-6 text-center shadow-[0_14px_36px_rgba(58,48,50,0.06)] ring-1 ring-[#eadfda]">
        <p className="text-sm font-semibold text-[#7a7470]">페이지를 찾지 못했어요</p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">다시 운동일지로 돌아갈게요</h1>
        <p className="mt-4 text-sm leading-6 text-[#4b4541]">
          주소가 바뀌었거나 사용할 수 없는 화면입니다.
        </p>
        <Link
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#242124] text-base font-semibold text-[#fffdfb]"
          href="/"
        >
          홈으로 이동
        </Link>
      </section>
    </main>
  );
}
