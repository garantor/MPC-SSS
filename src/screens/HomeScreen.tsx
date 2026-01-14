import React, { useState, useEffect, useRef } from 'react';
import { useSigner } from '../hooks/useSigner';
import { GoogleIcon } from '../components/GoogleIcon';

interface HomeScreenProps {
    onLoginSuccess: (address: string, shareToEncrypt?: any) => void;
}

export function HomeScreen({ onLoginSuccess }: HomeScreenProps) {
    const { registerUser, retrievePasskeyShare, recoverWallet } = useSigner();
    const [loading, setLoading] = useState(false);
    const [loginLoading, setLoginLoading] = useState(false);
    const [recoveryLoading, setRecoveryLoading] = useState(false);
    const [recoveryStatus, setRecoveryStatus] = useState<'idle' | 'authorizing' | 'fetching' | 'success' | 'error'>('idle');

    // Recovery Refs
    const tokenClientRef = useRef<any>(null);
    const gapiInitedRef = useRef(false);
    const gisInitedRef = useRef(false);

    const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
    const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

    useEffect(() => {
        const gapiLoaded = () => {
            (window as any).gapi.load('client', initializeGapiClient);
        };

        const initializeGapiClient = async () => {
            await (window as any).gapi.client.init({
                discoveryDocs: [DISCOVERY_DOC],
            });
            gapiInitedRef.current = true;
        };

        const gisLoaded = () => {
            tokenClientRef.current = (window as any).google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: '',
            });
            gisInitedRef.current = true;
        };

        if ((window as any).gapi) gapiLoaded();
        if ((window as any).google) gisLoaded();
    }, []);

    async function handlePasskeyLogin() {
        // LOGIN FLOW
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

    async function passkeySignup() {
        // SIGNUP FLOW
        console.log('Signup Pressed');
        setLoading(true);
        try {
            const result: any = await registerUser();
            console.log('the returned result from registerUser in HomeScreen:', result);
            onLoginSuccess(result.smartAccount.address, result.shareToEncrypt);
        } catch (error) {
            console.error('Signup Error:', error);
            alert('Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    const handleRecovery = async () => {
        setRecoveryLoading(true);
        setRecoveryStatus('authorizing');

        try {
            if (!tokenClientRef.current) {
                throw new Error('Google Identity Services not initialized');
            }

            tokenClientRef.current.callback = async (resp: any) => {
                if (resp.error !== undefined) {
                    throw resp;
                }
                setRecoveryStatus('fetching');
                await fetchBackupAndRecover(1);
            };

            const token = (window as any).gapi.client.getToken();
            if (token !== null && (window as any).google.accounts.oauth2.hasGrantedAllScopes(token, SCOPES)) {
                setRecoveryStatus('fetching');
                await fetchBackupAndRecover();
            } else {
                tokenClientRef.current.requestAccessToken({ prompt: token ? '' : 'consent' });
            }

        } catch (error: any) {
            console.error('Auth Error:', error);
            setRecoveryStatus('error');
            alert(error.message || 'Failed to authorize with Google Drive.');
            setRecoveryLoading(false);
        }
    };

    const fetchBackupAndRecover = async (retryCount = 0) => {
        try {
            // 1. List files in appDataFolder
            const token = (window as any).gapi.client.getToken();
            const response = await fetch(
                'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&pageSize=10&fields=files(id, name, createdTime)',
                {
                    headers: {
                        'Authorization': `Bearer ${token?.access_token}`,
                    },
                }
            );

            if (response.status === 401 && retryCount === 0) {
                console.warn('Unauthorized (401) during file listing. Relogin and retrying...');
                (window as any).gapi.client.setToken(null);
                await handleRecovery();
                return;
            }

            if (!response.ok) throw new Error('Failed to list files');
            const data = await response.json();

            if (!data.files || data.files.length === 0) {
                throw new Error('No recovery backups found in your Google Drive.');
            }

            // 2. Get the latest file
            const latestFile = data.files.sort((a: any, b: any) =>
                new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
            )[0];

            // 3. Download file content
            const contentResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files/${latestFile.id}?alt=media`,
                {
                    headers: {
                        'Authorization': `Bearer ${(window as any).gapi.client.getToken().access_token}`,
                    },
                }
            );

            if (contentResponse.status === 401 && retryCount === 0) {
                console.warn('Unauthorized (401) during file download. Relogin and retrying...');
                (window as any).gapi.client.setToken(null);
                await handleRecovery();
                return;
            }

            if (!contentResponse.ok) throw new Error('Failed to download backup content');
            const backupData = await contentResponse.json();

            if (!backupData.share) {
                throw new Error('Invalid backup format: recovery share not found.');
            }

            // 4. Recover wallet
            const result = await recoverWallet(backupData.share); // result is { address, smartAccount }

            setRecoveryStatus('success');
            // Slight delay to show success state
            setTimeout(() => {
                onLoginSuccess(result.address);
            }, 1000);

        } catch (error: any) {
            console.error('Recovery Error:', error);
            setRecoveryStatus('error');
            alert(error.message || 'Failed to recover from Google Drive.');
        } finally {
            setRecoveryLoading(false);
        }
    };

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
                    onClick={passkeySignup}
                    disabled={loading || loginLoading || recoveryLoading}
                >
                    {loading ? 'CONNECTING...' : 'SIGNUP WITH PASSKEY'}
                </button>

                <button
                    className="btn-outline"
                    onClick={handlePasskeyLogin}
                    disabled={loading || loginLoading || recoveryLoading}
                >
                    {loginLoading ? 'AUTHENTICATING...' : 'LOGIN WITH PASSKEY'}
                </button>

                <div style={{ marginTop: '16px', borderTop: '1px solid var(--glass-border)', paddingTop: '16px', width: '100%' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)', marginBottom: '12px' }}>
                        Lost your device? Recover your wallet using Google Drive backup.
                    </p>
                    <button
                        className="btn-outline"
                        onClick={handleRecovery}
                        disabled={loading || loginLoading || recoveryLoading}
                        style={{ width: '100%' }}
                    >
                        {recoveryLoading ? (
                            recoveryStatus === 'authorizing' ? 'AUTHORIZING...' :
                                recoveryStatus === 'fetching' ? 'RECOVERING...' : 'LOADING...'
                        ) : 'RECOVER FROM GOOGLE DRIVE'}
                    </button>
                </div>
            </div>
        </div>
    );
}
