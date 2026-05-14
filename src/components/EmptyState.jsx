export function EmptyState({ icon = '📭', title, description, action }) {
  return (
    <div
      style={{
        padding: '40px 20px',
        textAlign: 'center',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: 12,
        border: '1px dashed rgba(255,255,255,0.08)',
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.7 }}>{icon}</div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: '#E5EAF0',
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            fontSize: 13,
            color: '#9DA8B5',
            marginBottom: action ? 16 : 0,
          }}
        >
          {description}
        </div>
      )}
      {action}
    </div>
  );
}
