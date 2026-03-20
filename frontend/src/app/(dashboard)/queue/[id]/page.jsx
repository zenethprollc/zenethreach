'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';

export default function PostDetailPage({ params }) {
  const { id } = params;
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState('');
  const [platform, setPlatform] = useState('linkedin');
  const [saving, setSaving] = useState(false);

  const { data: post, refetch } = useQuery({
    queryKey: ['post', id],
    queryFn: () => api.get(`/queue/${id}`),
  });

  useEffect(() => {
    if (post) setCaption(post[`${platform}_caption`] || '');
  }, [post, platform]);

  async function handleApprove() {
    try {
      await api.post(`/queue/${id}/approve`);
      toast.success('Post approved and scheduled!');
      router.push('/queue');
    } catch (e) { toast.error(e.message); }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch(`/queue/${id}`, { [`${platform}_caption`]: caption });
      toast.success('Saved!');
      refetch();
      setEditing(false);
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  }

  async function handleDiscard() {
    if (!confirm('Discard this post?')) return;
    await api.post(`/queue/${id}/discard`);
    toast.success('Post discarded');
    router.push('/queue');
  }

  if (!post) return <div style={{ padding: '60px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  const platforms = ['linkedin', 'instagram', 'facebook', 'tiktok'];
  const statusColor = { pending: '#f0b93a', scheduled: '#3ecfb2', published: '#4fd98a' }[post.status] || '#8a88a0';

  return (
    <div>
      <div style={{ height: '58px', background: '#111118', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '12px', padding: '0 28px', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => router.push('/queue')} style={{ background: 'none', border: 'none', color: '#8a88a0', cursor: 'pointer', fontSize: '18px' }}>←</button>
        <h1 className="font-display" style={{ fontSize: '15px', fontWeight: 600, flex: 1 }}>
          {post.graphic_headline || 'Edit Post'}
        </h1>
        <span style={{ fontSize: '11px', color: statusColor, background: `${statusColor}20`, padding: '3px 10px', borderRadius: '20px', textTransform: 'capitalize' }}>
          {post.status}
        </span>
      </div>

      <div style={{ padding: '28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left: Graphic preview */}
        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header"><span style={{ fontWeight: 600, fontSize: '13px' }}>🎨 Graphic preview</span></div>
            <div style={{ padding: '20px' }}>
              {post.image_url ? (
                <img src={post.image_url} alt="Post graphic" style={{ width: '100%', borderRadius: '10px' }} />
              ) : (
                <div style={{ aspectRatio: '1', background: 'linear-gradient(135deg, #7c6fe8, #c47ef4)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '20px', color: 'white', marginBottom: '8px' }}>
                    {post.graphic_headline}
                  </p>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{post.graphic_subheadline}</p>
                </div>
              )}
            </div>
          </div>

          {/* Hashtags */}
          <div className="card">
            <div className="card-header"><span style={{ fontWeight: 600, fontSize: '13px' }}>🏷 Hashtags</span></div>
            <div style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {(post.hashtags || []).map(tag => (
                <span key={tag} style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', background: 'rgba(63,207,178,0.1)', color: '#3ecfb2', border: '1px solid rgba(63,207,178,0.2)' }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Captions */}
        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <span style={{ fontWeight: 600, fontSize: '13px' }}>✍️ Caption editor</span>
              {!editing && post.status !== 'published' && (
                <button className="btn-ghost" style={{ fontSize: '12px', padding: '5px 12px' }} onClick={() => setEditing(true)}>Edit</button>
              )}
            </div>
            <div style={{ padding: '16px' }}>
              {/* Platform tabs */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '14px' }}>
                {platforms.map(p => (
                  <button key={p} onClick={() => setPlatform(p)}
                    style={{ flex: 1, padding: '7px', borderRadius: '7px', fontSize: '11px', cursor: 'pointer', textTransform: 'capitalize', border: 'none', background: platform === p ? 'rgba(124,111,232,0.15)' : 'transparent', color: platform === p ? '#c47ef4' : '#8a88a0', transition: 'all 0.12s' }}>
                    {p}
                  </button>
                ))}
              </div>

              {editing ? (
                <>
                  <textarea
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    style={{ width: '100%', minHeight: '200px', background: '#18181f', border: '1px solid #7c6fe8', borderRadius: '8px', padding: '12px', color: '#f0eff8', fontSize: '13px', lineHeight: '1.6', resize: 'vertical', outline: 'none', fontFamily: 'Inter, sans-serif' }}
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button className="btn-ghost" onClick={() => setEditing(false)} style={{ flex: 1 }}>Cancel</button>
                    <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
                      {saving ? 'Saving...' : 'Save changes'}
                    </button>
                  </div>
                </>
              ) : (
                <p style={{ fontSize: '13px', lineHeight: '1.7', color: '#f0eff8', whiteSpace: 'pre-wrap' }}>
                  {post[`${platform}_caption`] || 'No caption for this platform.'}
                </p>
              )}
            </div>
          </div>

          {/* Scheduled time */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header"><span style={{ fontWeight: 600, fontSize: '13px' }}>📅 Scheduled for</span></div>
            <div style={{ padding: '16px' }}>
              <p style={{ color: '#3ecfb2', fontSize: '14px', fontWeight: 500 }}>
                {post.scheduled_for ? new Date(post.scheduled_for).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not scheduled'}
              </p>
            </div>
          </div>

          {/* Actions */}
          {post.status !== 'published' && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleDiscard}
                style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(240,112,74,0.2)', background: 'transparent', color: '#f0704a', cursor: 'pointer', fontSize: '13px' }}>
                Discard
              </button>
              {post.status === 'pending' && (
                <button className="btn-primary" onClick={handleApprove} style={{ flex: 1, padding: '12px' }}>
                  ✓ Approve & Schedule
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
