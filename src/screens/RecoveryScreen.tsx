import React, { useState, useEffect, useRef } from 'react';
import { GoogleIcon } from '../components/GoogleIcon';
import { useSigner } from '../hooks/useSigner';

interface RecoveryScreenProps {
    onRecoveryComplete: (mnemonic: string) => void;
    onCancel: () => void;
}

export function RecoveryScreen({ onRecoveryComplete, onCancel }: RecoveryScreenProps) {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'authorizing' | 'fetching' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const { recoverWallet } = useSigner();

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

    const handleRecovery = async () => {
        setLoading(true);
        setStatus('authorizing');

        try {
            if (!tokenClientRef.current) {
                throw new Error('Google Identity Services not initialized');
            }

            tokenClientRef.current.callback = async (resp: any) => {
                if (resp.error !== undefined) {
                    throw resp;
                }
                setStatus('fetching');
                // Pass a retryCount to prevent infinite loops
                await fetchBackupAndRecover(1);
            };

            const token = (window as any).gapi.client.getToken();
            if (token !== null && (window as any).google.accounts.oauth2.hasGrantedAllScopes(token, SCOPES)) {
                setStatus('fetching');
                await fetchBackupAndRecover();
            } else {
                tokenClientRef.current.requestAccessToken({ prompt: token ? '' : 'consent' });
            }

        } catch (error: any) {
            console.error('Auth Error:', error);
            setStatus('error');
            setErrorMessage(error.message || 'Failed to authorize with Google Drive.');
            setLoading(false);
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
                await handleRecovery(); // This will re-auth and call fetchBackupAndRecover(1) via callback
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
            const mnemonic = await recoverWallet(backupData.share);

            setStatus('success');
            setTimeout(() => {
                onRecoveryComplete(mnemonic);
            }, 1500);

        } catch (error: any) {
            console.error('Recovery Error:', error);
            setStatus('error');
            setErrorMessage(error.message || 'Failed to recover from Google Drive.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <div className="security-icon">🔄</div>
            <h1>Wallet Recovery</h1>
            <p>
                We'll retrieve your recovery share from Google Drive and combine it with your local data to restore your wallet.
            </p>

            <div className="status-message status-success" style={{ textAlign: 'left', marginBottom: '24px' }}>
                <strong>Step 1:</strong> Authenticate with Google<br />
                <strong>Step 2:</strong> Download recovery data<br />
                <strong>Step 3:</strong> Restore your wallet
            </div>

            <div className="button-group">
                <button
                    className="btn-primary"
                    onClick={handleRecovery}
                    disabled={loading || status === 'success'}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px'
                    }}
                >
                    {status === 'idle' && (
                        <>
                            <GoogleIcon />
                            RECOVER FROM GOOGLE DRIVE
                        </>
                    )}
                    {status === 'authorizing' && 'AUTHORIZING...'}
                    {status === 'fetching' && 'FETCHING DATA...'}
                    {status === 'success' && '✅ WALLET RECOVERED!'}
                    {status === 'error' && 'RETRY RECOVERY'}
                </button>

                <button
                    className="btn-outline"
                    onClick={onCancel}
                    disabled={loading}
                >
                    CANCEL
                </button>
            </div>

            {status === 'error' && (
                <div className="status-message status-error" style={{ marginTop: '16px' }}>
                    {errorMessage}
                </div>
            )}
        </div>
    );
}
