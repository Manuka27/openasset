export default function Loading() {
  return <div role="status" aria-label="Loading workspace" className="space-y-5 pt-4">
    <div className="oa-skeleton h-9 w-40 motion-safe:animate-pulse" />
    <div className="oa-metrics">{Array.from({ length: 6 }, (_, index) => <div key={index} className="oa-skeleton h-28 motion-safe:animate-pulse" />)}</div>
    <div className="oa-skeleton h-48 motion-safe:animate-pulse" />
  </div>;
}
