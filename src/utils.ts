import { createPublicClient, http, type PublicClient } from "viem";
import { mainnet } from "viem/chains";


export async function getClientInternal(): Promise<PublicClient> {
    const transport = http();
    const publicClient = createPublicClient({
        transport,
        chain: mainnet,
    });
    return publicClient;
}