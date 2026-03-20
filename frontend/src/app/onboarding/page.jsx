'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const STEPS = ['Welcome', 'Website', 'Brand review', 'Connect channels', 'Schedule', 'Done'];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [url, setUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [brand, setBrand] = useState(null);
  const router = useRouter();

  async function handleScan() {
    if (!url) return toast.error('Enter your website URL');
    setScanning(true);
    try {
      await api.post('/onboarding/scan', { website_url: url });
      toast.success('Scanning... checking in 30 seconds');
      setTimeout(async () => {
        const b = await api.get('/brand');
        setBrand(b);
        setScanning(false);
        setStep(2);
      }, 30000);
    } catch (e) { toast.error(e.message); setScanning(false); }
  }

  async function handleComplete() {
    try {
      await api.post('/settings/schedule', { posts_per_week: 2, preferred_days: ['tuesday', 'thursday'], approval_mode: 'review', autopilot_enabled: true });
      await api.post('/onboarding/complete');
      toast.success('🎉 Autopilot activated! Welcome to Zeneth Reach AI');
      router.push('/dashboard');
    } catch (e) { toast.error(e.message); }
  }

  async function connectBuffer() {
    const { url: authUrl } = await api.get('/channels/buffer/auth-url');
    window.location.href = authUrl;
  }

  const stepContent = [
    // Step 0: Welcome
    <div key="welcome" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '60px', marginBottom: '20px' }}>🤖</div>
      <h2 className="font-display" style={{ fontSize: '26px', fontWeight: 700, marginBottom: '12px' }}>Welcome to Zeneth Reach AI</h2>
      <p style={{ color: '#8a88a0', fontSize: '14px', lineHeight: '1.7', maxWidth: '400px', margin: '0 auto 32px' }}>
        In the next 5 minutes, you'll set up your fully automated marketing system. Give us your website — we'll handle everything else.
      </p>
      <button className="btn-primary" onClick={() => setStep(1)} style={{ padding: '13px 32px', fontSize: '15px' }}>Let's get started →</button>
    </div>,

    // Step 1: Website URL
    <div key="website">
      <h2 className="font-display" style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>Enter your website URL</h2>
      <p style={{ color: '#8a88a0', fontSize: '13px', marginBottom: '24px', lineHeight: '1.6' }}>
        Our AI will scan your website and automatically extract your services, brand voice, target audience, and keywords. This powers all your future posts.
      </p>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
        <input className="input" value={url} onChange={e => setUrl(e.target.value)} placeholder="zenethpro.com" style={{ fontSize: '15px', padding: '12px 16px' }} />
        <button className="btn-primary" onClick={handleScan} disabled={scanning} style={{ whiteSpace: 'nowrap', padding: '12px 20px' }}>
          {scanning ? 'Scanning...' : 'Scan →'}
        </button>
      </div>
      {scanning && <p style={{ fontSize: '12px', color: '#3ecfb2' }}>⏳ Crawling your website and extracting brand profile with AI...</p>}
    </div>,

    // Step 2: Brand review
    <div key="brand">
      <h2 className="font-display" style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>Review your brand profile</h2>
      <p style={{ color: '#8a88a0', fontSize: '13px', marginBottom: '20px' }}>Our AI extracted this from your website. Edit anything that's off.</p>
      {brand && (
        <div style={{ background: '#18181f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {[['Company', brand.company_name], ['Industry', brand.industry], ['Audience', brand.target_audience], ['Tone', brand.tone]].map(([k, v]) => (
              <div key={k}>
                <p style={{ fontSize: '10px', color: '#8a88a0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{k}</p>
                <p style={{ fontSize: '13px' }}>{v || '—'}</p>
              </div>
            ))}
          </div>
          {brand.services?.length > 0 && (
            <div style={{ marginTop: '14px' }}>
              <p style={{ fontSize: '10px', color: '#8a88a0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Services detected</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {brand.services.map(s => <span key={s} style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', background: 'rgba(63,207,178,0.1)', color: '#3ecfb2', border: '1px solid rgba(63,207,178,0.2)' }}>{s}</span>)}
              </div>
            </div>
          )}
        </div>
      )}
      <button className="btn-primary" onClick={() => setStep(3)} style={{ padding: '12px 28px' }}>Looks good →</button>
    </div>,

    // Step 3: Connect channels
    <div key="channels">
      <h2 className="font-display" style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>Connect your social accounts</h2>
      <p style={{ color: '#8a88a0', fontSize: '13px', marginBottom: '24px', lineHeight: '1.6' }}>
        Connect via Buffer to enable publishing to LinkedIn, Instagram, Facebook, and TikTok. You can add more channels later.
      </p>
      <button onClick={connectBuffer}
        style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%', background: '#18181f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px 20px', cursor: 'pointer', marginBottom: '12px', transition: 'border-color 0.15s' }}>
        <span style={{ fontSize: '24px' }}>🔗</span>
        <div style={{ textAlign: 'left' }}>
          <p style={{ fontSize: '14px', fontWeight: 500, color: '#f0eff8' }}>Connect via Buffer</p>
          <p style={{ fontSize: '12px', color: '#8a88a0' }}>Authorizes LinkedIn, Instagram, Facebook, TikTok in one step</p>
        </div>
        <span style={{ marginLeft: 'auto', color: '#c47ef4', fontSize: '18px' }}>→</span>
      </button>
      <button className="btn-ghost" onClick={() => setStep(4)} style={{ width: '100%', padding: '11px', marginTop: '8px' }}>
        Skip for now — I'll connect later
      </button>
    </div>,

    // Step 4: Schedule
    <div key="schedule">
      <h2 className="font-display" style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>Set your posting schedule</h2>
      <p style={{ color: '#8a88a0', fontSize: '13px', marginBottom: '24px' }}>You can change this any time. We recommend starting with 2x/week.</p>
      <div style={{ background: '#18181f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        {[
          ['Frequency', '2 posts per week (recommended)'],
          ['Days', 'Tuesday & Thursday'],
          ['Time', '2:00 PM (your timezone)'],
          ['Approval mode', 'Review before posting'],
          ['Autopilot', 'ON — you\'ll get email alerts for review'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: '13px', color: '#8a88a0' }}>{k}</span>
            <span style={{ fontSize: '13px', color: '#3ecfb2', fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: '12px', color: '#8a88a0', marginBottom: '16px' }}>You can customize all of this in Settings → Schedule after setup.</p>
      <button className="btn-primary" onClick={handleComplete} style={{ width: '100%', padding: '13px', fontSize: '15px' }}>
        🚀 Activate autopilot
      </button>
    </div>,
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '560px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span className="font-display gradient-text" style={{ fontSize: '18px', fontWeight: 800 }}>Zeneth Reach AI</span>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '36px' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i <= step ? '#7c6fe8' : 'rgba(255,255,255,0.08)', transition: 'background 0.3s' }} />
          ))}
        </div>

        {/* Step label */}
        <p style={{ fontSize: '11px', color: '#8a88a0', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </p>

        {/* Content */}
        <div className="card" style={{ padding: '32px' }}>
          {stepContent[step]}
        </div>
      </div>
    </div>
  );
}
