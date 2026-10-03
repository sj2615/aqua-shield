'use client';

import type { CommunicationState } from '@/types/simulation';

interface Props {
  communication: CommunicationState;
  events: { time: string; message: string; success: boolean }[];
}

export default function CommunicationPanel({ communication, events }: Props) {
  const cfg = communication.config;
  const response = communication.last_response as Record<string,unknown> | null;
  const statusColor: Record<string,string> = {
    CONNECTED: '#34d399', CHECKING: '#fbbf24', CONFIGURED: '#94a3b8',
    UNREACHABLE: '#f87171', TIMEOUT: '#fb923c', ERROR: '#ef4444',
  };

  return (
    <div style={{ background: 'rgba(10,15,26,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>📡 Communication Panel</div>

      {/* ESP32 config */}
      <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 12 }}>
        <div style={{ fontSize: 10, color: '#4b5563', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6 }}>ESP32 TARGET</div>
        <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#22d3ee' }}>
          {cfg.host.toUpperCase().startsWith('COM') || cfg.host.startsWith('/dev/') 
            ? `USB Serial: ${cfg.host} @ ${cfg.port} baud` 
            : `http://${cfg.host}:${cfg.port}${cfg.endpoint}`}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor[communication.status] || '#94a3b8' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: statusColor[communication.status] || '#94a3b8' }}>{communication.status}</span>
        </div>
        {communication.last_error && <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>{communication.last_error}</div>}
      </div>

      {/* Serial Transmission Status */}
      {response && (
        <div style={{ background: 'rgba(5,46,22,0.4)', border: '1px solid rgba(5,150,105,0.3)', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 10, color: '#34d399', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>🔌 SERIAL TRANSMISSION</div>
          {Object.entries(response).map(([k,v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: 12, color: '#6b7280', textTransform: 'capitalize' }}>{k.replace(/_/g,' ')}</span>
              <span style={{ fontSize: 12, color: '#6ee7b7', fontFamily: 'monospace', fontWeight: 600 }}>{String(v)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Event log */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 10, color: '#4b5563', fontWeight: 700, letterSpacing: '0.1em' }}>EVENT LOG</div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {events.length === 0 ? (
            <div style={{ color: '#374151', fontSize: 12 }}>No events yet</div>
          ) : events.slice().reverse().map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ color: e.success ? '#34d399' : '#f87171', fontSize: 14, flexShrink: 0 }}>{e.success ? '✓' : '✗'}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#374151', flexShrink: 0 }}>[{e.time}]</span>
              <span style={{ fontSize: 11, color: e.success ? '#94a3b8' : '#f87171' }}>{e.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
