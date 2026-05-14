export function Skeleton({ width = '100%', height = 16, className = '', rounded = 6 }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius: rounded,
        background:
          'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.4s ease-in-out infinite',
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div
      style={{
        padding: 16,
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        marginBottom: 8,
      }}
    >
      <Skeleton width="60%" height={18} />
      <div style={{ height: 8 }} />
      <Skeleton width="40%" height={12} />
      <div style={{ height: 12 }} />
      <Skeleton width="100%" height={10} />
      <div style={{ height: 4 }} />
      <Skeleton width="90%" height={10} />
    </div>
  );
}

export function SkeletonList({ count = 5 }) {
  return Array.from({ length: count }, (_, i) => <SkeletonCard key={i} />);
}
