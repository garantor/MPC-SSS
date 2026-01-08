// import { useClient } from "./useClient";


import {
    createWebAuthnCredential,
    toWebAuthnAccount,
} from "viem/account-abstraction";

import { stringToBytes, toHex } from "viem";
import { CredentialCreationFailedError } from "ox/WebAuthnP256";
import { createBundlerClient, type CreateWebAuthnCredentialReturnType } from 'viem/account-abstraction';
import { mnemonicToAccount, privateKeyToAccount, generateMnemonic, english } from 'viem/accounts';
import { Implementation, toMetaMaskSmartAccount } from '@metamask/smart-accounts-kit';
import { Address, PublicKey, AesGcm, Hex, WebAuthnP256 } from 'ox';
import { combine, split } from "shamir-secret-sharing";
import { bytesToHex, bytesToString } from "viem";
import { useEvmClient } from "./useClient";




export function useSigner() {
    //Steps to create signer:
    // 1. Generate Mnemonic
    // 2. Encode Mnemonic to Buffer
    // 3. Split Buffer into Shares
    // 4. Generate private key and account from Mnemonic
    // 5. store local and backend the shares securely
    // 6. use secure passkey share with webauthn


    async function getSigner() {

        let userMnemonic = generateMnemonic(english, 128);
        const { getClient } = useEvmClient();
        console.log("Generated Mnemonic:", userMnemonic);
        let bufferType = stringToBytes(userMnemonic);
        console.log("Encoded Mnemonic to Buffer:", bufferType);
        let shares = await split(bufferType,  3, 2 );
        console.log("Generated Shares:", shares);
        for (let i = 0; i < shares.length; i++) {
            console.log(`Share ${i + 1}:`, bytesToHex(shares[i]));
        }

        console.log('-------------------------------');
        localStorage.setItem('backendShare', bytesToHex(shares[0]));
        localStorage.setItem('LocalShare', bytesToHex(shares[1]));
        console.log('Shares stored locally and on backend (simulated with localStorage)');
        console.log('--------------------------------', bytesToHex(shares[2]));
        // let recoveredBuffer = await combine([shares[0], shares[1]]);
        // console.log("Recovered Buffer from Shares:", recoveredBuffer);
        // let recoveredMnemonic = bytesToString(recoveredBuffer);
        // console.log("Decoded Recovered Mnemonic:", recoveredMnemonic);

        const credential = await createWebAuthnCredential({
            name: "Schmir-secret-sharing-Demo",
            extensions:{
                prf: {
                    eval:{ first: new TextEncoder().encode("webauthn-credential-id")},
                }
            }
        });

        console.log("WebAuthn Credential Created:", credential, credential.raw.getClientExtensionResults().prf?.enabled);
        let prfKey = credential.raw.getClientExtensionResults().prf?.results?.first;
        if (!prfKey) {
            throw new Error("PRF output not available");
        }

        let keyBuffer: ArrayBuffer;

        if (prfKey instanceof ArrayBuffer) {
            keyBuffer = prfKey;
        } else if (ArrayBuffer.isView(prfKey)) { // covers Uint8Array, Int32Array, etc.
            keyBuffer = prfKey.buffer;
        } else {
            throw new Error("Unexpected PRF output type");
        }


        // Convert to Uint8Array safely
        const prfKeyBytes = prfKey instanceof Uint8Array ? prfKey : new Uint8Array(keyBuffer);
        console.log("PRF Key Bytes:", prfKeyBytes, 'string:', bytesToHex(prfKeyBytes));

        // Encrypt the user's share with the PRF key

        let passkeyPRFEncrypted =await  AesGcm.getKey({ 'password': bytesToHex(prfKeyBytes) })
        console.log("Derived AES-GCM Key from PRF Key", passkeyPRFEncrypted);

        let encryptedShare = await AesGcm.encrypt(bytesToHex(shares[2]), passkeyPRFEncrypted);
        console.log("Encrypted User Share with PRF Key:", encryptedShare);

        // Decrypt the user's share with the PRF key (for demonstration)
        let decryptedShareHex = await AesGcm.decrypt(encryptedShare, passkeyPRFEncrypted);
        console.log("Decrypted User Share with PRF Key:", decryptedShareHex);
        const webAuthnAccount = toWebAuthnAccount({ credential })

        // Derive owner account from mnemonic
        // no user mnemonic stored anywhere except the shares

        const owner = mnemonicToAccount(userMnemonic, {
            accountIndex: 0,
        }) 
        // by default this will generate an evm account
        //same mnemonic can be used to generate other types of accounts as well

        console.log("Derived Owner Account from Mnemonic:", owner);

        const smartAccount = await toMetaMaskSmartAccount({
            client: await getClient(),
            implementation: Implementation.Hybrid,
            deployParams: [owner.address, [], [], []],
            deploySalt: "0x",
            signer: { account: owner },
        });
        // the address retunred from smart account is the smart contract account address, we should be using for transactions not the owner address
        return { smartAccount, webAuthnAccount, credential, owner };
    }

    return {
        getSigner,
    };
}