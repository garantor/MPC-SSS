export enum ChainType {
    EVM = 'EVM',
    SOLANA = 'SOLANA'
}

export interface ChainConfig {
    id: string;
    name: string;
    type: ChainType;
    rpcUrl: string;
    currency: string;
    explorerUrl: string;
}

export const CHAINS: Record<string, ChainConfig> = {
    SEPOLIA: {
        id: 'sepolia',
        name: 'Sepolia (EVM)',
        type: ChainType.EVM,
        rpcUrl: 'https://rpc.ankr.com/eth_sepolia', // Or use existing client
        currency: 'ETH',
        explorerUrl: 'https://sepolia.etherscan.io'
    },
    SOLANA_DEVNET: {
        id: 'solana-devnet',
        name: 'Solana Devnet',
        type: ChainType.SOLANA,
        rpcUrl: 'https://api.devnet.solana.com',
        currency: 'SOL',
        explorerUrl: 'https://explorer.solana.com/?cluster=devnet'
    }
};

export const DEFAULT_CHAIN = CHAINS.SEPOLIA;
