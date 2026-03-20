'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/api';
import toast from 'react-hot-toast';

const TONES = ['Direct', 'Professional', 'Friendly', 'Expert', 'Casual', 'Inspirational'];

export default function BrandPage() {
  const [url, setUrl] = useState('');
  const [examplePost, setExamplePost] = useState('');
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: brand, refetch } = useQuery({
    queryKey: ['brand'],
    queryFn: () => api.get('/brand'),
  });

  useEffect(() => {
    if (brand) {
      setUrl(brand.website_url || '');
      setExamplePost(brand.example_post || '');
    }
  }, [brand]);

  async function handleScan() {
    if (!url) return toast.error('Enter a website URL first');
    setScanning(true);
    try {
      await api.post('/onboarding/scan', { website_url: url });
      toast.success('Scanning your website — results ready in ~30 seconds');
      setTimeout(() => { refetch(); setScanning(false); }, 30000);
    } catch (e) { toast.error(e.message); setScanning(false); }
  }

  async function handleSaveVoice() {
    setSaving(true);
    try {
      await api.put('/brand', { example_post: examplePost });
      toast.success('Brand voice saved!');
      refetch();
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  }

  async function toggleService(svc) {
    const current = brand?.services || [];
    const updated = current.includes(svc) ? current.filter(s => s !== svc) : [...current, svc];
    await api.put('/brand', { services: updated });
    refetch();
  }

  return (
    <div>
      <div style={{ height: '58px', background: '#111118', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', padding: '0 28px', position: 'sticky', top: 0, zIndex: 50 }}>
        <h1 className="font-display" style={{ fontSize: '15px', fontWeight: 600 }}>Brand Setup</h1>
      </div>

      <div style={{ padding: '28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Website Scanner */}
        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header"><span style={{ fontWeight: 600, fontSize: '14px' }}>🌐 Website scanner</span></div>
            <div style={{ padding: '20px' }}>
              {brand?.company_name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(79,217,138,0.06)', border: '1px solid rgba(79,217,138,0.15)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '12.5px', color: '#4fd98a' }}>
                  <span>✓</span> <span>Scanned: <strong>{brand.company_name}</strong> — {(brand.services || []).length} services detected</span>
                </div>
              )}
              <p style={{ fontSize: '11px', color: '#8a88a0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Your website URL</p>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <input className="input" value={url} onChange={e => setUrl(e.target.value)} placeholder="zenethpro.com" />
                <button className="btn-primary" onClick={handleScan} disabled={scanning} style={{ whiteSpace: 'nowrap' }}>
                  {scanning ? 'Scanning...' : 'Scan site'}
                </button>
              </div>

              {brand?.services?.length > 0 && (
                <>
                  <p style={{ fontSize: '11px', color: '#8a88a0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Detected services (click to toggle)</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(brand.services || []).map(svc => (
                      <button key={svc} onClick={() => toggleService(svc)}
                        style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', border: '1px solid rgba(63,207,178,0.3)', background: 'rgba(63,207,178,0.1)', color: '#3ecfb2', transition: 'all 0.12s' }}>
                        {svc}
                      </button>
                    ))}
                    <button style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', border: '1px dashed rgba(255,255,255,0.15)', background: 'transparent', color: '#8a88a0' }}>
                      + Add custom
                    </button>
                  </div>
                </>
              )}

              {brand?.target_audience && (
                <div style={{ marginTop: '16px' }}>
                  <p style={{ fontSize: '11px', color: '#8a88a0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Target audience</p>
                  <p style={{ fontSize: '13px', color: '#f0eff8' }}>{brand.target_audience}</p>
                </div>
              )}
            </div>
          </div>

          {/* Brand tone */}
          {brand && (
            <div className="card">
              <div className="card-header"><span style={{ fontWeight: 600, fontSize: '14px' }}>🎯 Brand tone</span></div>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {TONES.map(tone => (
                    <button key={tone} onClick={() => { api.put('/brand', { tone }); refetch(); }}
                      style={{ padding: '7px 16px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', transition: 'all 0.12s', border: `1px solid ${brand?.tone === tone ? 'rgba(124,111,232,0.4)' : 'rgba(255,255,255,0.07)'}`, background: brand?.tone === tone ? 'rgba(124,111,232,0.15)' : 'transparent', color: brand?.tone === tone ? '#c47ef4' : '#8a88a0' }}>
                      {tone}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Brand voice */}
        <div className="card">
          <div className="card-header"><span style={{ fontWeight: 600, fontSize: '14px' }}>✍️ Brand voice example</span></div>
          <div style={{ padding: '20px' }}>
            <p style={{ fontSize: '12.5px', color: '#8a88a0', marginBottom: '12px', lineHeight: '1.6' }}>
              Paste an example post that represents your style. The AI will match this voice for all future content.
            </p>
            <textarea
              value={examplePost}
              onChange={e => setExamplePost(e.target.value)}
              placeholder="e.g. We don't sell marketing. We build systems that print results. GoHighLevel + Make + Claude = your business running while you sleep. 🚀"
              style={{ width: '100%', minHeight: '160px', background: '#18181f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '12px', color: '#f0eff8', fontSize: '13px', lineHeight: '1.6', resize: 'vertical', outline: 'none', fontFamily: 'Inter, sans-serif', marginBottom: '12px' }}
            />
            <button className="btn-primary" onClick={handleSaveVoice} disabled={saving} style={{ width: '100%', padding: '11px' }}>
              {saving ? 'Saving...' : 'Save brand voice'}
            </button>

            {brand?.keywords?.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <p style={{ fontSize: '11px', color: '#8a88a0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Brand keywords (AI-extracted)</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {brand.keywords.map(kw => (
                    <span key={kw} style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', background: 'rgba(124,111,232,0.1)', color: '#c47ef4', border: '1px solid rgba(124,111,232,0.2)' }}>
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
