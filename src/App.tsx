import React, { useState, useEffect } from 'react';
import { useSigner } from './hooks/useSigner';

interface HomeScreenProps {
  onLoginSuccess: (address: string) => void;
}

function HomeScreen({ onLoginSuccess }: HomeScreenProps) {
  const { getSigner } = useSigner();
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    console.log('Login Pressed');
    setLoading(true);
    try {
      let signerResult = await getSigner();
      const address = signerResult.owner.address;
      console.log("Signer info:", signerResult);
      onLoginSuccess(address);
    } catch (error) {
      console.error('Login Error:', error);
      alert('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h1>Welcome</h1>
      <p>Securely access your MPC wallet</p>

      <div className="button-group">
        <button
          className="btn-primary"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'CONNECTING...' : 'LOGIN WITH PASSKEY'}
        </button>

        <button
          className="btn-outline"
          onClick={() => console.log('Signup Pressed')}
          disabled={loading}
        >
          SIGNUP
        </button>
      </div>
    </div>
  );
}

interface DashboardProps {
  address: string;
  onDisconnect: () => void;
}

function DashboardScreen({ address, onDisconnect }: DashboardProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card">
      <div className="success-icon">✓</div>
      <div className="badge">VERIFIED ACCOUNT</div>
      <h1>Dashboard</h1>
      <p>Welcome back to your secure dashboard.</p>

      <span className="label">Your Blockchain Address</span>
      <div className="address-box" onClick={copyToClipboard} title="Click to copy">
        {address}
        {copied && (
          <div style={{
            position: 'absolute',
            top: '-30px',
            right: '0',
            background: 'var(--primary)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '0.7rem'
          }}>
            COPIED!
          </div>
        )}
      </div>

      <div className="button-group">
        <button className="btn-primary" onClick={() => alert('Feature coming soon!')}>
          SEND ASSETS
        </button>
        <button className="btn-outline btn-disconnect" onClick={onDisconnect}>
          DISCONNECT
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="app-container">
      <button className="theme-toggle" onClick={toggleTheme} title="Toggle Theme">
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      {!userAddress ? (
        <HomeScreen onLoginSuccess={(addr) => setUserAddress(addr)} />
      ) : (
        <DashboardScreen address={userAddress} onDisconnect={() => setUserAddress(null)} />
      )}
    </div>
  );
}
