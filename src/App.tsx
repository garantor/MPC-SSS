import React, { useState, useEffect } from 'react';
import { formatEther } from 'viem';
import { useSigner } from './hooks/useSigner';
import { QRCodeSVG } from 'qrcode.react';
import { useTransactions } from './hooks/useTransactions';

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
      <p>
        Experience secure MPC technology with Passkey-authenticated trial wallets.
        <br />
        <span style={{ color: '#ef4444', fontWeight: '600', display: 'block', marginTop: '12px' }}>
          ⚠️ Warning: These are throwaway wallets for demo purposes. Do not use for real assets.
        </span>
      </p>

      <div className="button-group">
        <button
          className="btn-primary"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'CONNECTING...' : 'SIGNUP WITH PASSKEY'}
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
  const [balance, setBalance] = useState<string>('0.00');
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);

  const { getBalance } = useTransactions(address as `0x${string}`);

  const fetchBalance = async () => {
    setIsLoadingBalance(true);
    try {
      const balanceWei = await getBalance();
      setBalance(formatEther(balanceWei));
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [address]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card">
      <div className="success-icon">✓</div>
      <div className="badge">VERIFIED ACCOUNT</div>

      <div className="balance-section">
        <span className="label">Available Balance</span>
        {isLoadingBalance ? (
          <div className="loading-skeleton"></div>
        ) : (
          <div className="balance-amount">
            {parseFloat(balance).toFixed(4)} <span className="balance-unit">ETH</span>
            <span className="refresh-icon" onClick={fetchBalance} title="Refresh Balance">🔄</span>
          </div>
        )}
      </div>

      <div className="qr-container">
        <QRCodeSVG
          value={address}
          size={140}
          level={"H"}
          includeMargin={false}
          imageSettings={{
            src: "/vite.svg",
            x: undefined,
            y: undefined,
            height: 24,
            width: 24,
            excavate: true,
          }}
        />
      </div>

      <span className="label">Your EVM Blockchain Address</span>
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
  const [userAddress, setUserAddress] = useState<string | null>(() => {
    return localStorage.getItem('userAddress');
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLoginSuccess = (address: string) => {
    setUserAddress(address);
    localStorage.setItem('userAddress', address);
  };

  const handleDisconnect = () => {
    setUserAddress(null);
    localStorage.removeItem('userAddress');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="app-container">
      <button className="theme-toggle" onClick={toggleTheme} title="Toggle Theme">
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      {!userAddress ? (
        <HomeScreen onLoginSuccess={handleLoginSuccess} />
      ) : (
        <DashboardScreen address={userAddress} onDisconnect={handleDisconnect} />
      )}
    </div>
  );
}
