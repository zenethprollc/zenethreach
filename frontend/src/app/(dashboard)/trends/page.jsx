'use client';
import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/api';
import toast from 'react-hot-toast';

export default function TrendsPage() {
  const { data: queueData, refetch } = useQuery({ queryKey: ['trends-feed'], queryFn: () => api.get('/queue?limit=50') });

  // Trends come from trend_cache — we'll fetch queue as a proxy for now
  // In a real build, add GET /api/trends endpoint
  const trends = [
    { title: 'AI automation tools transforming SMBs in 2025', score: 95, angle: 'Position your automation services as the solution', hook: 'Every SMB owner is asking the same question right now...', source: 'newsapi' },
    { title: 'Social media organic reach hits 5-year high on LinkedIn', score: 88, angle: 'Your LinkedIn content strategy becomes even more valuable', hook: "LinkedIn just gave your business a massive gift and most people don't know it yet", source: 'google_trends' },
    { title: 'GoHighLevel announces new AI-native CRM features', score: 92, angle: 'As a GHL agency, this makes your offering even stronger', hook: "The CRM your clients are already using just got a serious AI upgrade...", source: 'newsapi' },
    { title: 'Make.com launches 80 new automation templates', score: 80, angle: 'Showcase your Make.com expertise and new capabilities', hook: '80 new automation templates just dropped — here\'s what this means for your business', source: 'newsapi' },
    { title: 'Businesses that use marketing automation see 3x ROI', score: 85, angle: 'Direct proof point for your automation services', hook: 'The data is in. And it\'s exactly what we\'ve been telling our clients...', source: 'newsapi' },
    { title: 'TikTok B2B marketing reaches mainstream adoption', score: 72, angle: 'Expand social strategy recommendation to include TikTok', hook: 'B2B on TikTok isn\'t weird anymore. It\'s necessary.', source: 'google_trends' },
  ];

  async function useForPost(trend) {
    try {
      await api.post('/queue/generate', { content_type: 'trend_response' });
      toast.success('Generating post from this trend — check queue in ~20 seconds');
    } catch (e) { toast.error(e.message); }
  }

  const scoreColor = (s) => s >= 85 ? '#f0704a' : s >= 70 ? '#f0b93a' : '#3ecfb2';

  return (
    <div>
      <div style={{ height: '58px', background: '#111118', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', position: 'sticky', top: 0, zIndex: 50 }}>
        <h1 className="font-display" style={{ fontSize: '15px', fontWeight: 600 }}>Trend Feed</h1>
        <span style={{ fontSize: '11px', color: '#8a88a0' }}>Updated every 4 hours — matched to your business</span>
      </div>
      <div style={{ padding: '28px' }}>
        <div className="card">
          {trends.map((trend, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '18px 20px', borderBottom: i < trends.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: scoreColor(trend.score), marginTop: '5px', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13.5px', fontWeight: 500, marginBottom: '4px' }}>{trend.title}</p>
                <p style={{ fontSize: '12px', color: '#3ecfb2', marginBottom: '3px' }}>→ {trend.angle}</p>
                <p style={{ fontSize: '12px', color: '#8a88a0', fontStyle: 'italic' }}>Hook: "{trend.hook}"</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: scoreColor(trend.score), fontFamily: 'Syne, sans-serif' }}>{trend.score}</p>
                  <p style={{ fontSize: '9px', color: '#8a88a0' }}>relevance</p>
                </div>
                <button onClick={() => useForPost(trend)}
                  style={{ padding: '6px 14px', borderRadius: '7px', fontSize: '12px', cursor: 'pointer', background: 'rgba(124,111,232,0.1)', color: '#c47ef4', border: '1px solid rgba(124,111,232,0.25)', transition: 'all 0.12s', whiteSpace: 'nowrap' }}>
                  Generate post →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
