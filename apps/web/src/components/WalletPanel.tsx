'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import type { PassType, RiderStats, Ticket, Wallet } from '@transitflow/types';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n/context';

const MIN_REDEEM_POINTS = 100;

const PASS_PRICES: Record<PassType, number> = {
  SINGLE: 2000,
  WEEKLY: 8000,
  MONTHLY: 25000,
  STUDENT: 1200,
  SENIOR: 1200,
  FAMILY: 5000,
};

function formatCents(cents: number): string {
  return `R${(cents / 100).toFixed(2)}`;
}

function QrImage({ token }: { token: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(token, { width: 160, margin: 1 }).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!src) return <div className="w-40 h-40 bg-tf-surface animate-pulse rounded-tf-sm" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="Ticket QR code" className="w-40 h-40" />;
}

export function WalletPanel() {
  const { token } = useAuth();
  const { t } = useI18n();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<RiderStats | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function refresh() {
    if (!token) return;
    const [w, t, s] = await Promise.all([api.wallet(token), api.myTickets(token), api.stats(token)]);
    setWallet(w);
    setTickets(t);
    setStats(s);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return <p className="text-sm text-tf-text-muted">Sign in to use the wallet and buy tickets.</p>;
  }

  const activeTickets = tickets.filter((t) => !t.usedAt && new Date(t.validUntil) > new Date());

  return (
    <div className="space-y-5">
      {errorMsg && <p className="text-sm text-tf-danger">{errorMsg}</p>}
      <div className="rounded-tf-md border border-tf-border p-4">
        <p className="text-xs text-tf-text-muted mb-1">{t('wallet.balance')}</p>
        <p className="text-2xl font-bold mb-3">{wallet ? formatCents(wallet.balanceCents) : '…'}</p>
        <div className="flex gap-2">
          {[2000, 5000, 10000].map((amount) => (
            <button
              key={amount}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setErrorMsg(null);
                try {
                  await api.topUp(token, amount);
                  await refresh();
                } catch {
                  setErrorMsg('Top-up failed — is the API running?');
                } finally {
                  setBusy(false);
                }
              }}
              className="rounded-tf-sm bg-tf-surface-raised border border-tf-border px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
            >
              +{formatCents(amount)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-tf-text-muted mb-2">{t('wallet.buyTicket')}</h3>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(PASS_PRICES) as PassType[]).map((passType) => (
            <button
              key={passType}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setErrorMsg(null);
                try {
                  await api.buyTicket(token, passType);
                  await refresh();
                } catch {
                  setErrorMsg('Could not buy that ticket — check your wallet balance.');
                } finally {
                  setBusy(false);
                }
              }}
              className="rounded-tf-sm border border-tf-border px-3 py-2 text-sm text-left disabled:opacity-50"
            >
              <div className="font-semibold">{passType}</div>
              <div className="text-tf-text-muted text-xs">{formatCents(PASS_PRICES[passType])}</div>
            </button>
          ))}
        </div>
      </div>

      {activeTickets.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-tf-text-muted mb-2">Active tickets</h3>
          <div className="space-y-3">
            {activeTickets.map((t) => (
              <div key={t.id} className="rounded-tf-md border border-tf-border p-3 flex items-center gap-3">
                <QrImage token={t.qrToken} />
                <div className="text-sm">
                  <div className="font-semibold">{t.passType}</div>
                  <div className="text-tf-text-muted text-xs">
                    Valid until {new Date(t.validUntil).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-tf-text-muted mb-2">Your impact</h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="rounded-tf-sm border border-tf-border p-2 text-center">
              <div className="text-lg font-bold">{stats.totalRides}</div>
              <div className="text-xs text-tf-text-muted">Rides</div>
            </div>
            <div className="rounded-tf-sm border border-tf-border p-2 text-center">
              <div className="text-lg font-bold">{formatCents(stats.totalSpentCents)}</div>
              <div className="text-xs text-tf-text-muted">Spent</div>
            </div>
            <div className="rounded-tf-sm border border-tf-border p-2 text-center">
              <div className="text-lg font-bold">{stats.co2SavedKg.toFixed(1)} kg</div>
              <div className="text-xs text-tf-text-muted">CO₂ saved</div>
            </div>
            <div className="rounded-tf-sm border border-tf-border p-2 text-center">
              <div className="text-lg font-bold">{stats.treesEquivalent.toFixed(2)}</div>
              <div className="text-xs text-tf-text-muted">Trees/yr equiv.</div>
            </div>
          </div>

          <div className="rounded-tf-md border border-tf-border p-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">{stats.rewards.availablePoints} points</div>
              <div className="text-xs text-tf-text-muted">
                {stats.rewards.earnedPoints} earned · {stats.rewards.redeemedPoints} redeemed
              </div>
            </div>
            <button
              disabled={busy || stats.rewards.availablePoints < MIN_REDEEM_POINTS}
              onClick={async () => {
                setBusy(true);
                setErrorMsg(null);
                try {
                  await api.redeemPoints(token, MIN_REDEEM_POINTS);
                  await refresh();
                } catch {
                  setErrorMsg('Could not redeem points right now.');
                } finally {
                  setBusy(false);
                }
              }}
              className="rounded-tf-sm bg-tf-primary text-tf-primary-ink font-bold px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Redeem {MIN_REDEEM_POINTS}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
