'use client';

import type { SimulationMode } from '@/types/simulation';

interface Props {
  mode: SimulationMode; intervalMs: number;
  onStep: () => void; onStart: () => void; onStop: () => void;
  onReset: () => void; onSpeedChange: (ms: number) => void;
}

const SPEEDS = [{ label: 'SLOW', ms: 3000 }, { label: 'NORMAL', ms: 1000 }, { label: 'FAST', ms: 500 }, { label: 'LIVE', ms: 200 }];

const btn = (color: string, borderColor: string) => ({
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '9px 16px', borderRadius: 12, border: `1px solid ${borderColor}`,
  background: color, color: '#e2e8f0', fontSize: 13, fontWeight: 700,
  cursor: 'pointer', letterSpacing: '0.05em', transition: 'opacity 0.15s',
} as const);

export default function SimulationControls({ mode, intervalMs, onStep, onStart, onStop, onReset, onSpeedChange }: Props) {
  const isLive = mode === 'LIVE';
  return (
    <div style={{ background: 'rgba(10,15,26,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>

      {/* Action buttons */}
      <button onClick={onStep} disabled={isLive} style={{ ...btn('rgba(6,182,212,0.15)', '#0891b2'), opacity: isLive ? 0.4 : 1, cursor: isLive ? 'not-allowed' : 'pointer', color: '#67e8f9' }}>▶| STOP</button>

      {!isLive
        ? <button onClick={onStart} style={{ ...btn('rgba(16,185,129,0.15)', '#059669'), color: '#6ee7b7' }}>▶ START</button>
        : <button onClick={onStop}  style={{ ...btn('rgba(239,68,68,0.15)', '#b91c1c'),  color: '#fca5a5' }}>⏹ STOP</button>
      }

      <button onClick={onReset} style={{ ...btn('rgba(239,68,68,0.12)', '#b91c1c'), color: '#fca5a5' }}>↺ RESET</button>

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)' }} />

      {/* Speed */}
      <span style={{ fontSize: 11, color: '#4b5563', fontWeight: 700, letterSpacing: '0.1em' }}>SPEED:</span>
      {SPEEDS.map(s => (
        <button key={s.label} onClick={() => onSpeedChange(s.ms)}
          style={{ padding: '7px 12px', borderRadius: 10, border: intervalMs === s.ms ? '1px solid #7c3aed' : '1px solid rgba(255,255,255,0.08)', background: intervalMs === s.ms ? 'rgba(124,58,237,0.2)' : 'transparent', color: intervalMs === s.ms ? '#c4b5fd' : '#6b7280', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          {s.label}
        </button>
      ))}

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)' }} />

      {/* Sampling */}
      <span style={{ fontSize: 11, color: '#4b5563', fontWeight: 700, letterSpacing: '0.1em' }}>SAMPLING:</span>
      <select style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#94a3b8', padding: '6px 8px', fontSize: 12, outline: 'none' }}>
        <option>10 sam / 1 min</option>
        <option>30 sam / 1 min</option>
        <option>60 sam / 1 min</option>
      </select>

      {isLive && (
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, color: '#34d399', fontSize: 12, fontWeight: 700 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} className="glow-dot" /> SIMULATION RUNNING
        </div>
      )}
    </div>
  );
}
