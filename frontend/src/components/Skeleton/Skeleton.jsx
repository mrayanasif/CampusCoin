import "./Skeleton.css";

/**
 * Reusable shimmer placeholder used while data is loading.
 * Keeps layout stable so pages do not jump when content arrives.
 */
export function Skeleton({
  width = "100%",
  height = 16,
  radius = 8,
  className = "",
  style,
}) {
  return (
    <span
      className={`skeleton ${className}`.trim()}
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, gap = 8 }) {
  return (
    <div className="skeleton-text" style={{ gap }}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height={12}
          width={index === lines - 1 ? "62%" : "100%"}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ lines = 3, height = 18 }) {
  return (
    <div className="skeleton-card">
      <Skeleton height={height} width="48%" />
      <SkeletonText lines={lines} />
    </div>
  );
}

export function SkeletonChart({ height = 240 }) {
  return (
    <div className="skeleton-chart" style={{ height }}>
      <Skeleton height="100%" radius={10} />
    </div>
  );
}

export default Skeleton;
