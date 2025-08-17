/**
 * AssetValue Value Object
 * 
 * Represents a cryptocurrency/token amount with proper precision handling.
 * Handles different decimal places across different assets and provides
 * safe arithmetic operations without floating-point precision issues.
 */

import { ValueObject } from '../shared/ValueObject';
import { ValidationError } from '../shared/DomainError';

export interface AssetValueData {
  amount: string; // String representation to avoid precision issues
  decimals: number; // Number of decimal places for this asset
  symbol: string; // Asset symbol (e.g., 'ETH', 'USDC', 'SOL')
  contractAddress?: string; // Contract address for tokens (optional for native assets)
}

export class AssetValue extends ValueObject<AssetValueData> {
  // Common decimal configurations for well-known assets
  private static readonly COMMON_DECIMALS: Record<string, number> = {
    'ETH': 18,
    'BTC': 8,
    'SOL': 9,
    'SUI': 9,
    'USDC': 6,
    'USDT': 6,
    'DAI': 18,
    'WETH': 18,
    'MATIC': 18,
    'BNB': 18,
    'AVAX': 18
  };

  private constructor(data: AssetValueData) {
    super(data);
    this.validate();
  }

  protected validate(): void {
    const { amount, decimals, symbol } = this._value;

    if (!symbol || symbol.trim().length === 0) {
      throw new ValidationError(
        'Asset symbol cannot be empty',
        'symbol',
        symbol
      );
    }

    if (decimals < 0 || !Number.isInteger(decimals)) {
      throw new ValidationError(
        'Decimals must be a non-negative integer',
        'decimals',
        decimals
      );
    }

    if (decimals > 30) {
      throw new ValidationError(
        'Decimals cannot exceed 30',
        'decimals',
        decimals
      );
    }

    if (!this.isValidAmountString(amount)) {
      throw new ValidationError(
        'Amount must be a valid numeric string',
        'amount',
        amount
      );
    }

    // Validate precision doesn't exceed decimals
    const decimalPrecision = this.getDecimalPrecision(amount);
    if (decimalPrecision > decimals) {
      throw new ValidationError(
        `Amount precision (${decimalPrecision}) exceeds asset decimals (${decimals})`,
        'amount',
        amount
      );
    }
  }

  /**
   * Check if a string represents a valid numeric amount
   */
  private isValidAmountString(amount: string): boolean {
    if (!amount || amount.trim().length === 0) return false;
    
    // Allow positive numbers only (including zero)
    const regex = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
    return regex.test(amount.trim()) && !isNaN(Number(amount));
  }

  /**
   * Get the number of decimal places in an amount string
   */
  private getDecimalPrecision(amount: string): number {
    const decimalIndex = amount.indexOf('.');
    return decimalIndex === -1 ? 0 : amount.length - decimalIndex - 1;
  }

  /**
   * Create AssetValue from string amount
   */
  public static fromString(
    amount: string, 
    symbol: string, 
    decimals?: number, 
    contractAddress?: string
  ): AssetValue {
    const resolvedDecimals = decimals ?? AssetValue.getDefaultDecimals(symbol);
    
    return new AssetValue({
      amount: amount.trim(),
      decimals: resolvedDecimals,
      symbol: symbol.toUpperCase(),
      contractAddress
    });
  }

  /**
   * Create AssetValue from number
   */
  public static fromNumber(
    amount: number, 
    symbol: string, 
    decimals?: number, 
    contractAddress?: string
  ): AssetValue {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new ValidationError(
        'Amount must be a finite non-negative number',
        'amount',
        amount
      );
    }

    const resolvedDecimals = decimals ?? AssetValue.getDefaultDecimals(symbol);
    
    // Convert to string with proper precision
    const amountString = amount.toFixed(resolvedDecimals).replace(/\.?0+$/, '');
    
