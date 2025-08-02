import { Button } from '@chakra-ui/react';
import { FiInfo } from 'react-icons/fi';

export default function WalletDiagnostics() {
  const runDiagnostics = () => {
    console.log('=== Wallet Diagnostics ===');
    
    // Check for window.ethereum
    console.log('window.ethereum exists:', !!window.ethereum);
    
    if (window.ethereum) {
      console.log('ethereum object:', window.ethereum);
      console.log('isMetaMask:', window.ethereum.isMetaMask);
      console.log('selectedAddress:', window.ethereum.selectedAddress);
      console.log('chainId:', window.ethereum.chainId);
      console.log('networkVersion:', window.ethereum.networkVersion);
      
      // Check for providers array (multiple wallets)
      if (window.ethereum.providers) {
        console.log('Multiple providers found:', window.ethereum.providers.length);
        window.ethereum.providers.forEach((provider: any, index: number) => {
          console.log(`Provider ${index}:`, {
            isMetaMask: provider.isMetaMask,
            isCoinbaseWallet: provider.isCoinbaseWallet,
            isRabby: provider.isRabby,
            isBraveWallet: provider.isBraveWallet,
            _metamask: !!provider._metamask
          });
        });
      }
      
      // Try to access methods
      console.log('Available methods:');
      console.log('- request:', typeof window.ethereum.request);
      console.log('- send:', typeof window.ethereum.send);
      console.log('- sendAsync:', typeof window.ethereum.sendAsync);
      console.log('- enable:', typeof window.ethereum.enable);
      
      // Check for other wallet indicators
      console.log('\nOther wallet checks:');
      console.log('window.solana:', !!window.solana);
      console.log('window.ethereum.isCoinbaseWallet:', window.ethereum.isCoinbaseWallet);
      console.log('window.ethereum.isRabby:', window.ethereum.isRabby);
      console.log('window.ethereum.isBraveWallet:', window.ethereum.isBraveWallet);
      
      // Try a safe RPC call
      console.log('\nTrying eth_chainId...');
      window.ethereum.request({ method: 'eth_chainId' })
        .then((chainId: string) => console.log('Current chain ID:', chainId))
        .catch((error: any) => console.error('Error getting chain ID:', error));
    } else {
      console.log('No ethereum provider found!');
    }
    
    console.log('=== End Diagnostics ===');
  };

  return (
    <Button
      variant="outline"
      leftIcon={<FiInfo />}
      onClick={runDiagnostics}
    >
      Run Diagnostics
    </Button>
  );
}