'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '../../../lib/api';
import toast from 'react-hot-toast';

export default function QueuePage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['queue', statusFilter],
    queryFn: () => api.get(`/queue${statusFilter !== 'all' ? `?status=${statusFilter}` : '?limit=30'}`),
  });

  const posts = data?.posts || [];
  const total = data?.total || 0;

  async function approve(id) {
    try {
      await api.post(`/queue/${id}/approve`);
      toast.success('Post approved!');
      refetch();
    } catch (e) { toast.error(e.message); }
  }

  async function discard(id) {
    if (!confirm('Discard this post?')) return;
    try {
      await api.post(`/queue/${id}/discard`);
      toast.success('Post discarded');
      refetch();
    } catch (e) { toast.error(e.message); }
  }

  async function generate() {
    try {
      await api.post('/queue/generate', { content_type: 'trend_response' });
      toast.success('Generating — check back in ~20 seconds');
      setTimeout(refetch, 20000);
    } catch (e) { toast.error(e.message); }
  }

  const filters = ['all', 'pending', 'scheduled', 'published', 'discarded'];
  const statusClass = { pending: 'tag-pending', scheduled: 'tag-scheduled', published: 'tag-published', discarded: 'tag-discarded' };

  return (
    <div>
      <div style={{ height: '58px', background: '#111118', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', position: 'sticky', top: 0, zIndex: 50 }}>
        <h1 className="font-display" style={{ fontSize: '15px', fontWeight: 600 }}>Post Queue</h1>
        <button className="btn-primary" onClick={generate}>✦ Generate new post</button>
      </div>

      <div style={{ padding: '28px' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {filters.map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              style={{
                padding: '7px 16px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
                background: statusFilter === f ? 'rgba(124,111,232,0.15)' : 'transparent',
                color: statusFilter === f ? '#c47ef4' : '#8a88a0',
                border: `1px solid ${statusFilter === f ? 'rgba(124,111,232,0.3)' : 'rgba(255,255,255,0.07)'}`,
                transition: 'all 0.12s', textTransform: 'capitalize',
              }}>
              {f} {f === 'all' ? `(${total})` : ''}
            </button>
          ))}
        </div>

        <div className="card">
          {isLoading && <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>}
          {!isLoading && posts.length === 0 && (
            <div style={{ padding: '60px', textAlign: 'center', color: '#8a88a0' }}>
              <p style={{ fontSize: '15px', marginBottom: '8px' }}>No posts here yet</p>
              <p style={{ fontSize: '12px' }}>Click "Generate new post" to create content with AI</p>
            </div>
          )}
          {posts.map((post, i) => (
            <div key={post.id} style={{ display: 'flex', gap: '14px', padding: '16px 20px', borderBottom: i < posts.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '10px', flexShrink: 0, background: 'linear-gradient(135deg, #7c6fe8, #c47ef4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                {post.content_type === 'trend_response' ? '🔥' : post.content_type === 'educational' ? '💡' : '📣'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13.5px', fontWeight: 500, marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {post.graphic_headline || 'Post #' + post.id.substring(0, 8)}
                </p>
                <p style={{ fontSize: '12px', color: '#8a88a0', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {(post.linkedin_caption || '').substring(0, 100)}...
                </p>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {(post.target_platforms || []).map(p => <span key={p} className="tag tag-platform">{p}</span>)}
                  <span className={`tag ${statusClass[post.status] || 'tag-discarded'}`}>{post.status}</span>
                  {post.scheduled_for && <span style={{ fontSize: '10px', color: '#8a88a0' }}>
                    {new Date(post.scheduled_for).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', paddingTop: '2px' }}>
                {post.status === 'pending' && (
                  <button onClick={() => approve(post.id)}
                    style={{ width: '30px', height: '30px', borderRadius: '7px', border: '1px solid rgba(79,217,138,0.3)', background: 'rgba(79,217,138,0.08)', color: '#4fd98a', cursor: 'pointer', fontSize: '14px' }}>✓</button>
                )}
                <Link href={`/queue/${post.id}`}>
                  <button style={{ width: '30px', height: '30px', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: '#8a88a0', cursor: 'pointer', fontSize: '13px' }}>✎</button>
                </Link>
                {post.status !== 'published' && (
                  <button onClick={() => discard(post.id)}
                    style={{ width: '30px', height: '30px', borderRadius: '7px', border: '1px solid rgba(240,112,74,0.2)', background: 'transparent', color: '#f0704a', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