    return new AssetValue({
      amount: amountString,
      decimals: resolvedDecimals,
      symbol: symbol.toUpperCase(),
      contractAddress
    });
  }

  /**
   * Create AssetValue from wei/smallest unit (for blockchain assets)
   */
  public static fromWei(
    weiAmount: string | number, 
    symbol: string, 
    decimals?: number, 
    contractAddress?: string
  ): AssetValue {
    const resolvedDecimals = decimals ?? AssetValue.getDefaultDecimals(symbol);
    const weiAmountBig = BigInt(weiAmount.toString());
    
    if (weiAmountBig < 0n) {
      throw new ValidationError(
        'Wei amount cannot be negative',
        'weiAmount',
        weiAmount
      );
    }

    // Convert wei to decimal amount
    const divisor = BigInt(10 ** resolvedDecimals);
    const wholePart = weiAmountBig / divisor;
    const fractionalPart = weiAmountBig % divisor;
    
    let amountString = wholePart.toString();
    
    if (fractionalPart > 0n) {
      const fractionalString = fractionalPart.toString().padStart(resolvedDecimals, '0');
      const trimmedFractional = fractionalString.replace(/0+$/, '');
      if (trimmedFractional.length > 0) {
        amountString += '.' + trimmedFractional;
      }
    }

    return new AssetValue({
      amount: amountString,
      decimals: resolvedDecimals,
      symbol: symbol.toUpperCase(),
      contractAddress
    });
  }

  /**
   * Create zero-value AssetValue
   */
  public static zero(symbol: string, decimals?: number, contractAddress?: string): AssetValue {
    return new AssetValue({
      amount: '0',
      decimals: decimals ?? AssetValue.getDefaultDecimals(symbol),
      symbol: symbol.toUpperCase(),
      contractAddress
    });
  }

  /**
   * Get default decimals for common assets
   */
  private static getDefaultDecimals(symbol: string): number {
    return AssetValue.COMMON_DECIMALS[symbol.toUpperCase()] ?? 18; // Default to 18 decimals
  }

  /**
   * Get the amount as a string
   */
  public getAmount(): string {
    return this._value.amount;
  }

  /**
   * Get the amount as a number (use with caution for precision)
   */
  public getAmountAsNumber(): number {
    return Number(this._value.amount);
  }

  /**
   * Get the asset symbol
   */
  public getSymbol(): string {
    return this._value.symbol;
  }

  /**
   * Get the number of decimals
   */
  public getDecimals(): number {
    return this._value.decimals;
  }

  /**
   * Get contract address (if applicable)
   */
  public getContractAddress(): string | undefined {
    return this._value.contractAddress;
  }

  /**
   * Convert to wei/smallest unit
   */
  public toWei(): string {
    const amountBig = this.toBigInt();
    return amountBig.toString();
  }

  /**
   * Convert to BigInt representation (wei/smallest unit)
   */
  private toBigInt(): bigint {
    const [wholePart, fractionalPart = ''] = this._value.amount.split('.');
    const paddedFractional = fractionalPart.padEnd(this._value.decimals, '0');
    const fullAmountString = wholePart + paddedFractional;
    return BigInt(fullAmountString);
  }

  /**
   * Add another AssetValue (must be same asset)
   */
  public add(other: AssetValue): AssetValue {
    this.ensureCompatible(other);
    
    const thisWei = this.toBigInt();
    const otherWei = other.toBigInt();
    const sumWei = thisWei + otherWei;
    
    return AssetValue.fromWei(
      sumWei.toString(),
      this._value.symbol,
      this._value.decimals,
      this._value.contractAddress
    );
  }

  /**
   * Subtract another AssetValue (must be same asset)
   */
  public subtract(other: AssetValue): AssetValue {
    this.ensureCompatible(other);
    
    const thisWei = this.toBigInt();
    const otherWei = other.toBigInt();
    
    if (thisWei < otherWei) {
      throw new ValidationError(
        'Cannot subtract larger amount from smaller amount',
        'subtraction',
        { this: this._value.amount, other: other._value.amount }
      );
    }
    
    const differenceWei = thisWei - otherWei;
    
    return AssetValue.fromWei(
      differenceWei.toString(),
      this._value.symbol,
      this._value.decimals,
      this._value.contractAddress
    );
  }

  /**
   * Multiply by a number (for calculating values, fees, etc.)
   */
  public multiply(multiplier: number | string): AssetValue {
    if (typeof multiplier === 'number' && !Number.isFinite(multiplier)) {
      throw new ValidationError(
        'Multiplier must be finite',
        'multiplier',
        multiplier
      );
    }

    const multiplierBig = BigInt(Math.floor(Number(multiplier) * 1e18)); // Use 18 decimal precision for multiplier
    const thisWei = this.toBigInt();
    const resultWei = (thisWei * multiplierBig) / BigInt(1e18);
    
    return AssetValue.fromWei(
      resultWei.toString(),
      this._value.symbol,
      this._value.decimals,
      this._value.contractAddress
    );
  }

  /**
   * Divide by a number
   */
  public divide(divisor: number | string): AssetValue {
    const divisorNum = Number(divisor);
    
    if (!Number.isFinite(divisorNum) || divisorNum === 0) {
      throw new ValidationError(
        'Divisor must be finite and non-zero',
        'divisor',
        divisor
      );
    }

    const divisorBig = BigInt(Math.floor(divisorNum * 1e18)); // Use 18 decimal precision for divisor
    const thisWei = this.toBigInt();
    const resultWei = (thisWei * BigInt(1e18)) / divisorBig;
    
    return AssetValue.fromWei(
      resultWei.toString(),
      this._value.symbol,
      this._value.decimals,
      this._value.contractAddress
    );
  }

  /**
   * Check if this value is zero
   */
  public isZero(): boolean {
    return this._value.amount === '0' || Number(this._value.amount) === 0;
  }

  /**
   * Check if this value is positive
   */
  public isPositive(): boolean {
    return !this.isZero() && Number(this._value.amount) > 0;
  }

  /**
   * Compare with another AssetValue
   */
  public compare(other: AssetValue): -1 | 0 | 1 {
    this.ensureCompatible(other);
    
    const thisWei = this.toBigInt();
    const otherWei = other.toBigInt();
    
    if (thisWei < otherWei) return -1;
    if (thisWei > otherWei) return 1;
    return 0;
  }

  /**
   * Check if greater than another AssetValue
   */
  public isGreaterThan(other: AssetValue): boolean {
    return this.compare(other) === 1;
  }

  /**
   * Check if less than another AssetValue
   */
  public isLessThan(other: AssetValue): boolean {
    return this.compare(other) === -1;
  }

  /**
   * Check if equal to another AssetValue
   */
  public isEqualTo(other: AssetValue): boolean {
    return this.compare(other) === 0;
  }

  /**
   * Ensure two AssetValues are compatible for arithmetic operations
   */
  private ensureCompatible(other: AssetValue): void {
    if (this._value.symbol !== other._value.symbol) {
      throw new ValidationError(
        `Cannot perform operation between different assets: ${this._value.symbol} and ${other._value.symbol}`,
        'assetMismatch',
        { thisSymbol: this._value.symbol, otherSymbol: other._value.symbol }
      );
    }

    if (this._value.decimals !== other._value.decimals) {
      throw new ValidationError(
        `Decimal mismatch between assets: ${this._value.decimals} and ${other._value.decimals}`,
        'decimalMismatch',
        { thisDecimals: this._value.decimals, otherDecimals: other._value.decimals }
      );
    }
  }

  /**
   * Format for display with specified decimal places
   */
  public format(displayDecimals?: number): string {
    const amount = Number(this._value.amount);
    const decimals = displayDecimals ?? Math.min(this._value.decimals, 8); // Limit display to 8 decimals max
    
    // Format with thousand separators
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
  }

  /**
   * Format for display with symbol
   */
  public formatWithSymbol(displayDecimals?: number): string {
    return `${this.format(displayDecimals)} ${this._value.symbol}`;
  }

  /**
   * Convert to a different decimal precision (for display purposes)
   */
  public withDecimals(newDecimals: number): AssetValue {
    if (newDecimals === this._value.decimals) {
      return this;
    }

    const weiAmount = this.toBigInt();
    return AssetValue.fromWei(
      weiAmount.toString(),
      this._value.symbol,
      newDecimals,
      this._value.contractAddress
    );
  }

  /**
   * Create a copy with a different contract address
   */
  public withContractAddress(contractAddress: string): AssetValue {
    return new AssetValue({
      ...this._value,
      contractAddress
    });
  }

  /**
   * Get a human-readable string representation
   */
  public toString(): string {
    return this.formatWithSymbol();
  }
}