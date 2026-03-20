'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/api';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup(e) {
    e.preventDefault();
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success('Account created! Setting up your workspace...');
    router.push('/onboarding');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h1 className="font-display gradient-text" style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px' }}>
            Zeneth Reach AI
          </h1>
          <p style={{ color: '#8a88a0', fontSize: '13px' }}>Create your account — it's free to start</p>
        </div>
        <div className="card" style={{ padding: '32px' }}>
          <form onSubmit={handleSignup}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#8a88a0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Email</label>
              <input className="input" type="email" placeholder="you@company.com" value={email}
                onChange={e => setEmail(e.target.value)} required />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: '#8a88a0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Password</label>
              <input className="input" type="password" placeholder="Min. 8 characters" value={password}
                onChange={e => setPassword(e.target.value)} required />
            </div>
            <button className="btn-primary" type="submit" disabled={loading}
              style={{ width: '100%', padding: '12px', fontSize: '14px' }}>
              {loading ? 'Creating account...' : 'Get started →'}
            </button>
          </form>
        </div>
        <p style={{ textAlign: 'center', marginTop: '20px', color: '#8a88a0', fontSize: '13px' }}>
          Already have an account? <Link href="/login" style={{ color: '#c47ef4', textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
