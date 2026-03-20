'use client';
import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';

function MetricCard({ label, value, change, color }) {
  return (
    <div className="card" style={{ padding: '20px' }}>
      <p style={{ fontSize: '11px', color: '#8a88a0', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>{label}</p>
      <p className="font-display" style={{ fontSize: '28px', fontWeight: 700, color: color || '#f0eff8', marginBottom: '4px' }}>{value}</p>
      {change && <p style={{ fontSize: '12px', color: change.startsWith('↑') ? '#4fd98a' : '#f0704a' }}>{change}</p>}
    </div>
  );
}

function PostItem({ post, onApprove }) {
  const statusClass = { pending: 'tag-pending', scheduled: 'tag-scheduled', published: 'tag-published' }[post.status] || 'tag-discarded';
  return (
    <div style={{ display: 'flex', gap: '14px', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}>
      <div style={{
        width: '52px', height: '52px', borderRadius: '10px', flexShrink: 0,
        background: 'linear-gradient(135deg, #7c6fe8, #c47ef4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px'
      }}>
        {post.content_type === 'trend_response' ? '🔥' : post.content_type === 'educational' ? '💡' : '📣'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13.5px', fontWeight: 500, marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {post.graphic_headline || 'Generating...'}
        </p>
        <p style={{ fontSize: '12px', color: '#8a88a0', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {(post.linkedin_caption || '').substring(0, 80)}...
        </p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(post.target_platforms || []).map(p => <span key={p} className="tag tag-platform">{p}</span>)}
          <span className={`tag ${statusClass}`}>{post.status}</span>
        </div>
      </div>
      {post.status === 'pending' && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <button onClick={() => onApprove(post.id)}
            style={{ width: '30px', height: '30px', borderRadius: '7px', border: '1px solid rgba(79,217,138,0.3)', background: 'rgba(79,217,138,0.08)', color: '#4fd98a', cursor: 'pointer', fontSize: '14px' }}>
            ✓
          </button>
          <Link href={`/queue/${post.id}`}>
            <button style={{ width: '30px', height: '30px', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: '#8a88a0', cursor: 'pointer', fontSize: '13px' }}>
              ✎
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { data: analytics } = useQuery({ queryKey: ['analytics-summary'], queryFn: () => api.get('/analytics/summary') });
  const { data: queueData, refetch: refetchQueue } = useQuery({ queryKey: ['queue-recent'], queryFn: () => api.get('/queue?limit=4') });
  const { data: settings } = useQuery({ queryKey: ['schedule-settings'], queryFn: () => api.get('/settings/schedule') });

  const posts = queueData?.posts || [];
  const pendingCount = posts.filter(p => p.status === 'pending').length;

  async function approvePost(id) {
    try {
      await api.post(`/queue/${id}/approve`);
      toast.success('Post approved and scheduled!');
      refetchQueue();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function generatePost() {
    try {
      await api.post('/queue/generate', { content_type: 'trend_response' });
      toast.success('Generating post — check back in ~15 seconds');
      setTimeout(refetchQueue, 15000);
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div>
      {/* Top bar */}
      <div style={{ height: '58px', background: '#111118', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', position: 'sticky', top: 0, zIndex: 50 }}>
        <h1 className="font-display" style={{ fontSize: '15px', fontWeight: 600 }}>Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#4fd98a' }}>
            <div className="pulse" style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4fd98a' }} />
            {settings?.autopilot_enabled ? 'Autopilot running' : 'Autopilot paused'}
          </div>
          <button className="btn-ghost" onClick={generatePost}>✦ Generate post</button>
          {pendingCount > 0 && (
            <Link href="/queue">
              <button className="btn-primary">Review queue ({pendingCount})</button>
            </Link>
          )}
        </div>
      </div>

      <div style={{ padding: '28px' }}>
        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <MetricCard label="Posts this month" value={analytics?.total_posts || 0} color="#c47ef4" change="↑ Autopilot active" />
          <MetricCard label="Total reach" value={analytics?.reach ? `${(analytics.reach / 1000).toFixed(1)}K` : '0'} color="#3ecfb2" />
          <MetricCard label="Avg engagement" value={analytics?.engagement_rate ? `${analytics.engagement_rate}%` : '—'} color="#f0b93a" />
          <MetricCard label="Pending review" value={pendingCount} color={pendingCount > 0 ? '#f0704a' : '#4fd98a'} change={pendingCount > 0 ? 'Needs your review' : 'All clear'} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Queue preview */}
          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 600, fontSize: '14px' }}>📋 Upcoming queue</span>
              <Link href="/queue"><button className="btn-ghost" style={{ fontSize: '12px', padding: '5px 12px' }}>View all →</button></Link>
            </div>
            {posts.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#8a88a0', fontSize: '13px' }}>
                No posts yet. Click "Generate post" to create your first one.
              </div>
            ) : (
              posts.map(post => <PostItem key={post.id} post={post} onApprove={approvePost} />)
            )}
          </div>

          {/* Platform performance */}
          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 600, fontSize: '14px' }}>📊 Platform performance</span>
            </div>
            <PlatformPerformance />
          </div>
        </div>
      </div>
    </div>
  );
}

function PlatformPerformance() {
  const { data } = useQuery({ queryKey: ['platform-analytics'], queryFn: () => api.get('/analytics/platforms') });
  const platforms = data || {};
  const maxReach = Math.max(...Object.values(platforms).map(p => p.reach), 1);
  const colors = { linkedin: '#0e76a8', instagram: '#e1306c', facebook: '#1877f2', tiktok: '#f0704a' };

  if (!Object.keys(platforms).length) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#8a88a0', fontSize: '13px' }}>
      Connect channels to see performance data.
    </div>
  );

  return (
    <div style={{ padding: '16px 20px' }}>
      {Object.entries(platforms).map(([platform, stats]) => (
        <div key={platform} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize: '13px', width: '80px', textTransform: 'capitalize' }}>{platform}</span>
          <div style={{ flex: 1, height: '6px', background: '#18181f', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(stats.reach / maxReach) * 100}%`, background: colors[platform] || '#7c6fe8', borderRadius: '3px', transition: 'width 0.4s' }} />
          </div>
          <span style={{ fontSize: '12px', color: '#8a88a0', width: '50px', textAlign: 'right' }}>
            {stats.reach > 1000 ? `${(stats.reach / 1000).toFixed(1)}K` : stats.reach}
          </span>
        </div>
      ))}
    </div>
  );
}
