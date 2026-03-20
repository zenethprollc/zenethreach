'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/api';
import toast from 'react-hot-toast';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const FREQS = [1,2,3,4,5,7];
const TIMES = ['08:00','09:00','10:00','12:00','14:00','17:00','18:00','20:00'];

function Toggle({ checked, onChange }) {
  return (
    <div onClick={onChange} style={{ width: '40px', height: '22px', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: 0, background: checked ? '#7c6fe8' : 'rgba(255,255,255,0.1)', borderRadius: '11px', transition: 'background 0.2s' }} />
      <div style={{ position: 'absolute', top: '3px', left: checked ? '21px' : '3px', width: '16px', height: '16px', background: checked ? 'white' : '#8a88a0', borderRadius: '50%', transition: 'left 0.2s' }} />
    </div>
  );
}

function SettingRow({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: '13px', color: '#8a88a0' }}>{label}</span>
      <div>{children}</div>
    </div>
  );
}

export default function SchedulePage() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data, refetch } = useQuery({ queryKey: ['schedule'], queryFn: () => api.get('/settings/schedule') });

  useEffect(() => { if (data) setSettings(data); }, [data]);

  async function save(updates) {
    const merged = { ...settings, ...updates };
    setSettings(merged);
    setSaving(true);
    try {
      await api.put('/settings/schedule', merged);
      toast.success('Settings saved');
      refetch();
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  }

  async function toggleAutopilot() {
    const enabled = !settings?.autopilot_enabled;
    await save({ autopilot_enabled: enabled });
    toast.success(enabled ? '🤖 Autopilot activated!' : 'Autopilot paused');
  }

  function toggleDay(day) {
    const current = settings?.preferred_days || [];
    const updated = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
    save({ preferred_days: updated });
  }

  if (!settings) return <div style={{ padding: '60px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <div>
      <div style={{ height: '58px', background: '#111118', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', padding: '0 28px', position: 'sticky', top: 0, zIndex: 50 }}>
        <h1 className="font-display" style={{ fontSize: '15px', fontWeight: 600 }}>Schedule & Autopilot</h1>
      </div>

      <div style={{ padding: '28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          {/* Autopilot master toggle */}
          <div onClick={toggleAutopilot}
            style={{ display: 'flex', alignItems: 'center', gap: '16px', background: settings.autopilot_enabled ? 'linear-gradient(135deg, rgba(124,111,232,0.12), rgba(196,126,244,0.08))' : 'rgba(255,255,255,0.02)', border: `1px solid ${settings.autopilot_enabled ? 'rgba(124,111,232,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '12px', padding: '18px 20px', marginBottom: '20px', cursor: 'pointer' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #7c6fe8, #c47ef4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>🤖</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: 600, marginBottom: '3px' }}>Autopilot mode</p>
              <p style={{ fontSize: '12px', color: '#8a88a0' }}>
                {settings.autopilot_enabled ? 'ON — posts publish automatically' : 'OFF — all posts need approval'}
              </p>
            </div>
            <Toggle checked={settings.autopilot_enabled} onChange={() => {}} />
          </div>

          {/* Frequency */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header"><span style={{ fontWeight: 600, fontSize: '14px' }}>📅 Posting frequency</span></div>
            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: '11px', color: '#8a88a0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Posts per week</p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                {FREQS.map(f => (
                  <button key={f} onClick={() => save({ posts_per_week: f })}
                    style={{ flex: 1, padding: '9px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', border: `1px solid ${settings.posts_per_week === f ? 'rgba(124,111,232,0.4)' : 'rgba(255,255,255,0.07)'}`, background: settings.posts_per_week === f ? 'rgba(124,111,232,0.15)' : 'transparent', color: settings.posts_per_week === f ? '#c47ef4' : '#8a88a0', transition: 'all 0.12s' }}>
                    {f === 7 ? 'Daily' : `${f}x`}
                  </button>
                ))}
              </div>

              <p style={{ fontSize: '11px', color: '#8a88a0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Posting days</p>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
                {DAYS.map(day => (
                  <button key={day} onClick={() => toggleDay(day)}
                    style={{ flex: 1, padding: '8px 0', borderRadius: '8px', fontSize: '10px', cursor: 'pointer', border: `1px solid ${(settings.preferred_days || []).includes(day) ? 'rgba(124,111,232,0.4)' : 'rgba(255,255,255,0.07)'}`, background: (settings.preferred_days || []).includes(day) ? 'rgba(124,111,232,0.15)' : 'transparent', color: (settings.preferred_days || []).includes(day) ? '#c47ef4' : '#8a88a0', transition: 'all 0.12s', textTransform: 'capitalize' }}>
                    {day.substring(0,2)}
                  </button>
                ))}
              </div>

              <p style={{ fontSize: '11px', color: '#8a88a0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Post time</p>
              <select className="input" value={settings.post_time?.substring(0,5) || '14:00'}
                onChange={e => save({ post_time: e.target.value + ':00' })}>
                {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Approval workflow */}
        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header"><span style={{ fontWeight: 600, fontSize: '14px' }}>⚙️ Approval workflow</span></div>
            <div style={{ padding: '20px' }}>
              <SettingRow label="Approval mode">
                <select className="input" style={{ width: '160px' }} value={settings.approval_mode || 'review'}
                  onChange={e => save({ approval_mode: e.target.value })}>
                  <option value="auto">Auto-post all</option>
                  <option value="review">Review before post</option>
                  <option value="manual">Manual approve only</option>
                </select>
              </SettingRow>
              <SettingRow label="Review deadline">
                <select className="input" style={{ width: '160px' }} value={settings.review_deadline_hours || 4}
                  onChange={e => save({ review_deadline_hours: parseInt(e.target.value) })}>
                  <option value="1">1 hour before</option>
                  <option value="4">4 hours before</option>
                  <option value="24">24 hours before</option>
                </select>
              </SettingRow>
              <SettingRow label="If not reviewed…">
                <select className="input" style={{ width: '160px' }} value={settings.if_not_reviewed || 'auto_post'}
                  onChange={e => save({ if_not_reviewed: e.target.value })}>
                  <option value="auto_post">Auto-post anyway</option>
                  <option value="skip">Skip the post</option>
                </select>
              </SettingRow>
              <SettingRow label="Max hashtags per post">
                <select className="input" style={{ width: '80px' }} value={settings.max_hashtags || 10}
                  onChange={e => save({ max_hashtags: parseInt(e.target.value) })}>
                  {[5,8,10,15,20].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </SettingRow>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span style={{ fontWeight: 600, fontSize: '14px' }}>📣 Notifications</span></div>
            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: '12.5px', color: '#8a88a0', lineHeight: '1.6' }}>
                When a new post is ready for review, you'll receive an email and push notification with a one-tap approve link. Configure your email and push settings in the{' '}
                <span style={{ color: '#c47ef4' }}>account settings</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
