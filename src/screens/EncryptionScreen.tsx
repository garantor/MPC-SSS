import React, { useState } from 'react';
import { useSigner } from '../hooks/useSigner';

interface EncryptionScreenProps {
    share: string;
    onEncryptionComplete: () => void;
}

export function EncryptionScreen({ share, onEncryptionComplete }: EncryptionScreenProps) {
    const { encryptShareWithPasskey } = useSigner();
    const [loading, setLoading] = useState(false);

    const handleEncrypt = async () => {
        setLoading(true);
        try {
            console.log("Starting encryption for share: inside the EncryptionScreen", share);
            await encryptShareWithPasskey(share);
            onEncryptionComplete();
        } catch (error) {
            console.error('Encryption Error:', error);
            alert('Security setup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <div className="security-icon">🛡️</div>
            <h1>Secure Your Wallet</h1>
            <p>
                We've generated your wallet shares. Now, let's encrypt your personal share with your passkey for maximum security.
            </p>

            <div className="security-tip">
                <strong>💡 Why this matters:</strong> This ensures your wallet can ONLY be accessed by you, even if our servers or your local storage are compromised.
            </div>

            <div className="step-indicator">
                <div className="step active"></div>
                <div className="step active"></div>
                <div className="step"></div>
            </div>

            <div className="button-group">
                <button
                    className="btn-primary"
                    onClick={handleEncrypt}
                    disabled={loading}
                >
                    {loading ? 'SECURING WALLET...' : 'SECURE WITH PASSKEY'}
                </button>
            </div>
        </div>
    );
}
