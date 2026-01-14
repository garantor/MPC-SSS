import React, { useState, useEffect } from 'react';
import { formatEther } from 'viem';
import { QRCodeSVG } from 'qrcode.react';
import { useTransactions } from '../hooks/useTransactions';
import { useSigner } from '../hooks/useSigner';
import { TransactionModal } from '../components/TransactionModal';
import { CHAINS, DEFAULT_CHAIN, ChainType, ChainConfig } from '../config/chains';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

interface DashboardProps {
    evmAddress: string;
    solanaAddress: string;
    onDisconnect: () => void;
}

export function DashboardScreen({ evmAddress, solanaAddress, onDisconnect }: DashboardProps) {
    const [selectedChain, setSelectedChain] = useState<ChainConfig>(DEFAULT_CHAIN);
    const [copied, setCopied] = useState(false);
    const [balance, setBalance] = useState<string>('0.00');
    const [isLoadingBalance, setIsLoadingBalance] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isRecovering, setIsRecovering] = useState(false);
    const [recoveredMnemonic, setRecoveredMnemonic] = useState<string | null>(null);
    const { retrievePasskeyShare } = useSigner();

    const currentAddress = selectedChain.type === ChainType.EVM ? evmAddress : solanaAddress;

    // EVM Hooks
    const { getBalance: getEvmBalance } = useTransactions(evmAddress as `0x${string}`);

    const handleRecoverySuccess = (mnemonic: string) => {
        setRecoveredMnemonic(mnemonic);
        setIsRecovering(false);
    };

    const fetchBalance = async () => {
        setIsLoadingBalance(true);
        try {
            if (selectedChain.type === ChainType.EVM) {
                const balanceWei = await getEvmBalance();
                setBalance(formatEther(balanceWei));
            } else {
                // SOLANA
                const connection = new Connection(selectedChain.rpcUrl, 'confirmed');
                const publicKey = new PublicKey(solanaAddress);
                const balanceLamports = await connection.getBalance(publicKey);
                setBalance((balanceLamports / LAMPORTS_PER_SOL).toFixed(4));
            }
        } catch (error) {
            console.error('Error fetching balance:', error);
            setBalance('0.00');
        } finally {
            setIsLoadingBalance(false);
        }
    };

    useEffect(() => {
        fetchBalance();
    }, [selectedChain, evmAddress, solanaAddress]);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(currentAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const toggleTheme = (e: React.MouseEvent) => {
        // ... handled in App.tsx
    };

    if (isRecovering) {
        // App.tsx handles the overlay or screen swap, but we can also do it here if passed as prop
        // However, user said "dashboard should contain the button to trigger recovery"
        // Let's assume we show the RecoveryScreen within the Dashboard or tell App to show it.
    }

    return (
        <div className="card">
            <div className="success-icon">✓</div>
            <div className="badge">VERIFIED ACCOUNT</div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', width: '100%', justifyContent: 'center' }}>
                {Object.values(CHAINS).map(chain => (
                    <button
                        key={chain.id}
                        className="btn-outline"
                        onClick={() => setSelectedChain(chain)}
                        style={{
                            flex: 1,
                            borderColor: selectedChain.id === chain.id ? 'var(--primary)' : 'var(--glass-border)',
                            background: selectedChain.id === chain.id ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                            color: selectedChain.id === chain.id ? 'var(--primary)' : 'var(--text-dim)',
                            fontSize: '0.8rem',
                            padding: '8px'
                        }}
                    >
                        {chain.name}
                    </button>
                ))}
            </div>

            <div className="balance-section">
                <span className="label">{selectedChain.name} Balance</span>
                {isLoadingBalance ? (
                    <div className="loading-skeleton"></div>
                ) : (
                    <div className="balance-amount">
                        {parseFloat(balance).toFixed(4)} <span className="balance-unit">{selectedChain.currency}</span>
                        <span className="refresh-icon" onClick={fetchBalance} title="Refresh Balance">🔄</span>
                    </div>
                )}
            </div>

            <div className="qr-container">
                <QRCodeSVG
                    value={currentAddress}
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

            <span className="label">Your {selectedChain.name} Address</span>
            <div className="address-box" onClick={copyToClipboard} title="Click to copy">
                {currentAddress}
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
                <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
                    SEND ASSETS
                </button>
                <button className="btn-outline btn-disconnect" onClick={onDisconnect}>
                    DISCONNECT
                </button>
            </div>

            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchBalance}
                address={currentAddress}
                chain={selectedChain}
            />
        </div>
    );
}
