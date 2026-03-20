'use client';
import Sidebar from '../../components/layout/Sidebar';
import { useRequireAuth } from '../../hooks/useAuth';

export default function DashboardLayout({ children }) {
  const { loading } = useRequireAuth();

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: '220px', flex: 1, minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  );
}
