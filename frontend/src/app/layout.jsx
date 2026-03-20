'use client';
import './globals.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';

export default function RootLayout({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30000, retry: 1 } }
  }));

  return (
    <html lang="en">
      <head>
        <title>Zeneth Reach AI</title>
        <meta name="description" content="Marketing Autopilot — Powered by AI" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#13131a',
                color: '#f0eff8',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                fontSize: '13px',
              },
              success: { iconTheme: { primary: '#4fd98a', secondary: '#0a0a0f' } },
              error: { iconTheme: { primary: '#f0704a', secondary: '#0a0a0f' } },
            }}
          />
        </QueryClientProvider>
      </body>
    </html>
  );
}
