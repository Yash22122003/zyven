'use client';

/**
 * Loads the official Razorpay Checkout SDK script dynamically
 * Provides safe diagnostic logs without exposing sensitive information
 */
export function loadRazorpayCheckoutScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    if ((window as any).Razorpay) {
      console.log('[Razorpay Frontend] Checkout script already loaded on window (checkout.js)');
      resolve(true);
      return;
    }

    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      console.log('[Razorpay Frontend] Existing checkout script tag detected, awaiting load...');
      existingScript.addEventListener('load', () => {
        console.log('[Razorpay Frontend] Checkout script loaded successfully via existing tag (checkout.js)');
        resolve(true);
      });
      existingScript.addEventListener('error', () => {
        console.error('[Razorpay Frontend] Checkout script failed to load via existing tag (checkout.js)');
        resolve(false);
      });
      return;
    }

    console.log('[Razorpay Frontend] Injecting Razorpay checkout script (https://checkout.razorpay.com/v1/checkout.js)...');
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;

    script.onload = () => {
      console.log('[Razorpay Frontend] Checkout script loaded successfully (checkout.js)');
      resolve(true);
    };

    script.onerror = () => {
      console.error('[Razorpay Frontend] Checkout script failed to load (checkout.js)');
      resolve(false);
    };

    document.body.appendChild(script);
  });
}
