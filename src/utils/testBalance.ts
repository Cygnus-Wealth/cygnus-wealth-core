import { createPublicClient, http, formatEther } from 'viem';
import { mainnet } from 'viem/chains';

async function checkBalance() {
  const address = '0x08ff8b099DcC50e212c998731b34a548826E1969';
  
  // Check with multiple RPC endpoints
  const endpoints = [
    { name: 'Default Viem', url: undefined },
    { name: 'Cloudflare', url: 'https://cloudflare-eth.com' },
    { name: 'Ankr', url: 'https://rpc.ankr.com/eth' }
  ];

  for (const endpoint of endpoints) {
    console.log(`\n--- Checking with ${endpoint.name} ---`);
    
    const client = createPublicClient({
      chain: mainnet,
      transport: http(endpoint.url)
    });

    try {
      const balance = await client.getBalance({ 
        address: address as `0x${string}` 
      });

      console.log('Balance in wei:', balance.toString());
      console.log('Balance in ETH:', formatEther(balance));
    } catch (error) {
      console.error(`Error with ${endpoint.name}:`, error);
    }
  }
  
  console.log('\nMetaMask shows: 0.02401 ETH');
  console.log('Expected wei:', '24010000000000000');
}

checkBalance().catch(console.error);