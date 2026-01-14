import React, { useState } from 'react';
import { parseEther, isAddress } from 'viem';
import { useTransactions } from '../hooks/useTransactions';

import { ChainConfig, ChainType } from '../config/chains';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    address: string;
    chain?: ChainConfig;
}

export function TransactionModal({ isOpen, onClose, onSuccess, address, chain }: TransactionModalProps) {
    const [toAddress, setToAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'pending'; message: string; hash?: string } | null>(null);
    const { sendTransaction } = useTransactions(address, chain?.type);

    if (!isOpen) return null;

    const handleSend = async () => {
        // Validation logic needs to be chain aware or loose
        if (!toAddress) { // Simplified validation
            setStatus({ type: 'error', message: 'Invalid recipient address.' });
            return;
        }
        if (!amount || parseFloat(amount) <= 0) {
            setStatus({ type: 'error', message: 'Please enter a valid amount.' });
            return;
        }

        setStatus({ type: 'pending', message: 'Initiating transaction...' });
        try {
            const txHash = await sendTransaction(toAddress, amount); // Pass string amount
            setStatus({ type: 'success', message: 'Transaction sent successfully!', hash: txHash });
            setTimeout(() => {
                onSuccess();
                onClose();
                setStatus(null);
                setToAddress('');
                setAmount('');
            }, 3000);
        } catch (error) {
            console.error('Transaction Error:', error);
            setStatus({ type: 'error', message: 'Failed to send transaction. Please try again.' });
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Send Assets</h2>
                    <p style={{ marginBottom: 0 }}>Transfer ETH to any address</p>
                </div>

                <div className="input-group">
                    <label className="input-label">Recipient Address</label>
                    <input
                        className="input-field"
                        placeholder="0x..."
                        value={toAddress}
                        onChange={(e) => setToAddress(e.target.value)}
                        disabled={status?.type === 'pending'}
                    />
                </div>

                <div className="input-group">
                    <label className="input-label">Amount (ETH)</label>
                    <input
                        className="input-field"
                        type="number"
                        placeholder="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={status?.type === 'pending'}
                    />
                </div>

                {status && (
                    <div className={`status-message status-${status.type}`}>
                        {status.message}
                        {status.hash && <span className="tx-hash">Hash: {status.hash}</span>}
                    </div>
                )}

                <div className="button-group" style={{ flexDirection: 'row' }}>
                    <button className="btn-outline" onClick={onClose} disabled={status?.type === 'pending'}>
                        CANCEL
                    </button>
                    <button className="btn-primary" onClick={handleSend} disabled={status?.type === 'pending'}>
                        {status?.type === 'pending' ? 'SENDING...' : 'CONFIRM SEND'}
                    </button>
                </div>
            </div>
        </div>
    );
}
