import type { ActivityLogEntry } from '../lib/types';

const tone: Record<ActivityLogEntry['type'], string> = {
  login: '#8df7c8',
  manual_classification: '#b8baff',
  gmail_connected: '#9bd6ff',
  gmail_disconnected: '#ffb86b',
  gmail_synced: '#8df7c8',
  logout: '#f4d35e',
};

export default function ActivityFeed({ items }: { items: ActivityLogEntry[] }) {
  return (
    <div className="card">
      <h3>Recent activity</h3>
      {items.length === 0 ? (
        <p>No activity yet. Sign in, connect Gmail, or classify an email and events will appear here.</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {items.map((item) => (
            <div key={item.id} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
                <span className="badge" style={{ color: tone[item.type] }}>{item.type.replace(/_/g, ' ')}</span>
                <span className="subtle">{new Date(item.createdAt).toLocaleString()}</span>
              </div>
              <div>{item.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
