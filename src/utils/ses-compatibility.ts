// SES (Secure ECMAScript) Compatibility
// This file ensures compatibility with wallet extensions that use SES lockdown

// Check if we're in a SES lockdown environment
export const isSESEnvironment = () => {
  return typeof globalThis.lockdown === 'function' || 
         typeof (globalThis as any).harden === 'function';
};

// Ensure Date methods are compatible with SES
export const safeDate = {
  now: () => Date.now(),
  toISOString: (date: Date) => date.toISOString(),
  toLocaleString: (date: Date, locales?: string | string[], options?: Intl.DateTimeFormatOptions) => {
    try {
      return date.toLocaleString(locales, options);
    } catch (e) {
      // Fallback for SES environments
      return date.toString();
    }
  },
  toLocaleTimeString: (date: Date, locales?: string | string[], options?: Intl.DateTimeFormatOptions) => {
    try {
      return date.toLocaleTimeString(locales, options);
    } catch (e) {
      // Fallback for SES environments
      return date.toTimeString();
    }
  }
};

// Log SES environment status (only in development)
if (import.meta.env.DEV) {
  if (isSESEnvironment()) {
    console.info('🔒 Running in SES lockdown environment (likely due to Web3 wallet extension)');
  }
}