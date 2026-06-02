export default function Loading() {
  return (
    <main className="min-h-screen bg-[#fffdfb] px-4 py-6 text-[#242124]" role="status" aria-live="polite">
      <div className="mx-auto grid max-w-[520px] animate-pulse gap-4">
        <div className="h-12 rounded-full bg-[#f8f4f0] shadow-[0_10px_28px_rgba(58,48,50,0.04)] ring-1 ring-[#eadfda]" />
        <div className="h-[42svh] rounded-[24px] bg-[#f8f4f0] shadow-[0_18px_44px_rgba(58,48,50,0.06)] ring-1 ring-[#eadfda]" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-28 rounded-[18px] bg-[#f8f4f0] shadow-[0_10px_28px_rgba(58,48,50,0.04)] ring-1 ring-[#eadfda]" />
          <div className="h-28 rounded-[18px] bg-[#f8f4f0] shadow-[0_10px_28px_rgba(58,48,50,0.04)] ring-1 ring-[#eadfda]" />
        </div>
        <p className="text-center text-sm font-semibold text-[#7a7470]">마이썬 운동일지를 불러오는 중입니다.</p>
      </div>
    </main>
  );
}
