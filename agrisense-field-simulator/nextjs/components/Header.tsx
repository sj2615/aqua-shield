'use client';

import type { ConnectionStatus, SimulationMode } from '@/types/simulation';

interface HeaderProps {
  backendOnline: boolean;
  esp32Status: ConnectionStatus;
  simulationMode: SimulationMode;
  updateCounter: number;
  activeZone: string;
  onZoneChange: (z: string) => void;
  onSendToEsp32: () => void;
  sending: boolean;
}

const STATUS_COLORS: Record<ConnectionStatus, string> = {
  CONFIGURED: '#9ca3af', CHECKING: '#fbbf24', CONNECTED: '#34d399',
  UNREACHABLE: '#f87171', TIMEOUT: '#fb923c', ERROR: '#ef4444',
};

export default function Header({ backendOnline, esp32Status, simulationMode, updateCounter, activeZone, onZoneChange, onSendToEsp32, sending }: HeaderProps) {
  return (
    <div>
      {/* Amber warning bar */}
      <div style={{ background: '#1c1400', borderBottom: '1px solid #92400e', padding: '8px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#fbbf24', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em' }}>
        ⚡ SIMULATION MODE: AGRI-SENSE FIELD DIGITAL TWIN ⚡
      </div>

      {/* Main header */}
      <div style={{ background: 'rgba(10,15,28,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)', padding: '14px 24px' }}>
        <div style={{ maxWidth: 1600, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 24 }}>

          {/* Logo */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              <span style={{ fontSize: 28, fontWeight: 900, color: '#22d3ee', letterSpacing: '-0.5px' }}>AGRI-SENSE</span>
            </div>
            <div style={{ fontSize: 10, color: '#4b5563', fontWeight: 600, letterSpacing: '0.12em', marginTop: 2 }}>INTELLIGENT FIELD SIMULATOR CONSOLE</div>
          </div>

          {/* Zone selector */}
          <div style={{ flex: 1, maxWidth: 220 }}>
            <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, letterSpacing: '0.12em', marginBottom: 4 }}>ACTIVE ZONE</div>
            <select value={activeZone} onChange={e => onZoneChange(e.target.value)} style={{ width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 12px', color: '#f1f5f9', fontSize: 14, cursor: 'pointer', outline: 'none' }}>
              <option value="Z01">Zone 1 (Z01)</option>
              <option value="Z02">Zone 2 (Z02)</option>
              <option value="Z03">Zone 3 (Z03)</option>
              <option value="Z04">Zone 4 (Z04)</option>
            </select>
          </div>

          {/* Status badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 12px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: backendOnline ? '#10b981' : '#ef4444' }} className={backendOnline ? 'glow-dot' : ''} />
              <span style={{ fontSize: 12, color: '#9ca3af' }}>Python Backend:</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: backendOnline ? '#34d399' : '#f87171' }}>{backendOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 12px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={esp32Status === 'CONNECTED' ? '#34d399' : '#f87171'} strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>ESP32 SERIAL:</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: esp32Status === 'CONNECTED' ? '#34d399' : '#f87171' }}>
                {esp32Status === 'CONNECTED' ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 12px' }}>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>Sim:</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: simulationMode === 'LIVE' ? '#34d399' : '#fbbf24' }}>{simulationMode}</span>
              <span style={{ fontSize: 12, color: '#374151', fontFamily: 'monospace' }}>#{updateCounter}</span>
            </div>
          </div>

          {/* Send button */}
          <button onClick={onSendToEsp32} disabled={sending} style={{ display: 'flex', alignItems: 'center', gap: 8, background: sending ? '#1e3a5f' : '#1d4ed8', border: '1px solid #3b82f6', borderRadius: 12, padding: '10px 20px', color: '#bfdbfe', fontSize: 13, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.6 : 1, flexShrink: 0, boxShadow: '0 0 20px rgba(59,130,246,0.3)' }}>
            ↗ {sending ? 'SENDING...' : 'SEND VIA USB SERIAL'}
          </button>
        </div>
      </div>
    </div>
  );
}
