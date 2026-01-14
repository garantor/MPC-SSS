import { Address, http } from "viem";
import { useEvmClient } from "./useClient";
import { createBundlerClient } from "viem/account-abstraction";
import { useSigner } from "./useSigner";



export function useTransactions(userAddress: Address) {
    const { getClient } = useEvmClient();
    const { retrievePasskeyShare } = useSigner();

    async function sendTransaction(to: string, value: bigint) {
        console.log(`Sending transaction from ${userAddress} to ${to} with value ${value} wei`);

        // 1. Reconstruct the signer account using shares and webauthn
        console.log("Requesting Passkey Authorization for Transaction...");
        const { smartAccount } = await retrievePasskeyShare();

        // 2. Create Bundler Client
        // Note: In a real app, API keys should be in environment variables
        const bundlerClient = createBundlerClient({
            client: await getClient(),
            transport: http("https://api.pimlico.io/v2/11155111/rpc?apikey=pim_Zm8u8qxoHti2thGpGKFCvi"),
        });

        console.log("Sending UserOperation...");

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
    }


    async function getBalance() {
        let client = await getClient();
        let balance = await client.getBalance({ address: userAddress });
        return balance;

    }

    return {
        sendTransaction,
        getBalance,
    };
}