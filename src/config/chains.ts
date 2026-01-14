export enum ChainType {
    EVM = 'EVM',
    SOLANA = 'SOLANA',
    STELLAR = 'STELLAR',
    XRP = 'XRP'
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
        rpcUrl: 'https://rpc.ankr.com/eth_sepolia',
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
    },
    STELLAR_TESTNET: {
        id: 'stellar-testnet',
        name: 'Stellar Testnet',
        type: ChainType.STELLAR,
        rpcUrl: 'https://horizon-testnet.stellar.org',
        currency: 'XLM',
        explorerUrl: 'https://stellar.expert/explorer/testnet'
    },
    XRP_TESTNET: {
        id: 'xrp-testnet',
        name: 'XRP Testnet',
        type: ChainType.XRP,
        rpcUrl: 'wss://s.altnet.rippletest.net:51233',
        currency: 'XRP',
        explorerUrl: 'https://testnet.xrpl.org'
    }
};

export const DEFAULT_CHAIN = CHAINS.SEPOLIA;
