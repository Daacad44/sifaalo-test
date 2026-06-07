export default function TestBanner() {
  return (
    <div className="bg-amber-400 text-amber-950">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-2 text-center text-xs font-bold uppercase tracking-wide sm:text-sm">
        <span aria-hidden>⚠️</span>
        Test Environment - No Real Products
      </div>
    </div>
  );
}
