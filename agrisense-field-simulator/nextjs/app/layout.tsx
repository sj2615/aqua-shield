import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AGRI-SENSE Field Simulator',
  description: 'Intelligent Agricultural Field Digital Twin — Laptop 1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#080d18', color: '#e5e7eb', fontFamily: 'Inter, system-ui, sans-serif', minHeight: '100vh' }} className={inter.className}>
        {children}
      </body>
    </html>
  );
}
