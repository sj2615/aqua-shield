'use client';

import { useState } from 'react';

interface Props {
  packet: unknown;
  onRefresh: () => void;
  onSend: () => void;
  sending: boolean;
}

function formatJSON(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

function highlight(s: string): string {
  return s
    .replace(/("[\w_]+")\s*:/g, '<span style="color:#67e8f9">$1</span>:')
    .replace(/:\s*(".*?")/g,    ': <span style="color:#86efac">$1</span>')
    .replace(/:\s*(-?\d+\.?\d*)/g, ': <span style="color:#fbbf24">$1</span>')
    .replace(/:\s*(true|false|null)/g, ': <span style="color:#c4b5fd">$1</span>');
}

export default function PacketViewer({ packet, onRefresh, onSend, sending }: Props) {
  const [copied, setCopied] = useState(false);
  const json = packet ? formatJSON(packet) : '';

  const copy = () => { navigator.clipboard.writeText(json); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div style={{ background: 'rgba(10,15,26,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>📦 Packet Preview</div>
          <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>JSON sent to ESP32 — no fault labels</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: copied ? '✓ Copied' : '⎘ Copy', action: copy,    color: '#1e293b', border: '#334155' },
            { label: '⟳ Refresh',                    action: onRefresh, color: '#1e293b', border: '#334155' },
            { label: sending ? 'SENDING...' : '↗ SEND VIA USB SERIAL', action: onSend,   color: '#1e3a5f', border: '#3b82f6' },
          ].map(b => (
            <button key={b.label} onClick={b.action} disabled={sending && b.label.includes('Send')}
              style={{ padding: '7px 14px', borderRadius: 10, border: `1px solid ${b.border}`, background: b.color, color: '#e2e8f0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)', overflow: 'auto', padding: 16 }}>
        {packet ? (
          <pre style={{ margin: 0, fontSize: 12, fontFamily: 'monospace', color: '#94a3b8', lineHeight: 1.6, whiteSpace: 'pre' }}
               dangerouslySetInnerHTML={{ __html: highlight(json) }} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#374151', fontSize: 13 }}>
            No packet yet — step the simulation first
          </div>
        )}
      </div>
    </div>
  );
}
