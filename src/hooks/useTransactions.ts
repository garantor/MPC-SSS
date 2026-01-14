import { Address, http, parseEther } from "viem";
import { useEvmClient } from "./useClient";
import { createBundlerClient } from "viem/account-abstraction";
import { useSigner } from "./useSigner";
import { ChainType, CHAINS } from "../config/chains";
import { Connection, Transaction, SystemProgram, PublicKey, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as StellarSdk from 'stellar-sdk';
import { Client } from 'xrpl';

const API_KEY = import.meta.env.VITE_PIMLICO_API_KEY;

export function useTransactions(userAddress: string, chainType: ChainType = ChainType.EVM) {
    const { getClient } = useEvmClient();
    const { retrievePasskeyShare } = useSigner();

    async function sendTransaction(to: string, amount: string) {
        console.log(`Sending transaction from ${userAddress} to ${to} with amount ${amount}`);

        // 1. Reconstruct the signer account using shares and webauthn
        console.log("Requesting Passkey Authorization for Transaction...");
        const { accounts } = await retrievePasskeyShare();

        if (chainType === ChainType.EVM) {
            const value = parseEther(amount);
            const smartAccount = accounts.evm.smartAccount;

            // 2. Create Bundler Client
            const bundlerClient = createBundlerClient({
                client: await getClient(),
                transport: http("https://api.pimlico.io/v2/11155111/rpc?apikey=" + API_KEY),
            });

            console.log("Sending UserOperation (EVM)...");

            // 3. Send User Operation
            const userOpHash = await bundlerClient.sendUserOperation({
                account: smartAccount,
                calls: [{
                    to: to as Address,
                    value: value,
                    data: '0x'
                }]
            });

            console.log("UserOp Hash:", userOpHash);

            // 4. Wait for receipt to get actual Tx Hash
            const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: userOpHash });

            console.log("Transaction Receipt:", receipt);
            return receipt.receipt.transactionHash;

        } else if (chainType === ChainType.SOLANA) {
            // SOLANA
            console.log("Sending Transaction (Solana)...");
            const connection = new Connection(CHAINS.SOLANA_DEVNET.rpcUrl, 'confirmed');
            const fromKeypair = accounts.solana.keypair;

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: fromKeypair.publicKey,
                    toPubkey: new PublicKey(to),
                    lamports: Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL),
                })
            );

            // Fetch blockhash
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = fromKeypair.publicKey;

            const signature = await sendAndConfirmTransaction(
                connection,
                transaction,
                [fromKeypair]
            );
            console.log("Solana Signature:", signature);
            return signature;

        } else if (chainType === ChainType.STELLAR) {
            // STELLAR
            console.log("Sending Transaction (Stellar)...");
            const server = new StellarSdk.Horizon.Server(CHAINS.STELLAR_TESTNET.rpcUrl);
            const sourceKeypair = accounts.stellar.keypair;
            const sourcePublicKey = sourceKeypair.publicKey();

            const account = await server.loadAccount(sourcePublicKey);
            const transaction = new StellarSdk.TransactionBuilder(account, { fee: StellarSdk.BASE_FEE })
                .addOperation(StellarSdk.Operation.payment({
                    destination: to,
                    asset: StellarSdk.Asset.native(),
                    amount: amount,
                }))
                .setTimeout(30)
                .setNetworkPassphrase(StellarSdk.Networks.TESTNET)
                .build();

            transaction.sign(sourceKeypair);
            const result = await server.submitTransaction(transaction);
            console.log("Stellar Result:", result);
            return result.hash;

        } else if (chainType === ChainType.XRP) {
            // XRP
            console.log("Sending Transaction (XRP)...");
            const client = new Client(CHAINS.XRP_TESTNET.rpcUrl);
            await client.connect();
            const wallet = accounts.xrp.wallet;

            const prepared = await client.autofill({
                "TransactionType": "Payment",
                "Account": wallet.address,
                "Amount": (parseFloat(amount) * 1000000).toString(), // Drops
                "Destination": to
            });

            const signed = wallet.sign(prepared);
            const result = await client.submitAndWait(signed.tx_blob);
            await client.disconnect();

            if (typeof result.result.meta === 'object' && result.result.meta.TransactionResult === "tesSUCCESS") {
                return result.result.hash;
            } else {
                throw new Error(`XRP Transaction failed: ${JSON.stringify(result.result.meta)}`);
            }
        }
        return "";
    }


    async function getBalance() {
        let client = await getClient();
        let balance = await client.getBalance({ address: userAddress as Address });
        return balance;

    }

    return {
        sendTransaction,
        getBalance,
    };
}