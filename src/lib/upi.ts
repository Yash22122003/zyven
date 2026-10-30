import QRCode from 'qrcode';

export interface UpiPaymentDetails {
  upiId: string;
  payeeName: string;
  amount?: number;
  transactionNote?: string;
  referenceId?: string;
}

/**
 * Builds the standard NPCI Unified Payments Interface (UPI) deep link URI
 * Syntax: upi://pay?pa={upiId}&pn={payeeName}&am={amount}&cu=INR&tn={transactionNote}
 */
export function buildUpiUri({
  upiId,
  payeeName,
  amount,
  transactionNote,
}: UpiPaymentDetails): string {
  const cleanUpi = upiId.trim();
  const cleanName = encodeURIComponent(payeeName.trim());
  let uri = `upi://pay?pa=${cleanUpi}&pn=${cleanName}&cu=INR`;

  if (amount !== undefined && amount > 0) {
    uri += `&am=${amount.toFixed(2)}`;
  }

  if (transactionNote) {
    uri += `&tn=${encodeURIComponent(transactionNote.trim())}`;
  }

  return uri;
}

/**
 * Generates an optimized QR Code SVG or Base64 Data URL for high-contrast mobile scanning
 */
export async function generateQrDataUrl(
  text: string,
  options?: { width?: number; margin?: number }
): Promise<string> {
  const width = options?.width || 280;
  const margin = options?.margin || 1;

  return QRCode.toDataURL(text, {
    width,
    margin,
    color: {
      dark: '#09090b', // zinc-950 high contrast
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });
}
