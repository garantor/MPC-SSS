import React, { useState } from 'react';
import { useSigner } from '../hooks/useSigner';

interface HomeScreenProps {
    onLoginSuccess: (address: string, shareToEncrypt?: any) => void;
}

export function HomeScreen({ onLoginSuccess }: HomeScreenProps) {
    const { registerUser } = useSigner();
    const [loading, setLoading] = useState(false);

    async function handleLogin() {
        console.log('Signup Pressed');
        setLoading(true);
        try {
            const result = await registerUser();
            // Using mock address as previously implemented for flow demo
            onLoginSuccess("0x742d35Cc6634C0532925a3b844Bc454e4438f44e", result.shareToEncrypt);
        } catch (error) {
            console.error('Signup Error:', error);
            alert('Signup failed. Please try again.');
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
