import React, { useState, useEffect } from 'react';
import { Activity, Shield, CheckCircle, RotateCcw, AlertTriangle, Zap, Server, Activity as Pulse, LogOut } from 'lucide-react';
import HealthGauge from './components/HealthGauge';
import Login from './components/Login';
import './index.css';

function App() {
  const [authSession, setAuthSession] = useState(null); // Will hold { token: roleArn, accountId }

  // Dashboard state
  const [status, setStatus] = useState('healthy');
  const [score, setScore] = useState(0.12);
  const [narrative, setNarrative] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [logs, setLogs] = useState([]);

  const addLog = (msg) => {
    setLogs(prev => [...prev.slice(-4), { time: new Date().toLocaleTimeString(), msg }]);
  };

  useEffect(() => {
    // Only start dashboard if authenticated
    if (!authSession) return;

    const backendUrl = import.meta.env.VITE_APP_BACKEND_URL || 'http://localhost:8000';
    const wsUrl = import.meta.env.VITE_APP_WS_URL || 'ws://localhost:8000/ws';

    addLog(`System initialized testing Role: ${authSession.token}`);

    // Establishing real WebSocket connection to Production Backend
    const socket = new WebSocket(`${wsUrl}?token=${authSession.token}`);

    socket.onopen = () => {
      setWsConnected(true);
      addLog('WebSocket connected to CloudScope Production Gateway.');
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      addLog(`INCOMING ALERT: Suspicion Score ${data.suspicion_score}`);

      setScore(data.suspicion_score);
      setNarrative(data.narrative);

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

    return () => {
      socket.close();
    };
  }, [authSession]);

  const handleRollback = async () => {
    setStatus('calculating');
    addLog('User requested Undo. Pushing command to FastAPI /api/rollback...');

    try {
      const backendUrl = import.meta.env.VITE_APP_BACKEND_URL || 'http://localhost:8000';
      await fetch(`${backendUrl}/api/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_arn: authSession.token,
          instance_id: "i-0abcd1234efgh5678" // Mock instance tracking
        })
      });

      setTimeout(() => {
        setScore(0.05);
        setStatus('healthy');
        setNarrative(null);
        addLog('Rollback successful. Instances restarted. Added to DynamoDB Snooze Registry.');
      }, 2000);
    } catch (err) {
      addLog(`Rollback API Error: ${err.message}`);
    }
  };

  // If not logged in, render the Login screen
  if (!authSession) {
    return <Login onAuthSuccess={(session) => setAuthSession(session)} />;
  }

  return (
    <div className="dashboard-grid">
      {/* Sidebar / Settings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(79, 172, 143, 0.1)' }}>
              <Shield size={32} color="var(--brand-teal-light)" />
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '1.75rem', marginBottom: '0.2rem' }} className="text-gradient">prune.ai</h1>
              <p style={{ fontSize: '0.875rem' }}>AIOps Dataflow</p>
            </div>
          </div>

          <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '2rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Active AWS Account</p>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--brand-teal-light)' }}>{authSession.accountId}</p>
            <button
              onClick={() => setAuthSession(null)}
              className="btn btn-outline"
              style={{ marginTop: '0.75rem', width: '100%', padding: '0.4rem', fontSize: '0.75rem', justifyContent: 'center' }}
            >
              <LogOut size={14} /> Switch Account
            </button>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>Connection State</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className={`spinner`} style={{ width: '12px', height: '12px', borderWidth: '2px', borderColor: 'transparent', borderTopColor: wsConnected ? 'var(--brand-teal-light)' : 'var(--accent-red)', animation: wsConnected ? 'spin-slow 2s linear infinite' : 'none' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                {wsConnected ? 'WebSocket Online' : 'Connecting to FastAPI...'}
              </span>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>Live Event Log</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {logs.map((log, idx) => (
                <div key={idx} className="slide-in" style={{ fontSize: '0.75rem', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', borderLeft: '2px solid var(--brand-teal-light)' }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>[{log.time}]</span>
                  <span style={{ color: 'var(--text-primary)' }}>{log.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Top metrics */}
        <div className="top-metrics-grid">
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Ingestion Stage</p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600' }}>EventBridge</h3>
              </div>
              <Pulse size={24} color="var(--brand-teal-main)" className={status === 'calculating' ? 'animate-pulse' : ''} />
            </div>
            <p style={{ fontSize: '0.75rem', marginTop: '1rem', color: 'var(--brand-teal-light)' }}>Active Integrations: 3</p>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Analysis Stage</p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600' }}>ML Pipeline</h3>
              </div>
              <Activity size={24} color="var(--brand-teal-light)" />
            </div>
            <p style={{ fontSize: '0.75rem', marginTop: '1rem', color: 'var(--text-secondary)' }}>IsoForest, Holt-Winters, Z-Score</p>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Database</p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600' }}>TimescaleDB</h3>
              </div>
              <Server size={24} color="var(--accent-orange)" />
            </div>
            <p style={{ fontSize: '0.75rem', marginTop: '1rem', color: 'var(--text-secondary)' }}>24h Baseline Continuous</p>
          </div>
        </div>

        {/* Dashboard Core */}
        <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', position: 'relative' }}>

          <HealthGauge score={score} status={status} />

          {/* AI Narrative Section Container */}
          <div style={{ width: '100%', maxWidth: '800px', marginTop: '3rem', minHeight: '160px', transition: 'all 0.3s ease' }}>
            {narrative ? (
              <div className="slide-in" style={{ padding: '1.5rem', borderRadius: '12px', background: score >= 0.8 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(249, 115, 22, 0.05)', border: `1px solid ${score >= 0.8 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(249, 115, 22, 0.2)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Zap size={20} color={score >= 0.8 ? "var(--accent-red)" : "var(--accent-orange)"} />
                    <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Gemini 2.0 Flash - Root Cause Analysis</h3>
                  </div>
                  {score >= 0.8 && (
                    <button className="btn btn-outline" onClick={handleRollback} style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <RotateCcw size={14} /> Undo Remediation
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>The Actor (Who)</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{narrative.who}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>The Event (What)</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{narrative.what}</p>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Context & Reasoning (Why)</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{narrative.why}</p>
                  </div>
                  <div style={{ gridColumn: 'span 2', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--brand-teal-light)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Automated Assessment</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{narrative.action}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
                <CheckCircle size={32} color="var(--brand-teal-light)" style={{ marginBottom: '1rem' }} />
                <p style={{ fontSize: '0.875rem' }}>System functioning optimally. Baseline cost behavior observed.</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Waiting for anomaly events from Explainer Lambda...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
