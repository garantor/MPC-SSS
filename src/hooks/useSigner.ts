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
import { Keypair } from "@solana/web3.js";
import { derivePath } from "ed25519-hd-key";
import { Mnemonic } from "ethers";
import * as StellarSdk from 'stellar-sdk';
import { Wallet } from 'xrpl';

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

    async function deriveAccounts(mnemonic: string) {
        // EVM
        const { getClient } = useEvmClient();
        const owner = mnemonicToAccount(mnemonic, {
            accountIndex: 0,
        });

        const smartAccount = await toMetaMaskSmartAccount({
            client: await getClient(),
            implementation: Implementation.Hybrid,
            deployParams: [owner.address, [], [], []],
            deploySalt: "0x",
            signer: { account: owner },
        });

        // SOLANA
        const seedHex = Mnemonic.fromPhrase(mnemonic).computeSeed();
        const seedNoPrefix = seedHex.startsWith('0x') ? seedHex.slice(2) : seedHex;
        const { key } = derivePath("m/44'/501'/0'/0'", seedNoPrefix);
        const solanaKeypair = Keypair.fromSeed(key);

        // STELLAR
        // derivePath returns a Buffer/Uint8Array. Stellar allows creating keypair from raw seed.
        // Stellar BIP44 is m/44'/148'/0'
        const stellarResult = derivePath("m/44'/148'/0'", seedNoPrefix);
        const stellarKeypair = StellarSdk.Keypair.fromRawEd25519Seed(stellarResult.key);

        // XRP
        const xrpWallet = Wallet.fromMnemonic(mnemonic);

        return {
            evm: {
                address: smartAccount.address,
                smartAccount
            },
            solana: {
                address: solanaKeypair.publicKey.toBase58(),
                keypair: solanaKeypair
            },
            stellar: {
                address: stellarKeypair.publicKey(),
                keypair: stellarKeypair
            },
            xrp: {
                address: xrpWallet.address,
                wallet: xrpWallet
            }
        };
    }

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

        const accounts = await deriveAccounts(userMnemonic);

        console.log("Derived Accounts:", accounts);

        localStorage.setItem('webAuthnCredentialId', credential.id);

        // only return the share that needs to be encrypted with passkey, 
        // other shares are stored already
        return { credential, shareToEncrypt: bytesToHex(shares[2]), smartAccount: accounts.evm.smartAccount, address: accounts.evm.address, accounts };
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
                userVerification: 'required',
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

        const accounts = await deriveAccounts(recoveredMnemonic);

        return { address: accounts.evm.address, smartAccount: accounts.evm.smartAccount, accounts };
    }

    async function recoverWallet(cloudShareHex: string) {
        console.log("Recovering wallet with cloud share...");
        const backendShareHex = localStorage.getItem('backendShare');
        if (!backendShareHex) {
            throw new Error("Backend share not found");
        }

        // 1. Reconstruct Mnemonic
        const mnemonicBytes = await combine([
            hexToBytes(cloudShareHex as `0x${string}`),
            hexToBytes(backendShareHex as `0x${string}`),
        ]);

        const recoveredMnemonic = bytesToString(mnemonicBytes);
        console.log("Recovered Mnemonic from Cloud and Backend Shares:", recoveredMnemonic);

        // 2. Key Rotation: Generate NEW shares from the same mnemonic
        // This ensures that the old shares are invalidated (logically) and we start fresh with a new Passkey
        const bufferMnemonic = stringToBytes(recoveredMnemonic);
        const newShares = await split(bufferMnemonic, 3, 2);
        console.log("Generated New Shares for Recovery (Rotation)");

        // 3. Create NEW WebAuthn Credential
        // We need to re-register the passkey for this device since we are in recovery mode
        const credential: any = await window.navigator.credentials.create({
            publicKey: {
                challenge: crypto.getRandomValues(new Uint8Array(32)),
                rp: {
                    name: "MPC Demo App",
                    id: window.location.hostname,
                },
                user: {
                    id: crypto.getRandomValues(new Uint8Array(16)),
                    name: "recovered-user@mpc-demo.com",
                    displayName: "Recovered User"
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
        });

        console.log("New WebAuthn Credential Created during Recovery:", credential);
        localStorage.setItem('webAuthnCredentialId', credential.id);

        // 4. Store New Shares
        // Share 1: Backend Share - overwrite logic
        localStorage.setItem('backendShare', bytesToHex(newShares[0]));
        // Share 2: Cloud Share - overwrite local copy, UI will handle upload 
        localStorage.setItem('cloudShare', bytesToHex(newShares[1]));

        // Invalidate Cloud Backup Flag to force the user to upload the new cloud share
        localStorage.removeItem('isCloudBackedUp');
        localStorage.removeItem('passkeyEncryptedShare');

        // Share 3: To be encrypted with the new Passkey
        const shareToEncrypt = bytesToHex(newShares[2]);


        const accounts = await deriveAccounts(recoveredMnemonic);

        // Return shareToEncrypt so the UI can prompt for Encryption (Passkey Assertion)
        return { address: accounts.evm.address, smartAccount: accounts.evm.smartAccount, shareToEncrypt, accounts };
    }

    return {
        registerUser,
        encryptShareWithPasskey,
        retrieveLocalShare,
        retrievePasskeyShare,
        recoverWallet,
    };
}