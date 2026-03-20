'use client';
// ============================================================
// ANALYTICS PAGE
// ============================================================
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../../../lib/api';

export default function AnalyticsPage() {
  const { data: summary } = useQuery({ queryKey: ['analytics-summary'], queryFn: () => api.get('/analytics/summary') });
  const { data: platforms } = useQuery({ queryKey: ['platform-analytics'], queryFn: () => api.get('/analytics/platforms') });
  const { data: posts } = useQuery({ queryKey: ['analytics-posts'], queryFn: () => api.get('/analytics/posts') });

  const platformData = Object.entries(platforms || {}).map(([name, stats]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    reach: stats.reach,
    engagement: stats.avg_engagement,
  }));

  const COLORS = { LinkedIn: '#0e76a8', Instagram: '#e1306c', Facebook: '#1877f2', Tiktok: '#f0704a', Twitter: '#1da1f2' };

  return (
    <div>
      <div style={{ height: '58px', background: '#111118', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', padding: '0 28px', position: 'sticky', top: 0, zIndex: 50 }}>
        <h1 className="font-display" style={{ fontSize: '15px', fontWeight: 600 }}>Analytics</h1>
      </div>
      <div style={{ padding: '28px' }}>
        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total posts', value: summary?.total_posts || 0, color: '#c47ef4' },
            { label: 'Total reach', value: summary?.reach ? `${Math.round(summary.reach/1000)}K` : '0', color: '#3ecfb2' },
            { label: 'Avg engagement', value: summary?.engagement_rate ? `${summary.engagement_rate}%` : '—', color: '#f0b93a' },
            { label: 'Total likes', value: summary?.likes || 0, color: '#4fd98a' },
          ].map(m => (
            <div key={m.label} className="card" style={{ padding: '20px' }}>
              <p style={{ fontSize: '11px', color: '#8a88a0', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>{m.label}</p>
              <p className="font-display" style={{ fontSize: '28px', fontWeight: 700, color: m.color }}>{m.value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Platform reach chart */}
          <div className="card">
            <div className="card-header"><span style={{ fontWeight: 600, fontSize: '14px' }}>📊 Reach by platform</span></div>
            <div style={{ padding: '20px' }}>
              {platformData.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#8a88a0', fontSize: '13px', padding: '20px' }}>No data yet — publish some posts to see analytics</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={platformData}>
                    <XAxis dataKey="name" tick={{ fill: '#8a88a0', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#8a88a0', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f0eff8', fontSize: '12px' }} />
                    <Bar dataKey="reach" radius={[4,4,0,0]}>
                      {platformData.map((entry) => (
                        <Cell key={entry.name} fill={COLORS[entry.name] || '#7c6fe8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top posts */}
          <div className="card">
            <div className="card-header"><span style={{ fontWeight: 600, fontSize: '14px' }}>🏆 Top performing posts</span></div>
            <div>
              {!(posts || []).length ? (
                <p style={{ padding: '30px', textAlign: 'center', color: '#8a88a0', fontSize: '13px' }}>No post data yet</p>
              ) : (
                (posts || []).slice(0, 5).map((row, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: '#3ecfb2', width: '24px' }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '12.5px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.post_queue?.graphic_headline || 'Post'}
                      </p>
                      <p style={{ fontSize: '11px', color: '#8a88a0', textTransform: 'capitalize' }}>{row.platform}</p>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#f0b93a' }}>{row.engagement_rate}%</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
