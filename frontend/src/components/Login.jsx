import React, { useState } from 'react';
import { Shield, Key, AlertCircle } from 'lucide-react';

const Login = ({ onAuthSuccess }) => {
  const [roleArn, setRoleArn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!roleArn.startsWith('arn:aws:iam::')) {
      setError("Please enter a valid AWS IAM Role ARN.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const backendUrl = import.meta.env.VITE_APP_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/auth/aws`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role_arn: roleArn })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Authentication Failed.");
      }

      onAuthSuccess({
        token: data.token,
        accountId: data.account_id
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1.5rem' }}>
      <div className="glass-card" style={{ maxWidth: '450px', width: '100%', padding: '2.5rem' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
          <img src="/logo.png" alt="prune.ai logo" style={{ width: '160px', marginBottom: '1.5rem', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.4))' }} />
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.875rem' }}>
            Authenticate via AWS Cross-Account Role to access your AIOps dashboard.
          </p>
        </div>

        {error && (
          <div className="slide-in" style={{
            padding: '1rem',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            marginBottom: '1.5rem'
          }}>
            <AlertCircle size={20} color="var(--accent-red)" />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Assume Role ARN
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '50%', left: '1.25rem', transform: 'translateY(-50%)', color: 'var(--accent-purple)', opacity: 0.8 }}>
                <Key size={16} />
              </div>
              <input
                type="text"
                value={roleArn}
                onChange={(e) => setRoleArn(e.target.value)}
                placeholder="arn:aws:iam::123456789012:role/PruneAI_Role"
                style={{
                  width: '100%',
                  padding: '1rem 1rem 1rem 3rem',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '14px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  transition: 'all 0.3s',
                  fontFamily: 'var(--font-mono)'
                }}
                required
              />
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.75rem', textAlign: 'center' }}>
              Ensure prune.ai's Principal is trusted in this role.
            </p>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '1rem', padding: '0.875rem', fontSize: '1rem' }}
          >
            {loading ? (
              <><div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} /> Connecting...</>
            ) : (
              'Connect AWS Account'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
