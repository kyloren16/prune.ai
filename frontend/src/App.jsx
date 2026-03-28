import React, { useState, useEffect, useRef } from 'react';
import {
  Activity, Shield, CheckCircle, RotateCcw, AlertTriangle,
  Zap, Server, LayoutDashboard, BarChart2, Brain,
  HeartPulse, LogOut, RefreshCw, ChevronRight, Circle,
  Clock, Cpu, Database, Wifi, TrendingUp, TrendingDown,
  AlertCircle, Terminal, Radio, ArrowUp, Calendar, ChevronDown
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import HealthGauge from './components/HealthGauge';
import Login from './components/Login';

// ─── Color constants (Obsidian & Neon) ───────────────────────────────────
const PURPLE = '#a78bfa';
const PURPLE_DIM = '#7c3aed';
const TEAL = '#4fac8f';
const SILVER = '#cbd5e1';
const RED = '#f87171';
const ORANGE = '#fbbf24';
const GREEN = '#10b981';
const BG = '#06080a';
const CARD = 'rgba(18, 24, 30, 0.75)';
const BORDER = 'rgba(255, 255, 255, 0.08)';

// ─── Typewriter hook ────────────────────────────────────────────────────────
function useTypewriter(text, speed = 18, trigger = true) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    if (!trigger || !text) { setDisplayed(''); return; }
    setDisplayed('');
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, trigger]);
  return displayed;
}

// ─── Suspicion history generator ───────────────────────────────────────────
function generateHistory(currentScore) {
  const pts = [];
  for (let i = 11; i >= 0; i--) {
    const t = new Date(Date.now() - i * 60000);
    const base = i === 0 ? currentScore : Math.random() * 0.4 + 0.05;
    pts.push({
      time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      score: parseFloat((base * 100).toFixed(1)),
      cpu: parseFloat((Math.random() * 60 + 10).toFixed(1)),
      spend: parseFloat((Math.random() * 3 + 0.3).toFixed(2)),
      accuracy: parseFloat((85 + Math.random() * 10).toFixed(1)),
    });
  }
  return pts;
}

// ─── Nav item ──────────────────────────────────────────────────────────────
function NavItem({ icon: Icon, label, active, onClick, alert }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '0.85rem',
      padding: '0.8rem 1rem', borderRadius: '12px', width: '100%',
      background: active ? 'linear-gradient(90deg, rgba(167, 139, 250, 0.15) 0%, transparent 100%)' : 'transparent',
      border: 'none',
      color: active ? '#ffffff' : '#64748b', cursor: 'pointer',
      transition: 'all 0.3s ease', fontFamily: 'inherit', textAlign: 'left',
      position: 'relative',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 38, height: 38, borderRadius: 10,
        background: active ? 'rgba(0,0,0,0.5)' : 'transparent',
        border: active ? '1px solid rgba(167,139,250,0.4)' : '1px solid transparent',
        boxShadow: active ? '0 0 10px rgba(167,139,250,0.3)' : 'none'
      }}>
        <Icon size={18} color={active ? PURPLE : '#64748b'} />
      </div>
      <span style={{ fontSize: '0.85rem', fontWeight: active ? 600 : 400, letterSpacing: '0.5px' }}>{label}</span>
      {alert && (
        <span style={{
          marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%',
          background: RED, boxShadow: `0 0 8px ${RED}`,
          animation: 'pulse-dot 1.5s infinite'
        }} />
      )}
    </button>
  );
}

