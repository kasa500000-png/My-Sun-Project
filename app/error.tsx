"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#fffdfb] px-5 text-[#242124]">
      <section className="w-full max-w-sm rounded-[24px] bg-[#faf4f1] p-6 text-center ring-1 ring-[#eadfda]">
        <p className="text-sm font-semibold text-[#7a7470]">잠시 멈췄어요</p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">화면을 다시 불러와 주세요</h1>
        <p className="mt-4 text-sm leading-6 text-[#4b4541]">
          네트워크가 불안정하거나 앱 화면을 불러오는 중 문제가 생겼습니다.
        </p>
        {error?.digest && (
          <p className="mt-3 text-xs font-medium text-[#7a7470]">오류 코드: {error.digest}</p>
        )}
        <button
          className="mt-6 h-12 w-full rounded-full bg-[#242124] text-base font-semibold text-[#fffdfb]"
          onClick={reset}
        >
          다시 시도
        </button>
      </section>
    </main>
  );
}
