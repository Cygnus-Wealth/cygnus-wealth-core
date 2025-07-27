import { formatUnits } from 'viem';

/**
 * Formats a balance amount from smallest unit (wei) to display unit (ETH)
 * @param amount - The amount in smallest unit as a string
 * @param decimals - The number of decimals for the token (default 18 for ETH)
 * @param displayDecimals - Number of decimal places to show (default 6)
 * @returns Formatted string with the balance in display units
 */
export function formatBalance(
  amount: string,
  decimals: number = 18,
  displayDecimals: number = 6
): string {
  try {
    const formatted = formatUnits(BigInt(amount), decimals);
    const num = parseFloat(formatted);
    
    // Handle very small amounts
    if (num > 0 && num < Math.pow(10, -displayDecimals)) {
      return `<${Math.pow(10, -displayDecimals)}`;
    }
    
    // Format with appropriate decimal places
    return num.toFixed(displayDecimals).replace(/\.?0+$/, '');
  } catch (error) {
    console.error('Error formatting balance:', error);
    return '0';
  }
}