import React, { useState, useEffect } from 'react';
import { formatEther } from 'viem';
import { QRCodeSVG } from 'qrcode.react';
import { useTransactions } from '../hooks/useTransactions';
import { useSigner } from '../hooks/useSigner';
import { TransactionModal } from '../components/TransactionModal';

interface DashboardProps {
    address: string;
    onDisconnect: () => void;
}

export function DashboardScreen({ address, onDisconnect }: DashboardProps) {
    const [copied, setCopied] = useState(false);
    const [balance, setBalance] = useState<string>('0.00');
    const [isLoadingBalance, setIsLoadingBalance] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { retrievePasskeyShare } = useSigner();

    const { getBalance } = useTransactions(address as `0x${string}`);

    const fetchBalance = async () => {
        setIsLoadingBalance(true);
        try {
            const balanceWei = await getBalance();
            setBalance(formatEther(balanceWei));
        } catch (error) {
            console.error('Error fetching balance:', error);
        } finally {
            setIsLoadingBalance(false);
        }
    };

    useEffect(() => {
        fetchBalance();
    }, [address]);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="card">
            <div className="success-icon">✓</div>
            <div className="badge">VERIFIED ACCOUNT</div>

            <div className="balance-section">
                <span className="label">Available Balance</span>
                {isLoadingBalance ? (
                    <div className="loading-skeleton"></div>
                ) : (
                    <div className="balance-amount">
                        {parseFloat(balance).toFixed(4)} <span className="balance-unit">ETH</span>
                        <span className="refresh-icon" onClick={fetchBalance} title="Refresh Balance">🔄</span>
                    </div>
                )}
            </div>

            <div className="qr-container">
                <QRCodeSVG
                    value={address}
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

            <span className="label">Your EVM Blockchain Address</span>
            <div className="address-box" onClick={copyToClipboard} title="Click to copy">
                {address}
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
                <button className="btn-primary" onClick={async () => await retrievePasskeyShare()}>
                    {/* <button className="btn-primary" onClick={() => setIsModalOpen(true)}> */}
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
                address={address}
            />
        </div>
    );
}
