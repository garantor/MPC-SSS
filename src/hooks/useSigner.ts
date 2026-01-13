// import { useClient } from "./useClient";


import {
    createWebAuthnCredential,

} from "viem/account-abstraction";

import { hexToBytes, stringToBytes, toHex } from "viem";
import { CredentialCreationFailedError } from "ox/WebAuthnP256";
import { createBundlerClient, type CreateWebAuthnCredentialReturnType } from 'viem/account-abstraction';
import { mnemonicToAccount, privateKeyToAccount, generateMnemonic, english } from 'viem/accounts';
import { Implementation, toMetaMaskSmartAccount } from '@metamask/smart-accounts-kit';
import { Address, PublicKey, AesGcm, Hex, WebAuthnP256 } from 'ox';
import { combine, split } from "shamir-secret-sharing";
import { bytesToHex, bytesToString } from "viem";
import { useEvmClient } from "./useClient";
import { encryptData, decryptData } from "../../encryptions";

const prfInput = new TextEncoder().encode(
    `wallet-device-share:v1:${window.location.hostname}`
);


export function useSigner() {
    //Steps to create signer:
    // 1. Generate Mnemonic
    // 2. Encode Mnemonic to Buffer
    // 3. Split Buffer into Shares
    // 4. Generate private key and account from Mnemonic
    // 5. store local and backend the shares securely
    // 6. use secure passkey share with webauthn
    function base64UrlToUint8Array(base64Url: string): Uint8Array {
        let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4 !== 0) {
            base64 += '=';
        }
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }
    async function registerUser() {

        const { getClient } = useEvmClient();


        const credential: any = await window.navigator.credentials.create(
            {
                publicKey: {
                    challenge: crypto.getRandomValues(new Uint8Array(32)),
                    rp: {
                        name: "MPC Demo App",
                        id: window.location.hostname,
                    },
                    user: {
                        id: crypto.getRandomValues(new Uint8Array(16)),
                        name: "user@example.com",
                        displayName: "User Example"
                    },
                    pubKeyCredParams: [
                        {
                            type: "public-key",
                            alg: -7 // ES256 algorithm
                        }
                    ],
                    authenticatorSelection: {
                        authenticatorAttachment: "platform",
                        userVerification: "required"
                    },
                    timeout: 60000,
                    attestation: "direct",
                    extensions: {
                        prf: {} as any,
                    }
                }
            }
        );

        console.log("WebAuthn Credential Created:", credential, credential.getClientExtensionResults().prf?.enabled);
        let prfKey = credential?.getClientExtensionResults().prf?.enabled;
        console.log("PRF Key from WebAuthn:", prfKey);
        if (!prfKey) {
            throw new Error("PRF output not available");
        }

        let userMnemonic = generateMnemonic(english, 128);
        let bufferType = stringToBytes(userMnemonic);
        console.log("Encoded Mnemonic to Buffer:", bufferType);

        let shares = await split(bufferType, 3, 2);


        console.log("Generated Shares:", shares);
        for (let i = 0; i < shares.length; i++) {
            console.log(`Share ${i + 1}:`, bytesToHex(shares[i]));
        }

        console.log('-------------------------------');
        //In production, theses share will both not exist on the server, below is the key destributions;
        // Share 1: Backend Share - stored securely on backend server (here simulated with localStorage)
        // Share 2: Cloud Share - stored securely on user's cloud infrastructure (here simulated with localStorage)
        // Share 3: Passkey Share - to be encrypted with passkey and stored (handled separately)
        localStorage.setItem('backendShare', bytesToHex(shares[0])); // these shares should be encrypted before storing in real application
        localStorage.setItem('cloudShare', bytesToHex(shares[1])); // these shares should be encrypted before storing in real application
        console.log('Shares stored locally and on backend (simulated with localStorage)');
        console.log('--------------------------------', bytesToHex(shares[2]));


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
        localStorage.setItem('webAuthnCredentialId', credential.id);

        // only return the share that needs to be encrypted with passkey, 
        // other shares are stored already
        return { credential, shareToEncrypt: bytesToHex(shares[2]), smartAccount };
    }

    async function encryptShareWithPasskey(shareHex: string) {
        console.log("Encrypting share with passkey via WebAuthn HEX:", shareHex);
        const storedCredentialId = localStorage.getItem('webAuthnCredentialId');
        if (!storedCredentialId) {
            throw new Error("WebAuthn credential ID not found");
        }

        let credential: any = await window.navigator.credentials.get({
            publicKey: {
                challenge: crypto.getRandomValues(new Uint8Array(32)),
                rpId: window.location.hostname,
                allowCredentials: [{
                    type: 'public-key',
                    id: base64UrlToUint8Array(storedCredentialId) as any,
                }],
                userVerification: 'required',
                extensions: {
                    prf: {
                        eval: { first: prfInput },
                    }
                }
            },
        });

        let prfKey = credential?.getClientExtensionResults().prf?.results?.first;
        if (!prfKey) {
            throw new Error("PRF output not available. Please ensure your authenticator (TouchID, FaceID, or security key) supports PRF.");
        }

        const prfKeyBytes = prfKey instanceof Uint8Array ? prfKey : new Uint8Array(prfKey as ArrayBuffer);


        let encryptedShare = await encryptData(
            shareHex,
            bytesToHex(prfKeyBytes)
        );

        console.log("Encrypted Share with PRF Key via WebAuthn:", encryptedShare);





        localStorage.setItem('passkeyEncryptedShare', JSON.stringify(encryptedShare));
        return shareHex as string; // not really needed
    }

    async function retrieveLocalShare() {
        // retrieve shares from local storage and backend
        let localShareHex = localStorage.getItem('cloudShare');

        if (!localShareHex) {
            throw new Error("Shares not found in storage");
        }


        // Use WebAuthn to get PRF key and decrypt user's share
        // Reconstruct mnemonic from shares


        return { localShareHex };
    }

    async function retrievePasskeyShare() {
        const storedCredentialId = localStorage.getItem('webAuthnCredentialId');
        if (!storedCredentialId) {
            throw new Error("WebAuthn credential ID not found");
        }

        let credential: any = await window.navigator.credentials.get({
            publicKey: {
                challenge: crypto.getRandomValues(new Uint8Array(32)),
                rpId: window.location.hostname,
                allowCredentials: [{
                    type: 'public-key',
                    id: base64UrlToUint8Array(storedCredentialId) as any,
                }],
                userVerification: 'preferred',
                extensions: {
                    prf: {
                        eval: { first: prfInput },
                    }
                }
            },
        });


        let prfKey = credential?.getClientExtensionResults().prf?.results?.first;
        console.log("Retrieved Credential via WebAuthn:", credential, prfKey);
        if (!prfKey) {
            throw new Error("PRF output not available");
        }


        const prfKeyBytes = prfKey instanceof Uint8Array ? prfKey : new Uint8Array(prfKey as ArrayBuffer);
        console.log("PRF Key Bytes from WebAuthn:", prfKeyBytes, 'string:', bytesToHex(prfKeyBytes));

        let encryptedShareStr = localStorage.getItem('passkeyEncryptedShare');
        if (!encryptedShareStr) {
            throw new Error("Passkey encrypted share not found");
        }

        let encryptedShare = JSON.parse(encryptedShareStr);

        console.log("Encrypted Share from Storage:", encryptedShare);
        console.log('--------------------------------');

        let decryptedShareHex = await decryptData(
            encryptedShare.ciphertext,
            encryptedShare.iv,
            encryptedShare.salt,
            bytesToHex(prfKeyBytes)
        ) as `0x${string}`;

        console.log("Decrypted User Share with PRF Key:", decryptedShareHex);
        let mnemonic = await combine([
            hexToBytes(localStorage.getItem('backendShare') as `0x${string}`),
            hexToBytes(decryptedShareHex),
        ]);
        const recoveredMnemonic = bytesToString(mnemonic);
        console.log("Reconstructed Mnemonic from Shares:", recoveredMnemonic);
        console.log('--------------------------------');

        const { getClient } = useEvmClient();
        const owner = mnemonicToAccount(recoveredMnemonic, {
            accountIndex: 0,
        });

        const smartAccount = await toMetaMaskSmartAccount({
            client: await getClient(),
            implementation: Implementation.Hybrid,
            deployParams: [owner.address, [], [], []],
            deploySalt: "0x",
            signer: { account: owner },
        });

        return { address: smartAccount.address, smartAccount };
    }

    async function recoverWallet(cloudShareHex: string) {
        console.log("Recovering wallet with cloud share...");
        const backendShareHex = localStorage.getItem('backendShare');
        if (!backendShareHex) {
            throw new Error("Backend share not found");
        }

        const mnemonicBytes = await combine([
            hexToBytes(cloudShareHex as `0x${string}`),
            hexToBytes(backendShareHex as `0x${string}`),
        ]);

        const recoveredMnemonic = bytesToString(mnemonicBytes);
        console.log("Recovered Mnemonic from Cloud and Backend Shares:", recoveredMnemonic);
        return recoveredMnemonic;
    }

    return {
        registerUser,
        encryptShareWithPasskey,
        retrieveLocalShare,
        retrievePasskeyShare,
        recoverWallet,
    };
}