import React, { useState, useEffect } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { EncryptionScreen } from './screens/EncryptionScreen';
import { DashboardScreen } from './screens/DashboardScreen';

export default function App() {
  const [userAddress, setUserAddress] = useState<string | null>(() => {
    return localStorage.getItem('userAddress');
  });
  const [shareToEncrypt, setShareToEncrypt] = useState<string | null>(null);
  const [isEncrypted, setIsEncrypted] = useState<boolean>(() => {
    return !!localStorage.getItem('passkeyEncryptedShare');
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLoginSuccess = (address: string, share?: string) => {
    setUserAddress(address);
    localStorage.setItem('userAddress', address);
    if (share) {
      setShareToEncrypt(share);
    }
  };

  const handleEncryptionComplete = () => {
    setShareToEncrypt(null);
    setIsEncrypted(true);
  };

  const handleDisconnect = () => {
    setUserAddress(null);
    setShareToEncrypt(null);
    setIsEncrypted(false);
    localStorage.removeItem('userAddress');
    localStorage.removeItem('passkeyEncryptedShare');
    localStorage.removeItem('webAuthnCredentialId');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const renderContent = () => {
    if (!userAddress) {
      return <HomeScreen onLoginSuccess={handleLoginSuccess} />;
    }

    if (shareToEncrypt && !isEncrypted) {
      return <EncryptionScreen share={shareToEncrypt} onEncryptionComplete={handleEncryptionComplete} />;
    }

    return <DashboardScreen address={userAddress} onDisconnect={handleDisconnect} />;
  };

  return (
    <div className="app-container">
      <button className="theme-toggle" onClick={toggleTheme} title="Toggle Theme">
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      {renderContent()}
    </div>
  );
}
