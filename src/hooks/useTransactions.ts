import { Address, http } from "viem";
import { useEvmClient } from "./useClient";
import { createBundlerClient } from "viem/account-abstraction";
import { useSigner } from "./useSigner";



export function useTransactions(userAddress: Address) {
    const { getClient } = useEvmClient();
    const { retrieveLocalShare } = useSigner();

    async function transactionBundler() {
        // get local storage shares
        // get passkey share from webauthn
        const bundlerClient = createBundlerClient({
            client: await getClient(),
            transport: http("https://api.pimlico.io/v2/11155111/rpc?apikey=pim_Zm8u8qxoHti2thGpGKFCvi"),
        });


        return bundlerClient;
    }

    async function sendTransaction(to: string, value: bigint) {
        console.log(`Sending transaction from ${userAddress} to ${to} with value ${value} wei`);
        // we need to reconstruct the signer account here using the shares and webauthn

        let localShare = await retrieveLocalShare();


        let bundler = await transactionBundler();

        // let fees = bundler.estimateUserOperationGas({
        //     account,
        //     calls:[{ to, value } ],
        // })
        console.log("Bundler Client:", bundler);
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