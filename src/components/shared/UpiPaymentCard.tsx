'use client';

import React, { useEffect, useState } from 'react';
import { buildUpiUri, generateQrDataUrl } from '@/lib/upi';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  QrCode,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Send,
} from 'lucide-react';

export interface UpiPaymentCardProps {
  upiId: string;
  payeeName: string;
  amount?: number;
  orderNumber?: string;
  upiTransactionRef?: string | null;
  onReferenceSubmitted?: (ref: string) => Promise<void>;
  variant?: 'customer' | 'merchant_counter' | 'compact';
}

export function UpiPaymentCard({
  upiId,
  payeeName,
  amount,
  orderNumber,
  upiTransactionRef,
  onReferenceSubmitted,
  variant = 'customer',
}: UpiPaymentCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [refInput, setRefInput] = useState(upiTransactionRef || '');
  const [submittingRef, setSubmittingRef] = useState(false);
  const [refSaved, setRefSaved] = useState(!!upiTransactionRef);
  const [showManualRef, setShowManualRef] = useState(false);

  const upiUri = buildUpiUri({
    upiId,
    payeeName,
    amount,
    transactionNote: orderNumber ? `Order #${orderNumber}` : undefined,
  });

  useEffect(() => {
    generateQrDataUrl(upiUri, { width: variant === 'compact' ? 200 : 260 })
      .then(setQrDataUrl)
      .catch((err) => console.error('QR code generation error:', err));
  }, [upiUri, variant]);

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refInput.trim() || !onReferenceSubmitted) return;
    setSubmittingRef(true);
    try {
      await onReferenceSubmitted(refInput.trim());
      setRefSaved(true);
    } catch {
      // Handled by parent
    } finally {
      setSubmittingRef(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-xs p-5 sm:p-6 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-zinc-950 text-white flex items-center justify-center font-bold text-xs">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-zinc-950 flex items-center gap-1.5">
              <span>UPI Instant Payment</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            </h3>
            <p className="text-[11px] text-zinc-600">Scan QR or tap to open UPI App</p>
          </div>
        </div>

        {amount !== undefined && amount !== null && (
          <div className="text-right">
            <div className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">Amount Due</div>
            <div className="text-base font-extrabold text-zinc-950">{formatCurrency(amount)}</div>
          </div>
        )}
      </div>

      {/* QR Code Presentation */}
      <div className="py-5 flex flex-col items-center justify-center">
        <div className="p-3.5 bg-white rounded-2xl border-2 border-zinc-950 shadow-sm relative group">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`UPI QR Code for ${payeeName}`}
              className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-lg"
            />
          ) : (
            <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center bg-zinc-50 rounded-lg text-zinc-400">
              <QrCode className="w-8 h-8 animate-pulse" />
            </div>
          )}
          {/* Subtle branding watermark badge */}
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-zinc-950 text-white text-[10px] font-semibold tracking-wider uppercase shadow-xs">
            BHIM UPI
          </div>
        </div>

        {/* Payee Info & Copy UPI ID */}
        <div className="mt-5 w-full max-w-sm flex flex-col items-center gap-2 text-center">
          <div className="text-xs font-semibold text-zinc-950">{payeeName}</div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-mono text-zinc-700">
            <span>{upiId}</span>
            <button
              onClick={handleCopyUpiId}
              type="button"
              className="p-1 rounded text-zinc-500 hover:text-zinc-950 transition-colors"
              title="Copy UPI ID"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Direct Pay Button (NPCI Intent Link) */}
      <div className="pt-2 flex flex-col gap-2">
        <a href={upiUri} className="w-full block">
          <Button
            size="lg"
            variant="primary"
            className="w-full gap-2 font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm h-11"
          >
            <Smartphone className="w-4 h-4" />
            <span>Pay with any UPI App</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </Button>
        </a>

        {/* Supported UPI Providers Pills */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-zinc-600 pt-1">
          <span className="font-medium">Supported:</span>
          <span className="px-1.5 py-0.5 rounded bg-zinc-100 font-medium text-zinc-700">Google Pay</span>
          <span className="px-1.5 py-0.5 rounded bg-zinc-100 font-medium text-zinc-700">PhonePe</span>
          <span className="px-1.5 py-0.5 rounded bg-zinc-100 font-medium text-zinc-700">Paytm</span>
          <span className="px-1.5 py-0.5 rounded bg-zinc-100 font-medium text-zinc-700">CRED</span>
          <span className="px-1.5 py-0.5 rounded bg-zinc-100 font-medium text-zinc-700">BHIM</span>
        </div>
      </div>

      {/* Optional: Submit UPI UTR / Transaction Reference (Customer order tracking) */}
      {variant === 'customer' && onReferenceSubmitted && (
        <div className="mt-5 pt-4 border-t border-zinc-100">
          {!refSaved ? (
            <div>
              <button
                type="button"
                onClick={() => setShowManualRef(!showManualRef)}
                className="text-xs text-zinc-600 hover:text-zinc-950 font-medium flex items-center justify-between w-full"
              >
                <span>Paid via UPI? Add 12-digit UTR reference</span>
                {showManualRef ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showManualRef && (
                <form onSubmit={handleRefSubmit} className="mt-3 flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter UPI Ref / UTR (e.g. 4310...)"
                    value={refInput}
                    onChange={(e) => setRefInput(e.target.value)}
                    className="flex-1 h-9 rounded-lg border border-zinc-200 px-3 text-xs font-mono text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950"
                  />
                  <Button type="submit" size="sm" isLoading={submittingRef} className="text-xs shrink-0">
                    <Send className="w-3 h-3 mr-1" />
                    Submit
                  </Button>
                </form>
              )}
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>UPI Reference: <strong className="font-mono">{refInput}</strong></span>
              </div>
              <Badge variant="success" size="sm">Submitted</Badge>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