// ─── Stat tile ─────────────────────────────────────────────────────────────
function StatTile({ label, value, sub, color = PURPLE, icon: Icon }) {
  return (
    <div className="card-base card-premium" style={{
      padding: '1.6rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', justifyContent: 'center'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
        <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</span>
        {Icon && <Icon size={14} color={color} style={{ opacity: 0.8 }} />}
      </div>
      <span style={{ fontSize: '1.5rem', fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1, zIndex: 1 }}>{value}</span>
      {sub && <span style={{ fontSize: '0.72rem', color: '#64748b', zIndex: 1 }}>{sub}</span>}
    </div>
  );
}

// ─── Health bar row ────────────────────────────────────────────────────────
function HealthBar({ label, pct, lastSeen, ok }) {
  return (
    <div style={{ padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 8, marginBottom: '0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Circle size={8} fill={ok ? PURPLE : RED} color={ok ? PURPLE : RED} />
          <span style={{ fontSize: '0.82rem', color: '#e2e8f0' }}>{label}</span>
        </div>
        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{lastSeen}</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 9999 }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 9999,
          background: ok ? `linear-gradient(90deg,${PURPLE_DIM},${PURPLE})` : RED,
          transition: 'width 0.6s ease'
        }} />
      </div>
      <span style={{ fontSize: '0.7rem', color: ok ? PURPLE : RED, marginTop: '0.3rem', display: 'block' }}>{pct}%</span>
    </div>
  );
}

// ─── Signal pill ───────────────────────────────────────────────────────────
function SignalPill({ label, value, max = 1 }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = value > 0.7 ? RED : value > 0.4 ? ORANGE : PURPLE;
  return (
    <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: '0.75rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace' }}>{(value * 100).toFixed(0)}%</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 9999 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 9999, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PAGES
// ════════════════════════════════════════════════════════════════════════════

// ─── Dashboard page ────────────────────────────────────────────────────────
function DashboardPage({ score, status, narrative, logs, authSession, handleRollback }) {
  const scoreColor = score >= 0.8 ? RED : score >= 0.6 ? ORANGE : PURPLE;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Gauge + narrative */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.25rem' }}>

        {/* Gauge card */}
        <div className="card-base card-standard" style={{
          padding: '1.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem'
        }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Live Score</span>
            <span style={{
              fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: 9999,
              background: status === 'calculating' ? 'rgba(167,139,250,0.1)' : score >= 0.8 ? 'rgba(239,68,68,0.1)' : score >= 0.6 ? 'rgba(249,115,22,0.1)' : 'rgba(16,185,129,0.1)',
              color: status === 'calculating' ? PURPLE : score >= 0.8 ? RED : score >= 0.6 ? ORANGE : GREEN,
              border: `1px solid ${status === 'calculating' ? 'rgba(167,139,250,0.2)' : score >= 0.8 ? 'rgba(239,68,68,0.2)' : score >= 0.6 ? 'rgba(249,115,22,0.2)' : 'rgba(16,185,129,0.2)'}`,
              fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase'
            }}>
              {status === 'calculating' ? '⟳ Analyzing' : score >= 0.8 ? '⚠ Critical' : score >= 0.6 ? '● Warning' : '✓ Healthy'}
            </span>
          </div>
          <HealthGauge score={score} status={status} />
          <div style={{ width: '100%' }}>
            <SignalPill label="IsoForest (CPU)" value={score >= 0.8 ? 0.95 : score >= 0.6 ? 0.65 : 0.1 + Math.random() * 0.1} />
            <div style={{ height: '0.5rem' }} />
            <SignalPill label="Holt-Winters (Spend)" value={score >= 0.8 ? 0.85 : score >= 0.6 ? 0.72 : 0.08 + Math.random() * 0.1} />
            <div style={{ height: '0.5rem' }} />
            <SignalPill label="Z-Score (Network)" value={score >= 0.8 ? 0.9 : score >= 0.6 ? 0.61 : 0.05 + Math.random() * 0.1} />
          </div>
        </div>

        {/* Narrative card */}
        <div className="card-base card-standard" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Brain size={18} color={PURPLE} />
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>AI Analyst — Root Cause Report</span>
            </div>
            {score >= 0.8 && (
              <button onClick={handleRollback} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.4rem 0.9rem', borderRadius: 8, fontSize: '0.75rem',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                color: RED, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600
              }}>
                <RotateCcw size={13} /> Undo Remediation
              </button>
            )}
          </div>

          {narrative ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
              {[
                { label: 'Actor (Who)', value: narrative.who, color: '#94a3b8' },
                { label: 'Event (What)', value: narrative.what, color: '#94a3b8' },
                { label: 'Context & Reasoning (Why)', value: narrative.why, color: '#e2e8f0' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '1rem' }}>
                  <p style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '0.35rem' }}>{label}</p>
                  <p style={{ fontSize: '0.9rem', color, lineHeight: 1.55 }}>{value}</p>
                </div>
              ))}
              <div style={{ background: score >= 0.8 ? 'rgba(239,68,68,0.06)' : 'rgba(249,115,22,0.06)', border: `1px solid ${score >= 0.8 ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)'}`, borderRadius: 10, padding: '1rem' }}>
                <p style={{ fontSize: '0.68rem', color: score >= 0.8 ? RED : ORANGE, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '0.35rem' }}>Automated Assessment</p>
                <p style={{ fontSize: '0.9rem', color: '#e2e8f0', lineHeight: 1.55 }}>{narrative.action}</p>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.45, gap: '1rem' }}>
              <CheckCircle size={36} color={PURPLE} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.9rem', color: '#e2e8f0', marginBottom: '0.4rem' }}>System functioning optimally</p>
                <p style={{ fontSize: '0.78rem', color: '#64748b' }}>Baseline cost behavior observed. Monitoring for anomaly events...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live event log */}
      <div className="card-base card-standard" style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <Terminal size={15} color={PURPLE} />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8' }}>Live Event Stream</span>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: PURPLE, marginLeft: 'auto', animation: 'pulse-dot 1.5s infinite', boxShadow: `0 0 6px ${PURPLE}` }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {logs.slice(-5).reverse().map((log, idx) => (
            <div key={idx} style={{
              display: 'flex', gap: '1rem', padding: '0.6rem 0.85rem',
              background: 'rgba(0,0,0,0.2)', borderRadius: 8,
              borderLeft: `2px solid ${log.msg.includes('CRITICAL') ? RED : log.msg.includes('WARNING') ? ORANGE : PURPLE}`,
              animation: idx === 0 ? 'slideUpFade 0.4s ease' : 'none'
            }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap', marginTop: 1 }}>[{log.time}]</span>
              <span style={{ fontSize: '0.8rem', color: log.msg.includes('CRITICAL') ? '#fca5a5' : log.msg.includes('WARNING') ? '#fdba74' : '#e2e8f0' }}>{log.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Analytics page ────────────────────────────────────────────────────────
function AnalyticsPage({ history }) {

  const data = history && history.length > 0 ? history : [];
  
  // ── Metrics Timeline data for the main chart
  const timelineData = data.slice().reverse().map(h => {
    const d = new Date(h.time);
    return {
      day: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cpu: parseFloat(h.cpu) || 0,
      score: parseFloat((h.score * 100).toFixed(1)) || 0,
      baseline: 50 // Reference line
    };
  });

  // Calculate KPIs
  const totalAnomaliesStr = data.filter(h => h.is_anomaly).length.toString();
  const avgCpu = data.length > 0 ? (data.reduce((acc, h) => acc + (parseFloat(h.cpu) || 0), 0) / data.length).toFixed(1) + "%" : "0%";
  const avgScore = data.length > 0 ? (data.reduce((acc, h) => acc + (parseFloat(h.score) || 0), 0) / data.length).toFixed(2) : "0.00";
  const recordsLen = data.length.toString();

  // ── Mini sparkline data for KPI cards
  const scoreSparkline = data.slice().reverse().map(h => ({ v: parseFloat(h.score) * 100 || 0 }));
  const cpuSparkline = data.slice().reverse().map(h => ({ v: parseFloat(h.cpu) || 0 }));

  // ── Critical alerts
  const alerts = data.filter(h => h.is_anomaly).slice(0, 5).map(h => ({
    title: `Anomaly Detected - Instance ${h.instance_id.substring(0,8)}...`,
    time: new Date(h.time).toLocaleString(),
    severity: h.score >= 0.8 ? 'critical' : 'warning'
  }));

  // Map Service Chart -> Instance Suspicion Chart
  const instanceMap = {};
  data.forEach(h => {
     if(!instanceMap[h.instance_id]) instanceMap[h.instance_id] = { instance: h.instance_id.substring(0,10), Suspicion: 0, count: 0 };
     instanceMap[h.instance_id].Suspicion += h.score;
     instanceMap[h.instance_id].count += 1;
  });
  const instanceData = Object.values(instanceMap).map(v => ({ instance: v.instance, Suspicion: (v.Suspicion / v.count).toFixed(2) }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: '#0f1419', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '0.75rem 1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
        <p style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.4rem' }}>{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ fontSize: '0.8rem', color: p.color, fontFamily: 'JetBrains Mono, monospace' }}>
            {p.name}: {typeof p.value === 'number' ? p.value.toFixed?.(1) ?? p.value : p.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#f0f4f8' }}>
          TimescaleDB Metrics
        </h2>
      </div>

      {/* ── KPI Grid (2×2) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

        {/* Total Anomalies Detected */}
        <div className="card-base card-premium" style={{ padding: '1.5rem 1.5rem 0.5rem', position: 'relative', overflow: 'hidden' }}>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.3rem', zIndex: 1, position: 'relative' }}>Identified Anomalies</p>
          <h3 style={{ fontSize: '2.2rem', fontWeight: 700, color: '#ffffff', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1, zIndex: 1, position: 'relative' }}>{totalAnomaliesStr}</h3>
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: '55%', height: 70, opacity: 0.5 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={scoreSparkline} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="kpiSparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PURPLE} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={PURPLE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={PURPLE} strokeWidth={1.5} fill="url(#kpiSparkGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Avg CPU */}
        <div className="card-base card-premium" style={{ padding: '1.5rem', position: 'relative' }}>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.3rem', zIndex: 1, position: 'relative' }}>Avg CPU Usage</p>
          <h3 style={{ fontSize: '2.2rem', fontWeight: 700, color: '#ffffff', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1, zIndex: 1, position: 'relative' }}>{avgCpu}</h3>
          <div style={{ position: 'absolute', bottom: 8, right: 16, display: 'flex', gap: 3, alignItems: 'flex-end', height: 45, opacity: 0.5 }}>
            {cpuSparkline.slice(0, 10).map((d, i) => (
              <div key={i} style={{
                width: 6, height: `${Math.min(100, d.v)}%`, borderRadius: 2,
                background: `linear-gradient(to top, ${PURPLE_DIM}, ${PURPLE})`
              }} />
            ))}
          </div>
        </div>

        {/* AI Optimization Savings */}
        <div className="card-base card-premium" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ zIndex: 1, position: 'relative' }}>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Average Score</p>
            <h3 style={{ fontSize: '2.2rem', fontWeight: 700, color: '#ffffff', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{avgScore}</h3>
          </div>
          <Activity size={48} color={PURPLE} strokeWidth={2.5} style={{ opacity: 0.35, zIndex: 1, position: 'relative' }} />
        </div>

        {/* Total Monitored */}
        <div className="card-base card-premium" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ zIndex: 1, position: 'relative' }}>
             <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.3rem', zIndex: 1, position: 'relative' }}>Events Monitored</p>
             <h3 style={{ fontSize: '2.2rem', fontWeight: 700, color: '#ffffff', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1, zIndex: 1, position: 'relative' }}>{recordsLen}</h3>
          </div>
          <Server size={48} color={PURPLE} strokeWidth={2.5} style={{ opacity: 0.35, zIndex: 1, position: 'relative' }} />
        </div>
      </div>

      {/* ── Charts Row: Accuracy + Anomaly Detection ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.25rem' }}>

        {/* Daily Model Accuracy & Throughput */}
        <div className="card-base card-standard" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>Instance CPU & Suspicion Trend</p>
              <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>TimescaleDB History</p>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.3rem 0.7rem', borderRadius: 8,
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
              fontSize: '0.72rem', color: '#94a3b8', cursor: 'pointer'
            }}>
              Sync <RefreshCw size={12} color="#64748b" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData} margin={{ top: 4, right: 8, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PURPLE} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={PURPLE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#4a5568' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#4a5568' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="score" name="Score" stroke={PURPLE} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: PURPLE, stroke: '#fff', strokeWidth: 2 }} />
              <Line type="monotone" dataKey="cpu" name="CPU %" stroke={SILVER} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: SILVER }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Anomaly Detection by Service */}
        <div className="card-base card-standard" style={{ padding: '1.5rem' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.3rem' }}>Average Suspicion by Instance</p>
          <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '1rem' }}>(Live)</p>
          <div style={{ height: '3rem' }} />
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={instanceData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="instance" tick={{ fontSize: 8, fill: '#4a5568' }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10, fill: '#4a5568' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Suspicion" name="Suspicion" fill="#a78bfa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Recent Critical Alerts ── */}
      <div style={{ marginTop: '0.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '1rem' }}>TimescaleDB Alert Log</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {alerts.length > 0 ? alerts.map((a, i) => (
            <div key={i} className="card-base card-standard" style={{
              padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem'
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                background: a.severity === 'critical' ? RED : a.severity === 'warning' ? ORANGE : PURPLE,
                boxShadow: `0 0 8px ${a.severity === 'critical' ? RED : a.severity === 'warning' ? ORANGE : PURPLE}`
              }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 500 }}>{a.title}</p>
                <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>{a.time}</p>
              </div>
            </div>
          )) : (
             <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>No anomalies recorded in history yet.</div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '1.5rem 0 0.5rem', borderTop: `1px solid ${BORDER}` }}>
        <p style={{ fontSize: '0.72rem', color: '#475569' }}>Prune.ai © {new Date().getFullYear()}. Enterprise AIOps Platform. All rights reserved.</p>
      </div>
    </div>
  );
}



