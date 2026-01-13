import React, { useState } from 'react';
import { useSigner } from '../hooks/useSigner';

interface HomeScreenProps {
    onLoginSuccess: (address: string, shareToEncrypt?: any) => void;
}

export function HomeScreen({ onLoginSuccess }: HomeScreenProps) {
    const { registerUser, retrievePasskeyShare } = useSigner();
    const [loading, setLoading] = useState(false);
    const [loginLoading, setLoginLoading] = useState(false);

    async function handlePasskeyLogin() {
        console.log('Passkey Login Pressed');
        setLoginLoading(true);
        try {
            const result = await retrievePasskeyShare();
            console.log('the returned result from retrievePasskeyShare in HomeScreen:', result);
            onLoginSuccess(result.address);
        } catch (error) {
            console.error('Passkey Login Error:', error);
            alert('Passkey login failed. Please ensure you have a registered wallet on this device.');
        } finally {
            setLoginLoading(false);
        }
    }

    async function handleLogin() {
        console.log('Signup Pressed');
        setLoading(true);
        try {
            const result: any = await registerUser();
            console.log('the returned result from registerUser in HomeScreen:', result);
            // Using mock address as previously implemented for flow demo
            onLoginSuccess(result.smartAccount.address, result.shareToEncrypt);
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
                    disabled={loading || loginLoading}
                >
                    {loading ? 'CONNECTING...' : 'SIGNUP WITH PASSKEY'}
                </button>

                <button
                    className="btn-outline"
                    onClick={handlePasskeyLogin}
                    disabled={loading || loginLoading}
                >
                    {loginLoading ? 'AUTHENTICATING...' : 'LOGIN WITH PASSKEY'}
                </button>
            </div>
        </div>
    );
}
