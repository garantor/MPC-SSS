import { Address } from "viem";
import { useEvmClient } from "./useClient";


export function useTransactions(userAddress: Address) {
    const { getClient } = useEvmClient();

    async function sendTransaction(to: string, value: bigint) {
        console.log(`Sending transaction from ${userAddress} to ${to} with value ${value} wei`);
        // Here you would integrate with your EVM client to send the transaction
        // For example:
        // const client = await getClient();
        // const txHash = await client.sendTransaction({
        //     from: userAdress,
        //     to,
        //     value,
        // });
        // return txHash;
        return "0xMockTransactionHash"; // Placeholder
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