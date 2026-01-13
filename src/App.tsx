import React, { useState, useEffect } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { EncryptionScreen } from './screens/EncryptionScreen';
import { CloudBackupScreen } from './screens/CloudBackupScreen';
import { RecoveryScreen } from './screens/RecoveryScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { encryptData, decryptData } from '../encryptions';

export default function App() {
  const [userAddress, setUserAddress] = useState<string | null>(() => {
    return localStorage.getItem('userAddress');
  });
  const [shareToEncrypt, setShareToEncrypt] = useState<string | null>(null);
  const [isEncrypted, setIsEncrypted] = useState<boolean>(() => {
    return !!localStorage.getItem('passkeyEncryptedShare');
  });
  const [isCloudBackedUp, setIsCloudBackedUp] = useState<boolean>(() => {
    return localStorage.getItem('isCloudBackedUp') === 'true';
  });
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    const handleTriggerRecovery = () => setShowRecovery(true);
    window.addEventListener('trigger-recovery', handleTriggerRecovery);
    return () => window.removeEventListener('trigger-recovery', handleTriggerRecovery);
  }, []);

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
    console.log("User logged in with address:", address, share);
    if (share) {
      setShareToEncrypt(share);
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

  const handleRecoveryComplete = (mnemonic: string) => {
    console.log("Recovery successful! Wallet Mnemonic:", mnemonic);
    setShowRecovery(false);
    setIsCloudBackedUp(true); // Ensure state is synced
    localStorage.setItem('isCloudBackedUp', 'true');
    alert("Wallet successfully recovered! Check console for mnemonic.");
  };

  const handleDisconnect = () => {
    setUserAddress(null);
    setShareToEncrypt(null);
    setIsEncrypted(false);
    localStorage.removeItem('userAddress');
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
      return <HomeScreen onLoginSuccess={handleLoginSuccess} />;
    }

    if (shareToEncrypt && !isEncrypted) {
      return <EncryptionScreen share={shareToEncrypt} onEncryptionComplete={handleEncryptionComplete} />;
    }

    if (isEncrypted && !isCloudBackedUp) {
      return <CloudBackupScreen onBackupComplete={handleBackupComplete} />;
    }

    if (showRecovery) {
      return <RecoveryScreen
        onRecoveryComplete={handleRecoveryComplete}
        onCancel={() => setShowRecovery(false)}
      />;
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
