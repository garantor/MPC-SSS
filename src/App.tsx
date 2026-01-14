import React, { useState, useEffect } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { EncryptionScreen } from './screens/EncryptionScreen';
import { CloudBackupScreen } from './screens/CloudBackupScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { encryptData, decryptData } from '../encryptions';

export default function App() {
  const [userAddress, setUserAddress] = useState<string | null>(() => {
    return localStorage.getItem('userAddress');
  });
  const [solanaAddress, setSolanaAddress] = useState<string | null>(() => {
    return localStorage.getItem('solanaAddress');
  });
  const [shareToEncrypt, setShareToEncrypt] = useState<string | null>(null);
  const [isEncrypted, setIsEncrypted] = useState<boolean>(() => {
    return !!localStorage.getItem('passkeyEncryptedShare');
  });
  const [isCloudBackedUp, setIsCloudBackedUp] = useState<boolean>(() => {
    return localStorage.getItem('isCloudBackedUp') === 'true';
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLoginSuccess = (data: { evmAddress: string, solanaAddress: string }, share?: string) => {
    setUserAddress(data.evmAddress);
    setSolanaAddress(data.solanaAddress);
    localStorage.setItem('userAddress', data.evmAddress);
    localStorage.setItem('solanaAddress', data.solanaAddress);

    console.log("User logged in with addresses:", data, share);
    if (share) {
      setShareToEncrypt(share);
      setIsEncrypted(false);
    } else {
      // If no share is provided, it's a login (existing user)
      setIsEncrypted(true);
      setIsCloudBackedUp(true);
      localStorage.setItem('isCloudBackedUp', 'true');
    }
  };

  const handleEncryptionComplete = () => {
    // We don't clear shareToEncrypt yet because we might need it? 
    // Actually shareToEncrypt is the passkey share. cloudShare is already in localStorage.
    setIsEncrypted(true);
  };

  const handleBackupComplete = () => {
    setShareToEncrypt(null);
    setIsCloudBackedUp(true);
  };

  const handleDisconnect = () => {
    setUserAddress(null);
    setSolanaAddress(null);
    setShareToEncrypt(null);
    setIsEncrypted(false);
    localStorage.removeItem('userAddress');
    localStorage.removeItem('solanaAddress');
    // localStorage.removeItem('passkeyEncryptedShare');
    // localStorage.removeItem('webAuthnCredentialId');
    localStorage.removeItem('cloudShare');
    localStorage.removeItem('isCloudBackedUp');
    setIsCloudBackedUp(false);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const renderContent = () => {
    if (!userAddress) {
      return <HomeScreen onLoginSuccess={handleLoginSuccess as any} />;
    }

    if (shareToEncrypt && !isEncrypted) {
      return <EncryptionScreen share={shareToEncrypt} onEncryptionComplete={handleEncryptionComplete} />;
    }

    if (isEncrypted && !isCloudBackedUp) {
      return <CloudBackupScreen onBackupComplete={handleBackupComplete} />;
    }

    return <DashboardScreen evmAddress={userAddress} solanaAddress={solanaAddress || ''} onDisconnect={handleDisconnect} />;
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
