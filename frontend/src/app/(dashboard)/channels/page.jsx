'use client';
import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/api';
import toast from 'react-hot-toast';

const ALL_PLATFORMS = [
  { id: 'linkedin', name: 'LinkedIn', icon: '🔷', color: '#0e76a8', note: 'Page + Personal' },
  { id: 'instagram', name: 'Instagram', icon: '📸', color: '#e1306c', note: 'Business account required' },
  { id: 'facebook', name: 'Facebook', icon: '📘', color: '#1877f2', note: 'Facebook Page' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', color: '#f0704a', note: 'Business account' },
  { id: 'twitter', name: 'X (Twitter)', icon: '🐦', color: '#1da1f2', note: 'Posts up to 280 chars' },
  { id: 'pinterest', name: 'Pinterest', icon: '📌', color: '#e60019', note: 'Business account' },
];

export default function ChannelsPage() {
  const { data: channels, refetch } = useQuery({ queryKey: ['channels'], queryFn: () => api.get('/channels') });

  async function connectBuffer() {
    try {
      const { url } = await api.get('/channels/buffer/auth-url');
      window.location.href = url;
    } catch (e) { toast.error(e.message); }
  }

  async function toggleChannel(id, current) {
    try {
      await api.patch(`/channels/${id}/toggle`, { is_active: !current });
      refetch();
    } catch (e) { toast.error(e.message); }
  }

  async function disconnect(id, name) {
    if (!confirm(`Disconnect ${name}?`)) return;
    try {
      await api.delete(`/channels/${id}`);
      toast.success(`${name} disconnected`);
      refetch();
    } catch (e) { toast.error(e.message); }
  }

  const connected = channels || [];
  const connectedIds = connected.map(c => c.platform);

  return (
    <div>
      <div style={{ height: '58px', background: '#111118', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', position: 'sticky', top: 0, zIndex: 50 }}>
        <h1 className="font-display" style={{ fontSize: '15px', fontWeight: 600 }}>Connected Channels</h1>
      </div>

      <div style={{ padding: '28px', maxWidth: '620px' }}>
        {/* Buffer connect CTA if nothing connected */}
        {connected.length === 0 && (
          <div style={{ background: 'rgba(124,111,232,0.06)', border: '1px solid rgba(124,111,232,0.2)', borderRadius: '12px', padding: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ fontSize: '28px' }}>🔗</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>Connect your social accounts</p>
              <p style={{ fontSize: '12.5px', color: '#8a88a0' }}>Connect via Buffer to enable autopublishing to LinkedIn, Instagram, Facebook, TikTok and more.</p>
            </div>
            <button className="btn-primary" onClick={connectBuffer} style={{ whiteSpace: 'nowrap' }}>Connect Buffer →</button>
          </div>
        )}

        {ALL_PLATFORMS.map(platform => {
          const ch = connected.find(c => c.platform === platform.id);
          const isConnected = !!ch;
          return (
            <div key={platform.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: '#18181f', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)', marginBottom: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${platform.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                {platform.icon}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: 500, marginBottom: '2px' }}>{platform.name}</p>
                <p style={{ fontSize: '11px', color: '#8a88a0' }}>
                  {isConnected ? `@${ch.account_name}` : platform.note}
                </p>
              </div>
              {isConnected ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {/* Active toggle */}
                  <div onClick={() => toggleChannel(ch.id, ch.is_active)}
                    style={{ width: '36px', height: '20px', position: 'relative', cursor: 'pointer' }}>
                    <div style={{ position: 'absolute', inset: 0, background: ch.is_active ? '#7c6fe8' : 'rgba(255,255,255,0.1)', borderRadius: '10px', transition: 'background 0.2s' }} />
                    <div style={{ position: 'absolute', top: '2px', left: ch.is_active ? '18px' : '2px', width: '16px', height: '16px', background: ch.is_active ? 'white' : '#8a88a0', borderRadius: '50%', transition: 'left 0.2s' }} />
                  </div>
                  <span style={{ fontSize: '12px', background: 'rgba(79,217,138,0.1)', color: '#4fd98a', border: '1px solid rgba(79,217,138,0.2)', padding: '4px 10px', borderRadius: '20px' }}>✓ Connected</span>
                  <button onClick={() => disconnect(ch.id, platform.name)}
                    style={{ background: 'transparent', border: 'none', color: '#8a88a0', cursor: 'pointer', fontSize: '16px', padding: '2px 6px' }}>×</button>
                </div>
              ) : (
                <button onClick={connectBuffer}
                  style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', background: 'rgba(124,111,232,0.1)', color: '#c47ef4', border: '1px solid rgba(124,111,232,0.25)', transition: 'all 0.12s' }}>
                  Connect
                </button>
              )}
            </div>
          );
        })}

        {/* GHL/WordPress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: 'rgba(124,111,232,0.04)', borderRadius: '10px', border: '1px solid rgba(124,111,232,0.15)', marginTop: '16px' }}>
          <div style={{ fontSize: '22px' }}>🌐</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '13px', fontWeight: 500, marginBottom: '2px' }}>GoHighLevel / WordPress</p>
            <p style={{ fontSize: '11px', color: '#8a88a0' }}>Auto-post to your website blog too</p>
          </div>
          <button style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', background: 'rgba(124,111,232,0.1)', color: '#c47ef4', border: '1px solid rgba(124,111,232,0.25)' }}>
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}
