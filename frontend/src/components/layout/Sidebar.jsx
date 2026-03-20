'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../../lib/api';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

const NAV = [
  { href: '/dashboard', icon: '⚡', label: 'Dashboard' },
  { href: '/queue', icon: '📋', label: 'Post Queue', badge: true },
  { href: '/analytics', icon: '📊', label: 'Analytics' },
  { section: 'Automation' },
  { href: '/brand', icon: '🌐', label: 'Brand Setup' },
  { href: '/schedule', icon: '🗓', label: 'Schedule' },
  { href: '/channels', icon: '🔗', label: 'Channels' },
  { section: 'Content' },
  { href: '/trends', icon: '🔥', label: 'Trend Feed' },
  { href: '/canva', icon: '🎨', label: 'Canva Templates' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const { data: pendingCount } = useQuery({
    queryKey: ['pending-count'],
    queryFn: () => api.get('/queue?status=pending&limit=1').then(d => d.total || 0),
    refetchInterval: 30000,
  });

  const { data: brand } = useQuery({
    queryKey: ['brand-mini'],
    queryFn: () => api.get('/brand'),
  });

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <aside style={{
      width: '220px', minHeight: '100vh', background: '#111118',
      borderRight: '1px solid rgba(255,255,255,0.07)',
      position: 'fixed', top: 0, left: 0, height: '100vh',
      display: 'flex', flexDirection: 'column', zIndex: 100
    }}>
      {/* Logo */}
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <span className="font-display gradient-text" style={{ fontSize: '17px', fontWeight: 800, display: 'block', marginBottom: '2px' }}>
          Zeneth Reach AI
        </span>
        <span style={{ fontSize: '10px', color: '#8a88a0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Marketing Autopilot
        </span>
      </div>

      {/* Nav */}
      <nav style={{ padding: '14px 10px', flex: 1, overflowY: 'auto' }}>
        {NAV.map((item, i) => {
          if (item.section) return (
            <p key={i} style={{ fontSize: '10px', color: '#8a88a0', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 8px 5px', marginTop: '8px' }}>
              {item.section}
            </p>
          );
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 10px', borderRadius: '8px', marginBottom: '2px',
                background: active ? 'rgba(124,111,232,0.15)' : 'transparent',
                color: active ? '#c47ef4' : '#8a88a0',
                fontSize: '13.5px', cursor: 'pointer',
                transition: 'all 0.12s',
              }}>
                <span style={{ width: '18px', textAlign: 'center', fontSize: '15px' }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && pendingCount > 0 && (
                  <span style={{ background: '#7c6fe8', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '10px' }}>
                    {pendingCount}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Brand pill */}
      <div style={{ padding: '14px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: '#18181f', borderRadius: '10px', padding: '10px 12px',
          border: '1px solid rgba(255,255,255,0.07)', marginBottom: '8px'
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
            background: 'linear-gradient(135deg, #7c6fe8, #3ecfb2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '12px', color: 'white'
          }}>
            {(brand?.company_name || 'ZP').substring(0, 2).toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {brand?.company_name || 'Your Company'}
            </div>
            <div style={{ fontSize: '10px', color: '#8a88a0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {brand?.website_url || 'Not set'}
            </div>
          </div>
        </div>
        <button onClick={handleSignOut}
          style={{ width: '100%', background: 'transparent', border: 'none', color: '#8a88a0', fontSize: '11px', cursor: 'pointer', padding: '4px', textAlign: 'center' }}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
