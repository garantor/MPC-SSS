import { http, createPublicClient } from "viem";
import { sepolia  } from "viem/chains";

export function useEvmClient() {

    async function getClient() {
        const transport = http();
        const publicClient = createPublicClient({
            transport,
            chain:sepolia,
        });
        return publicClient;
    }

    return {
        getClient,
    };
}