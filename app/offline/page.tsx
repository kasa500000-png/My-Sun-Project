import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-[#fffdfb] px-5 py-8 text-[#242124]">
      <section className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-sm flex-col justify-center">
        <div className="rounded-[28px] bg-[#fffdfb] p-6 shadow-[0_18px_44px_rgba(58,48,50,0.08)] ring-1 ring-[#eadfda]">
          <p className="text-sm font-semibold text-[#7a7470]">오프라인 상태</p>
          <h1 className="mt-2 text-[28px] font-extrabold leading-tight tracking-[-0.01em]">
            연결이 돌아오면 다시 이어갈 수 있어요
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#4b4541]">
            네트워크가 끊겨 새 데이터를 불러오지 못했습니다. 저장 전인 운동 기록은 연결을 확인한 뒤 다시 저장해 주세요.
          </p>
          <Link
            className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#242124] text-base font-semibold text-[#fffdfb]"
            href="/"
          >
            다시 확인
          </Link>
        </div>
      </section>
    </main>
  );
}
