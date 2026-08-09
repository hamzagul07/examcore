export function DemoSkeleton() {
  return (
    <div>
      <div
        aria-hidden
        className="relative min-h-[380px] overflow-hidden rounded border border-[var(--ec-border)] bg-[var(--ec-paper)] p-6 shadow-[var(--ec-shadow-hard)] md:min-h-[420px] md:p-10"
      >
        <div className="h-3 w-48 rounded-[2px] bg-[var(--ec-border)]" />
        <div className="mt-5 h-4 w-full rounded-[2px] bg-[var(--ec-border)]" />
        <div className="mt-2 h-4 w-5/6 rounded-[2px] bg-[var(--ec-border)]" />
        <div className="mt-8 space-y-[1.05em]">
          <div className="h-7 w-2/3 rounded-[2px] bg-[var(--ec-border)]" />
          <div className="h-7 w-1/2 rounded-[2px] bg-[var(--ec-border)]" />
          <div className="h-7 w-3/4 rounded-[2px] bg-[var(--ec-border)]" />
          <div className="h-7 w-2/5 rounded-[2px] bg-[var(--ec-border)]" />
        </div>
      </div>
      <div
        aria-hidden
        className="mx-auto mt-4 h-3 max-w-[320px] rounded-[2px] bg-[var(--ec-border)]"
      />
    </div>
  )
}
