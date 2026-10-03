'use client';

import type { ActiveScenario, ZoneState } from '@/types/simulation';

interface Props {
  zones: Record<string, ZoneState>;
  activeScenarios: Record<string, ActiveScenario>;
  selectedZone: string;
  onSelectZone: (z: string) => void;
}

const ZONE_ACCENTS: Record<string, { border: string; glow: string; bg: string }> = {
  Z01: { border: '#059669', glow: 'rgba(5,150,105,0.2)', bg: 'rgba(5,46,22,0.6)'  },
  Z02: { border: '#0284c7', glow: 'rgba(2,132,199,0.2)', bg: 'rgba(7,33,62,0.6)'  },
  Z03: { border: '#7c3aed', glow: 'rgba(124,58,237,0.2)',bg: 'rgba(19,10,45,0.6)' },
  Z04: { border: '#d97706', glow: 'rgba(217,119,6,0.2)', bg: 'rgba(41,26,0,0.6)'  },
};

export default function ZoneMap({ zones, activeScenarios, selectedZone, onSelectZone }: Props) {
  return (
    <div style={{ background: 'rgba(10,15,26,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        🗺 Farm Zone Overview
        <span style={{ fontSize: 11, color: '#4b5563', fontWeight: 400, marginLeft: 4 }}>4 zones · 12 sensors · click to select</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {Object.values(zones).map(zone => {
          const sensors = Object.values(zone.sensors);
          const avg = sensors.reduce((s, x) => s + x.observed_moisture, 0) / (sensors.length || 1);
          const sel = zone.zone_id === selectedZone;
          const accent = ZONE_ACCENTS[zone.zone_id] ?? { border: '#4b5563', glow: 'transparent', bg: 'rgba(30,41,59,0.6)' };
          const hasScenario = sensors.some(s => activeScenarios[s.sensor_id]);

          return (
            <button key={zone.zone_id} onClick={() => onSelectZone(zone.zone_id)}
              style={{ background: accent.bg, border: `1px solid ${sel ? accent.border : 'rgba(255,255,255,0.08)'}`, borderRadius: 16, padding: 16, cursor: 'pointer', textAlign: 'left', boxShadow: sel ? `0 0 20px ${accent.glow}` : 'none', transition: 'all 0.2s' }}>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: sel ? accent.border : '#94a3b8' }}>{zone.zone_id}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {hasScenario && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f43f5e' }} className="glow-dot" />}
                  {sel && <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent.border }} />}
                </div>
              </div>

              <div style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>{avg.toFixed(0)}<span style={{ fontSize: 14, color: '#64748b' }}>%</span></div>
              <div style={{ fontSize: 10, color: '#475569', marginTop: 2, marginBottom: 10 }}>avg moisture</div>

              {/* Moisture bar */}
              <div style={{ height: 4, background: 'rgba(0,0,0,0.4)', borderRadius: 2, marginBottom: 10, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${avg}%`, background: accent.border, borderRadius: 2, transition: 'width 0.4s' }} />
              </div>

              {/* Per-sensor readings */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {sensors.map(s => {
                  const active = activeScenarios[s.sensor_id];
                  return (
                    <div key={s.sensor_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#475569' }}>{s.sensor_id}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {active && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#f43f5e' }} />}
                        <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, color: active ? '#fda4af' : '#94a3b8' }}>
                          {s.observed_moisture.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Zone stats */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 10, color: '#475569' }}>🌡 {zone.temperature_c.toFixed(1)}°C</span>
                <span style={{ fontSize: 10, color: '#475569' }}>💨 {zone.flow_lpm.toFixed(1)} L/m</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
