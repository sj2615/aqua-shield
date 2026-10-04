'use client';

import React, { useState, useEffect } from 'react';
import type { ZoneState } from '@/types/simulation';

interface Props {
  zone: ZoneState | null;
  rainfall: number;
  onRainfallChange: (v: number) => void;
  onTemperatureChange: (v: number) => void;
  onFlowChange: (v: number) => void;
  onAdcChange: (sensorId: string, adc: number) => void;
  isLive: boolean;
}

interface CardProps {
  icon: string;
  label: string;
  value: number;
  unit: string;
  min: number; max: number; step: number;
  accent: string;
  bg: string;
  readOnly?: boolean;
  barValue?: number;
  onChange?: (v: number) => void;
  className?: string;
}

function SensorCard({ icon, label, value, unit, min, max, step, accent, bg, readOnly, barValue, onChange, className }: CardProps) {
  const [local, setLocal] = useState(value);
  const displayVal = readOnly ? value : local;
  const pct = ((displayVal - min) / (max - min)) * 100;

  const handle = (v: number) => { setLocal(v); onChange?.(v); };

  return (
    <div className={className} style={{ background: bg, borderRadius: 16, padding: '20px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
          <span style={{ fontSize: 14, color: '#cbd5e1', fontWeight: 500 }}>{label}</span>
        </div>
        <div>
          <span style={{ fontSize: 28, fontWeight: 800, color: accent }}>{displayVal.toFixed(1)}</span>
          <span style={{ fontSize: 13, color: '#64748b', marginLeft: 3 }}>{unit}</span>
        </div>
      </div>

      {readOnly ? (
        <div style={{ marginTop: 4, marginBottom: 4 }}>
          <div style={{ position: 'relative', height: 4, background: '#1e293b', borderRadius: 2 }}>
            <div style={{ height: '100%', width: `${Math.min(barValue ?? pct, 100)}%`, background: accent, borderRadius: 2, transition: 'width 0.4s ease' }} />
            {/* Visual Thumb for ReadOnly */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: `${Math.min(barValue ?? pct, 100)}%`,
              transform: 'translate(-50%, -50%)',
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: accent,
              boxShadow: `0 0 8px ${accent}80`,
              transition: 'left 0.4s ease',
              pointerEvents: 'none'
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 10, color: '#475569' }}>
            <span>{min}{unit}</span><span>{max}{unit}</span>
          </div>
        </div>
      ) : (
        <div style={{ '--thumb-color': accent, '--thumb-shadow': `${accent}80` } as React.CSSProperties}>
          <input type="range" min={min} max={max} step={step} value={local} onChange={e => handle(Number(e.target.value))} style={{ width: '100%', opacity: onChange === undefined ? 0.5 : 1 }} disabled={onChange === undefined} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: '#475569' }}>
            <span>{min}{unit}</span><span>{max}{unit}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ADC helpers (mirror backend constants)
const ADC_DRY = 3800;
const ADC_WET  = 800;
function adcToMoisture(adc: number) {
  return Math.round(Math.max(0, Math.min(100, (ADC_DRY - adc) / (ADC_DRY - ADC_WET) * 100)));
}

function VerticalMoistureSlider({ sensor, isLive, onChange }: {
  sensor: any;
  isLive: boolean;
  onChange: (id: string, adc: number) => void;
}) {
  const initialAdc = sensor.adc_value ?? Math.round(ADC_DRY - (sensor.observed_moisture / 100) * (ADC_DRY - ADC_WET));
  const [localAdc, setLocalAdc] = useState(initialAdc);

  // Sync when backend changes (RESET / zone switch)
  useEffect(() => {
    const adc = sensor.adc_value ?? initialAdc;
    setLocalAdc(adc);
  }, [sensor.adc_value, sensor.observed_moisture]);

  const handle = (v: number) => {
    setLocalAdc(v);
    onChange(sensor.sensor_id, v);
  };

  const displayAdc   = isLive ? (sensor.adc_value ?? localAdc) : localAdc;
  const moisturePct  = adcToMoisture(displayAdc);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'space-between' }}>
      {/* ADC value on top */}
      <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>{displayAdc}</span>
      <span style={{ fontSize: 10, color: '#64748b' }}>{moisturePct}%</span>

      {/* Slider — ADC 800 (wet) at bottom, 3800 (dry) at top — we scaleX(-1) to invert */}
      <div style={{
        position: 'relative', width: 30, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center',
        '--thumb-color': '#10b981', '--thumb-shadow': 'rgba(16,185,129,0.7)'
      } as React.CSSProperties}>
        <input
          type="range" className="vertical-slider"
          min={ADC_WET} max={ADC_DRY} step={10}
          value={displayAdc}
          disabled={isLive}
          onChange={e => handle(Number(e.target.value))}
          style={{ position: 'absolute', width: '150px', transform: 'rotate(-90deg) scaleX(-1)', opacity: isLive ? 0.5 : 1, cursor: isLive ? 'not-allowed' : 'pointer', zIndex: 10 }}
        />
      </div>

      <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{sensor.sensor_id}</span>
    </div>
  );
}

