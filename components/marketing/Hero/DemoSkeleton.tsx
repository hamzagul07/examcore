export function DemoSkeleton() {
  return (
    <div
      aria-hidden
      className="relative overflow-hidden rounded-[16px] border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-6 md:p-10"
    >
      <div className="h-3 w-48 rounded-full bg-[var(--ec-border)]" />
      <div className="mt-5 h-4 w-full rounded-full bg-[var(--ec-border)]" />
      <div className="mt-2 h-4 w-5/6 rounded-full bg-[var(--ec-border)]" />
      <div className="mt-8 space-y-[1.05em]">
        <div className="h-6 w-2/3 rounded-full bg-[var(--ec-border)]" />
        <div className="h-6 w-1/2 rounded-full bg-[var(--ec-border)]" />
        <div className="h-6 w-3/4 rounded-full bg-[var(--ec-border)]" />
        <div className="h-6 w-2/5 rounded-full bg-[var(--ec-border)]" />
      </div>
    </div>
  )
}
