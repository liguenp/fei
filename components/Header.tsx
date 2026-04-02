export default function Header() {
  return (
    <header className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-fei-500 text-sm font-semibold text-white">
          飞
        </div>
        <div>
          <h1 className="text-sm font-semibold text-stone-900">Fēi</h1>
          <p className="text-[11px] text-stone-400">China trip planner</p>
        </div>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="rounded-lg px-3 py-1.5 text-xs text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
      >
        New trip
      </button>
    </header>
  );
}
