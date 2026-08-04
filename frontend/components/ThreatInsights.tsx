'use client';

import { useMemo } from 'react';
import type { StoredEmailRecord } from '../lib/types';

const tones: Record<string, string> = {
  Scam: '#ff5575',
  'Likely Scam': '#ff9f43',
  'Needs Review': '#f4d35e',
  Opportunity: '#39d98a',
  Promotion: '#5da9ff',
  Transactional: '#7c8cff',
  'Verified Business': '#39d98a',
  Personal: '#d28cff',
};

export default function ThreatInsights({ records }: { records: StoredEmailRecord[] }) {
  const insight = useMemo(() => {
    const categories = new Map<string, number>();
    const domains = new Map<string, { count: number; totalRisk: number }>();
    let totalRisk = 0;
    let highRisk = 0;

    for (const record of records) {
      categories.set(record.category, (categories.get(record.category) || 0) + 1);
      totalRisk += record.riskScore;
      if (record.riskScore >= 70) highRisk += 1;
      const domain = record.senderEmail.split('@')[1]?.toLowerCase() || 'unknown';
      const current = domains.get(domain) || { count: 0, totalRisk: 0 };
      domains.set(domain, { count: current.count + 1, totalRisk: current.totalRisk + record.riskScore });
    }

    const categoryRows = [...categories.entries()].sort((a, b) => b[1] - a[1]);
    const domainRows = [...domains.entries()]
      .map(([domain, value]) => ({ domain, count: value.count, risk: Math.round(value.totalRisk / value.count) }))
      .sort((a, b) => b.risk - a.risk || b.count - a.count)
      .slice(0, 5);

    return {
      averageRisk: records.length ? Math.round(totalRisk / records.length) : 0,
      highRisk,
      categoryRows,
      domainRows,
      maxCategory: Math.max(1, ...categoryRows.map(([, count]) => count)),
    };
  }, [records]);

  return (
    <section className="insightsGrid" id="reports">
      <article className="insightPanel">
        <div className="insightHeading"><div><span className="eyebrow">THREAT INTELLIGENCE</span><h2>Inbox risk profile</h2></div><strong className="riskDial">{insight.averageRisk}<small>/100</small></strong></div>
        <div className="riskSummary"><div><span>Average risk</span><strong>{insight.averageRisk}%</strong></div><div><span>High-risk emails</span><strong>{insight.highRisk}</strong></div><div><span>Categories found</span><strong>{insight.categoryRows.length}</strong></div></div>
        <p className="insightNote">Scores are based on the messages currently saved in Inbox Outlaw.</p>
      </article>

      <article className="insightPanel">
        <div className="insightHeading"><div><span className="eyebrow">CATEGORY MIX</span><h2>What is reaching your inbox</h2></div></div>
        <div className="categoryBars">
          {insight.categoryRows.length ? insight.categoryRows.map(([name, count]) => (
            <div className="categoryBar" key={name}>
              <div><span>{name}</span><strong>{count}</strong></div>
              <i><b style={{ width: `${(count / insight.maxCategory) * 100}%`, background: tones[name] || '#8b5cf6' }} /></i>
            </div>
          )) : <p className="insightNote">Sync Gmail to generate category insights.</p>}
        </div>
      </article>

      <article className="insightPanel wideInsight">
        <div className="insightHeading"><div><span className="eyebrow">SENDER WATCH</span><h2>Highest-risk sender domains</h2></div></div>
        {insight.domainRows.length ? <div className="domainWatch">
          {insight.domainRows.map((item) => <div key={item.domain}><span className="domainIcon">@</span><div><strong>{item.domain}</strong><small>{item.count} message{item.count === 1 ? '' : 's'}</small></div><b className={item.risk >= 70 ? 'critical' : item.risk >= 40 ? 'caution' : 'safe'}>{item.risk}% risk</b></div>)}
        </div> : <p className="insightNote">No sender-domain data is available yet.</p>}
      </article>
    </section>
  );
}
