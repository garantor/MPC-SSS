import React, { useState, useEffect, useRef } from 'react';
import { GoogleIcon } from '../components/GoogleIcon';

interface CloudBackupScreenProps {
    onBackupComplete: () => void;
}

export function CloudBackupScreen({ onBackupComplete }: CloudBackupScreenProps) {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'authorizing' | 'uploading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const tokenClientRef = useRef<any>(null);
    const gapiInitedRef = useRef(false);
    const gisInitedRef = useRef(false);

    const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
    const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

    // Initialize Google APIs on component mount
    useEffect(() => {
        const gapiLoaded = () => {
            (window as any).gapi.load('client', initializeGapiClient);
        };

        const initializeGapiClient = async () => {
            await (window as any).gapi.client.init({
                discoveryDocs: [DISCOVERY_DOC],
            });
            gapiInitedRef.current = true;
            maybeEnableButtons();
        };

        const gisLoaded = () => {
            tokenClientRef.current = (window as any).google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: '', // Defined later
            });
            gisInitedRef.current = true;
            maybeEnableButtons();
        };

        const maybeEnableButtons = () => {
            // Buttons are managed by React state, not DOM
        };

        // Check if libraries are already loaded
        if ((window as any).gapi) {
            gapiLoaded();
        }
        if ((window as any).google) {
            gisLoaded();
        }
    }, []);

    const handleBackup = async () => {
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

                setStatus('uploading');
                await uploadFile();
            };

            const token = (window as any).gapi.client.getToken();
            if (token === null) {
                tokenClientRef.current.requestAccessToken({ prompt: 'consent' });
            } else {
                tokenClientRef.current.requestAccessToken({ prompt: '' });
            }

        } catch (error: any) {
            console.error('Cloud Backup Error:', error);
            setStatus('error');
            setErrorMessage(error.message || 'Failed to authorize with Google Drive.');
            setLoading(false);
        }
    };

    const uploadFile = async () => {
        try {
            const cloudShareHex = localStorage.getItem('cloudShare');
            if (!cloudShareHex) {
                throw new Error("Recovery share not found in local storage.");
            }

            const fileContent = JSON.stringify({
                share: cloudShareHex,
                timestamp: new Date().toISOString(),
                app: "MPC-Prive Recovery"
            });

            const file = new Blob([fileContent], { type: 'application/json' });
            const metadata = {
                name: `mpc-prive-recovery-${Date.now()}.json`,
                mimeType: 'application/json',
                parents: ["appDataFolder"]
            };

            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', file);

            const response = await fetch(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${(window as any).gapi.client.getToken().access_token}`,
                    },
                    body: form,
                }
            );

            if (!response.ok) {
                throw new Error('Failed to upload file to Google Drive');
            }

            localStorage.setItem('isCloudBackedUp', 'true');
            setStatus('success');

            setTimeout(() => {
                onBackupComplete();
            }, 1500);

        } catch (error: any) {
            console.error('Upload Error:', error);
            setStatus('error');
            setErrorMessage(error.message || 'Failed to upload file.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignout = () => {
        const token = (window as any).gapi.client.getToken();
        if (token !== null) {
            (window as any).google.accounts.oauth2.revoke(token.access_token);
            (window as any).gapi.client.setToken('');
            setStatus('idle');
        }
    };

    return (
        <div className="card">
            <div className="security-icon">☁️</div>
            <h1>Cloud Recovery</h1>
            <p>
                To ensure you never lose access to your wallet, we'll store a recovery share in your personal Google Drive.
            </p>

            <div className="security-tip">
                <strong>🛡️ Privacy First:</strong> We only request access to files created by this app. We cannot see your other Google Drive files.
            </div>

            <div className="step-indicator">
                <div className="step active"></div>
                <div className="step active"></div>
                <div className="step active"></div>
            </div>

            <div className="button-group">
                <button
                    className={`btn-primary ${status === 'success' ? 'btn-success' : ''}`}
                    onClick={handleBackup}
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
                            STORE IN GOOGLE DRIVE
                        </>
                    )}
                    {status === 'authorizing' && 'AUTHORIZING...'}
                    {status === 'uploading' && 'UPLOADING TO DRIVE...'}
                    {status === 'success' && '✅ BACKUP SECURED!'}
                    {status === 'error' && 'RETRY BACKUP'}
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