export default function Loading() {
  return (
    <main className="min-h-screen bg-[#fffdfb] px-4 py-6 text-[#242124]">
      <div className="mx-auto grid max-w-[520px] gap-4">
        <div className="h-12 rounded-full bg-[#faf4f1] ring-1 ring-[#eadfda]" />
        <div className="h-[42svh] rounded-[24px] bg-[#faf4f1] ring-1 ring-[#eadfda]" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-28 rounded-[18px] bg-[#faf4f1] ring-1 ring-[#eadfda]" />
          <div className="h-28 rounded-[18px] bg-[#faf4f1] ring-1 ring-[#eadfda]" />
        </div>
        <p className="text-center text-sm font-medium text-[#7a7470]">마이썬 운동일지를 불러오는 중입니다.</p>
      </div>
    </main>
  );
}