// ════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ════════════════════════════════════════════════════════════════════════════

export default function App() {
  const [authSession, setAuthSession] = useState(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [status, setStatus] = useState('healthy');
  const [score, setScore] = useState(0.12);
  const [narrative, setNarrative] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [logs, setLogs] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyData, setHistoryData] = useState(() => generateHistory(0.12));
  const [hasAlert, setHasAlert] = useState(false);

  const addLog = (msg) => setLogs(prev => [...prev.slice(-14), { time: new Date().toLocaleTimeString(), msg }]);

  const fetchHistory = async () => {
    if (!authSession) return;
    try {
      const backendUrl = import.meta.env.VITE_APP_BACKEND_URL || 'http://localhost:8000';
      const resp = await fetch(`${backendUrl}/api/history?role_arn=${encodeURIComponent(authSession.role_arn)}`);
      const data = await resp.json();
      setHistory(data);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  useEffect(() => {
    if (authSession) fetchHistory();
  }, [authSession]);

  useEffect(() => {
    if (!authSession) return;

    const wsUrl = import.meta.env.VITE_APP_WS_URL || 'ws://localhost:8000/ws';
    addLog(`System initialized. Role: ${authSession.token}`);
    
    // Establishing real WebSocket connection to Backend
    const socket = new WebSocket(`${wsUrl}?token=${authSession.token}`);

    socket.onopen = () => {
      setWsConnected(true);
      addLog('WebSocket connected to CloudScope Production Gateway.');
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      addLog(`INCOMING ALERT: Suspicion Score ${data.suspicion_score}`);

      setScore(data.suspicion_score);
      setHistoryData(generateHistory(data.suspicion_score));
      setHasAlert(data.suspicion_score >= 0.6);

      if (data.narrative) {
        setNarrative(data.narrative);
        addLog(`Incoming Anomaly Detected: ${data.instance_id}`);
        fetchHistory();
      }

      if (data.suspicion_score >= 0.8) {
        setStatus('critical');
      } else if (data.suspicion_score >= 0.6) {
        setStatus('warning');
      } else {
        setStatus('healthy');
      }
    };

    socket.onclose = () => {
      setWsConnected(false);
      addLog('WebSocket disconnected. Retrying...');
    };

    // If backend is not available, we can still run a "demo mode" locally
    // but the user asked for full integration, so we'll prioritize the socket.

    return () => {
        socket.close();
    };
  }, [authSession]);

  const handleRollback = async () => {
    setStatus('calculating');
    addLog('User requested Undo. Pushing command to FastAPI /api/rollback...');
    
    try {
      const backendUrl = import.meta.env.VITE_APP_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            role_arn: authSession.token, 
            instance_id: 'i-0abcd1234efgh5678' 
        }),
      });
      
      if (response.ok) {
        setTimeout(() => {
            setScore(0.05);
            setStatus('healthy');
            setNarrative(null);
            setHasAlert(false);
            setHistoryData(generateHistory(0.05));
            addLog('Rollback successful. Instances restarted. Added to DynamoDB Snooze Registry.');
          }, 2000);
      } else {
          addLog('Rollback failed. Server error.');
      }
    } catch (err) { 
        addLog(`Rollback error: ${err.message}`);
    }
  };

  if (!authSession) return <Login onAuthSuccess={s => setAuthSession(s)} />;

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'analytics', icon: BarChart2, label: 'Analytics' },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.85)} }
        @keyframes slideUpFade { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:${BG}; font-family:'Syne',sans-serif; color:#f0f4f8; min-height:100vh; }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:rgba(167,139,250,0.3);border-radius:9999px}
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh' }}>

        {/* ── Sidebar ── */}
        <div style={{
          width: 220, flexShrink: 0, background: 'rgba(18,25,29,0.98)',
          borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column',
          padding: '1.5rem 1rem', gap: '0.25rem', position: 'sticky', top: 0, height: '100vh', zIndex: 10,
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.5rem', marginBottom: '2rem' }}>
            <img src="/logo.png" alt="prune.ai logo" style={{ width: '110px', objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }} />
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginTop: '0.75rem', letterSpacing: '-0.5px' }}>prune.ai</h1>
            <p style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.15rem', textTransform: 'uppercase', letterSpacing: '2px' }}>AIOps Dashboard</p>
          </div>

          {/* Nav */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
            {navItems.map(n => (
              <NavItem key={n.id} icon={n.icon} label={n.label} active={activePage === n.id}
                onClick={() => setActivePage(n.id)} alert={n.alert} />
            ))}
          </div>

          {/* Account + signout */}
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 10, marginBottom: '0.75rem' }}>
              <p style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Active Account</p>
              <p style={{ fontSize: '0.78rem', color: PURPLE, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{authSession.accountId?.replace(/\s*\(\s*demo\s*\)\s*/i, '')}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.4rem' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: wsConnected ? PURPLE : RED, boxShadow: `0 0 4px ${wsConnected ? PURPLE : RED}` }} />
                <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{wsConnected ? 'WebSocket Online' : 'Connecting...'}</span>
              </div>
            </div>
            <button onClick={() => setAuthSession(null)} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 1rem', borderRadius: 8, width: '100%', fontSize: '0.78rem',
              background: 'transparent', border: `1px solid ${BORDER}`, color: '#64748b',
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
            }}>
              <LogOut size={14} /> Switch Account
            </button>
          </div>
        </div>

        {/* ── Main content ── */}
        <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', maxHeight: '100vh' }}>

          {/* Top bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '1.75rem', paddingBottom: '1.25rem', borderBottom: `1px solid ${BORDER}`
          }}>
            <div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f0f4f8', fontFamily: 'Syne' }}>
                {navItems.find(n => n.id === activePage)?.label}
              </h1>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                {new Date().toLocaleString()} · prune.ai AIOps
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {status === 'calculating' && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.35rem 0.85rem', borderRadius: 9999,
                  background: 'rgba(167,139,250,0.08)', border: `1px solid rgba(167,139,250,0.2)`,
                  fontSize: '0.72rem', color: PURPLE, fontWeight: 600
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    border: `2px solid ${PURPLE}`, borderTopColor: 'transparent',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  Analyzing
                </div>
              )}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.35rem 0.85rem', borderRadius: 9999,
                background: score >= 0.8 ? 'rgba(239,68,68,0.08)' : score >= 0.6 ? 'rgba(249,115,22,0.08)' : 'rgba(16,185,129,0.08)',
                border: `1px solid ${score >= 0.8 ? 'rgba(239,68,68,0.2)' : score >= 0.6 ? 'rgba(249,115,22,0.2)' : 'rgba(16,185,129,0.2)'}`,
                fontSize: '0.72rem',
                color: score >= 0.8 ? RED : score >= 0.6 ? ORANGE : GREEN,
                fontWeight: 600
              }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: score >= 0.8 ? RED : score >= 0.6 ? ORANGE : GREEN,
                  animation: 'pulse-dot 1.5s infinite'
                }} />
                {score >= 0.8 ? 'Critical' : score >= 0.6 ? 'Warning' : 'Healthy'} · {(score * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Page content */}
          {activePage === 'dashboard' && (
            <DashboardPage score={score} status={status} narrative={narrative}
              logs={logs} authSession={authSession} handleRollback={handleRollback} />
          )}
          {activePage === 'analytics' && (
            <AnalyticsPage history={history} />
          )}
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}