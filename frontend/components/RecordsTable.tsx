import type { StoredEmailRecord } from "../lib/types";

const categoryTone: Record<string, string> = {
  Scam: "#ff8ea1",
  "Likely Scam": "#ffb86b",
  Opportunity: "#8df7c8",
  Promotion: "#b8baff",
  Transactional: "#9bd6ff",
  "Verified Business": "#8df7c8",
  Personal: "#f4d35e",
  "Needs Review": "#d5d7de",
};

export default function RecordsTable({ records }: { records: StoredEmailRecord[] }) {
  return (
    <div className="card">
      <h3>Recent classified emails</h3>
      {records.length === 0 ? (
        <p>No saved emails yet. Sync Gmail or run a manual classification and the record will appear here.</p>
      ) : (
        <div className="recordsTableWrap">
          <table className="recordsTable">
            <thead>
              <tr>
                <th>Source</th>
                <th>Sender</th>
                <th>Subject</th>
                <th>Category</th>
                <th>Risk</th>
                <th>Confidence</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>
                    <div style={{ textTransform: "capitalize" }}>{record.source}</div>
                    {record.gmailMessageId ? <div className="subtle">{record.gmailMessageId.slice(0, 12)}…</div> : null}
                  </td>
                  <td>
                    <div>{record.senderName || "Unknown sender"}</div>
                    <div className="subtle">{record.senderEmail}</div>
                  </td>
                  <td>
                    <div>{record.subject}</div>
                    <div className="subtle clamp2">{record.bodyText}</div>
                  </td>
                  <td>
                    <span className="badge" style={{ color: categoryTone[record.category] || "white" }}>
                      {record.category}
                    </span>
                  </td>
                  <td>{record.riskScore}/100</td>
                  <td>{record.confidenceScore}/100</td>
                  <td>{new Date(record.receivedAt || record.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
