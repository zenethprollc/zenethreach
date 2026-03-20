'use client';
import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/api';
import toast from 'react-hot-toast';

export default function CanvaPage() {
  const { data: templates, refetch } = useQuery({ queryKey: ['canva-templates'], queryFn: () => api.get('/canva/templates') });

  async function connectCanva() {
    try {
      const { url } = await api.get('/canva/auth-url');
      window.location.href = url;
    } catch (e) { toast.error(e.message); }
  }

  async function saveTemplates(ids) {
    try {
      await api.put('/canva/templates', { template_ids: ids });
      toast.success('Templates saved!');
    } catch (e) { toast.error(e.message); }
  }

  const templateCards = [
    { name: 'Trend post', desc: 'Best for: news response, hot takes', emoji: '🔥', gradient: 'linear-gradient(135deg, #7c6fe8, #c47ef4)' },
    { name: 'Tips listicle', desc: 'Best for: educational content', emoji: '💡', gradient: 'linear-gradient(135deg, #3ecfb2, #378add)' },
    { name: 'Case study', desc: 'Best for: client results, social proof', emoji: '📈', gradient: 'linear-gradient(135deg, #f0b93a, #f0704a)' },
    { name: 'Service spotlight', desc: 'Best for: promoting your services', emoji: '⭐', gradient: 'linear-gradient(135deg, #4fd98a, #3ecfb2)' },
  ];

  return (
    <div>
      <div style={{ height: '58px', background: '#111118', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', position: 'sticky', top: 0, zIndex: 50 }}>
        <h1 className="font-display" style={{ fontSize: '15px', fontWeight: 600 }}>Canva Templates</h1>
        <button className="btn-primary" onClick={connectCanva}>Connect Canva</button>
      </div>
      <div style={{ padding: '28px' }}>
        {/* How it works */}
        <div style={{ background: 'rgba(240,185,58,0.06)', border: '1px solid rgba(240,185,58,0.15)', borderRadius: '12px', padding: '18px 20px', marginBottom: '24px' }}>
          <p style={{ fontWeight: 600, fontSize: '13px', color: '#f0b93a', marginBottom: '6px' }}>⚡ How Canva auto-generation works</p>
          <p style={{ fontSize: '12.5px', color: '#8a88a0', lineHeight: '1.7' }}>
            1. Connect your Canva account below<br />
            2. In Canva, create brand templates with text boxes named <strong style={{ color: '#f0eff8' }}>HEADLINE</strong> and <strong style={{ color: '#f0eff8' }}>SUBHEADLINE</strong><br />
            3. The AI auto-fills these fields for every post — your logo, colors, and fonts stay locked<br />
            4. Graphics are exported and attached to posts automatically
          </p>
        </div>

        {/* Template gallery */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {templateCards.map(card => (
            <div key={card.name} className="card" style={{ cursor: 'pointer', overflow: 'hidden' }} onClick={connectCanva}>
              <div style={{ height: '150px', background: card.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '36px' }}>{card.emoji}</span>
                <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'white' }}>{card.name}</span>
              </div>
              <div style={{ padding: '12px 16px' }}>
                <p style={{ fontSize: '12px', color: '#8a88a0' }}>{card.desc}</p>
              </div>
            </div>
          ))}
          <div className="card" style={{ cursor: 'pointer', border: '1px dashed rgba(124,111,232,0.25)', background: 'rgba(124,111,232,0.03)' }} onClick={connectCanva}>
            <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '28px', color: '#c47ef4' }}>+</span>
              <span style={{ fontSize: '13px', color: '#c47ef4' }}>Import from Canva</span>
            </div>
            <div style={{ padding: '12px 16px' }}>
              <p style={{ fontSize: '12px', color: '#8a88a0' }}>Connect Canva to import your brand templates</p>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="card">
          <div className="card-header"><span style={{ fontWeight: 600, fontSize: '14px' }}>🎨 Canva settings</span></div>
          <div style={{ padding: '20px' }}>
            {[
              'Auto-fill brand colors from your profile',
              'Auto-insert company logo',
              'Use AI-generated background images (Canva AI)',
              'Export as square (1:1) for feed posts',
              'Export as vertical (9:16) for Stories & Reels',
            ].map((setting, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <span style={{ fontSize: '13px', color: '#8a88a0' }}>{setting}</span>
                <div style={{ width: '36px', height: '20px', background: '#7c6fe8', borderRadius: '10px', position: 'relative', cursor: 'pointer' }}>
                  <div style={{ position: 'absolute', top: '2px', left: '18px', width: '16px', height: '16px', background: 'white', borderRadius: '50%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
