import { Injectable } from '@nestjs/common';

export interface ChargeResult {
  success: boolean;
  reference: string;
}

/**
 * Stripe requires a real account + API keys we don't have on this dev
 * machine (same external-signup blocker as Mapbox — see docs/09-roadmap.md).
 * This interface is what a real StripePaymentProvider would implement;
 * MockPaymentProvider always succeeds so wallet/ticketing logic downstream
 * can be built and demoed now, and swapped later without touching callers.
 */
export interface PaymentProvider {
  charge(amountCents: number): Promise<ChargeResult>;
}

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  async charge(amountCents: number): Promise<ChargeResult> {
    return { success: amountCents > 0, reference: `mock_${Date.now()}_${Math.round(Math.random() * 1e6)}` };
  }
}