export default function EnvironmentPanel({ zone, rainfall, onRainfallChange, onTemperatureChange, onFlowChange, onAdcChange, isLive }: Props) {
  const sensors = zone ? Object.values(zone.sensors) : [];
  const avgMoisture = sensors.length > 0 ? sensors.reduce((s, x) => s + x.observed_moisture, 0) / sensors.length : 0;


  return (
    <div style={{ background: 'rgba(10,15,26,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 4, height: 28, borderRadius: 2, background: '#10b981', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
            🌱 Environment Parameters
          </div>
          <div style={{ fontSize: 12, color: '#4b5563', marginTop: 2 }}>Live field conditions — all changes go to Python backbone</div>
        </div>
      </div>

      {/* Custom Soil Moisture Block & Cards */}
      <div className="dashboard-grid">
        <div className="soil-moisture-card" style={{ background: 'linear-gradient(135deg, #052e16 0%, #0d1f14 100%)', borderRadius: 16, padding: '20px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💧</div>
              <span style={{ fontSize: 14, color: '#cbd5e1', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                Soil Moisture
                <div style={{ position: 'relative', display: 'inline-block' }} className="group">
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: 11, cursor: 'help' }}>ⓘ</span>
                  <div className="absolute hidden group-hover:block bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 p-3 bg-[#0f172a] border border-[#334155] rounded-xl text-xs text-[#94a3b8] shadow-xl z-50">
                    <div className="font-bold text-[#e2e8f0] mb-1">ADC to Moisture Mapping</div>
                    <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
                      <span>0-20%:</span><span className="text-[#cbd5e1]">3200-3800 ADC (very dry)</span>
                      <span>20-40%:</span><span className="text-[#cbd5e1]">2700-3200 ADC (dry)</span>
                      <span>40-60%:</span><span className="text-[#cbd5e1]">2100-2700 ADC (moderate)</span>
                      <span>60-80%:</span><span className="text-[#cbd5e1]">1400-2100 ADC (moist)</span>
                      <span>80-100%:</span><span className="text-[#cbd5e1]">800-1400 ADC (very wet)</span>
                    </div>
                  </div>
                </div>
              </span>
            </div>
            <div>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>{avgMoisture.toFixed(1)}</span>
              <span style={{ fontSize: 11, color: '#64748b', marginLeft: 3 }}>% avg moisture</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 10, paddingBottom: 0, height: 240, alignItems: 'center' }}>
            {sensors.map(s => (
              <VerticalMoistureSlider key={s.sensor_id} sensor={s} isLive={isLive} onChange={onAdcChange} />
            ))}
          </div>

          {/* ADC Table */}
          <div style={{ marginTop: 10, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <table style={{ width: '100%', fontSize: 11, textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: '#94a3b8' }}>
                  <th style={{ paddingBottom: 8 }}>Moisture %</th>
                  <th style={{ paddingBottom: 8 }}>ADC Raw Range</th>
                  <th style={{ paddingBottom: 8 }}>Condition</th>
                </tr>
              </thead>
              <tbody style={{ color: '#cbd5e1' }}>
                <tr style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '8px 0' }}>0–20%</td><td>3200–3800</td><td>Very dry</td>
                </tr>
                <tr style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '8px 0' }}>20–40%</td><td>2700–3200</td><td>Dry</td>
                </tr>
                <tr style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '8px 0' }}>40–60%</td><td>2100–2700</td><td>Moderate</td>
                </tr>
                <tr style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '8px 0' }}>60–80%</td><td>1400–2100</td><td>Moist</td>
                </tr>
                <tr style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '8px 0' }}>80–100%</td><td>800–1400</td><td>Very wet</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <SensorCard
          className="temperature-card"
          icon="🌡️" label="Temperature" value={zone?.temperature_c ?? 25} unit="°C"
          min={0} max={50} step={0.5}
          accent="#f59e0b" bg="linear-gradient(135deg, #1c0a00 0%, #120800 100%)"
          onChange={isLive ? undefined : onTemperatureChange}
        />

        <SensorCard
          className="irrigation-card"
          icon="💨" label="Irrigation Flow" value={zone?.flow_lpm ?? 0} unit=" L/m"
          min={0} max={20} step={0.5}
          accent="#38bdf8" bg="linear-gradient(135deg, #0c1a2e 0%, #071525 100%)"
          onChange={isLive ? undefined : onFlowChange}
        />
      </div>

      {/* Rainfall presets row */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#94a3b8', fontSize: 13 }}>
          ⚙ Rainfall Presets
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { label: 'NO RAIN (0mm)', val: 0, color: '#374151', border: '#4b5563' },
            { label: 'LIGHT RAIN (2.5 - 15.5 mm)', val: 10, color: '#0e3a5c', border: '#38bdf8' },
            { label: 'HEAVY RAIN (64.5 - 115.5 mm)', val: 90, color: '#1e1b4b', border: '#818cf8' },
          ].map(p => (
            <button key={p.label} onClick={() => onRainfallChange(p.val)}
              disabled={isLive}
              style={{ background: p.color, border: `1px solid ${p.border}`, borderRadius: 10, padding: '10px', color: '#e2e8f0', fontSize: 12, fontWeight: 700, cursor: isLive ? 'not-allowed' : 'pointer', opacity: isLive ? 0.5 : 1, letterSpacing: '0.05em', transition: 'opacity 0.15s' }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
