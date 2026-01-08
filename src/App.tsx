import React from 'react';
import { split, combine } from 'shamir-secret-sharing';
import * as ETHERS from 'ethers';
import { useSigner } from './hooks/useSigner';

function HomeScreen() {
  const { getSigner } = useSigner();

  async function handleLogin() {
    console.log('Login Pressed');
    try {
      let signerResult = await getSigner();
      console.log("Signer all info:", signerResult);
      console.log('Smart Account:', signerResult.smartAccount);
      console.log('Owner Address:', signerResult.owner.toString());
    } catch (error) {
      console.error('Login Error:', error);
    }
  }

  return (
    <div className="card">
      <h1>Welcome</h1>
      <p>Please login or signup to continue</p>

      <div className="button-group">
        <button className="btn-primary" onClick={handleLogin}>
          LOGIN
        </button>

        <button className="btn-outline" onClick={() => console.log('Signup Pressed')}>
          SIGNUP
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <HomeScreen />
  );
}
