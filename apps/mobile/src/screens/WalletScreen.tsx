import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Wallet } from '@transitflow/types';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { colors } from '../theme';

const TOP_UP_AMOUNTS = [2000, 5000, 10000];

function formatCents(cents: number): string {
  return `R${(cents / 100).toFixed(2)}`;
}

export function WalletScreen() {
  const { token } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!token) return;
    setWallet(await api.wallet(token));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Balance</Text>
      <Text style={styles.balance}>{wallet ? formatCents(wallet.balanceCents) : '…'}</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.row}>
        {TOP_UP_AMOUNTS.map((amount) => (
          <Pressable
            key={amount}
            disabled={busy || !token}
            style={styles.topUpButton}
            onPress={async () => {
              if (!token) return;
              setBusy(true);
              setError(null);
              try {
                await api.topUp(token, amount);
                await refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Top-up failed');
              } finally {
                setBusy(false);
              }
            }}
          >
            <Text style={styles.topUpText}>+{formatCents(amount)}</Text>
          </Pressable>
        ))}
      </View>

      {!token && <Text style={styles.muted}>Sign in to use the wallet.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.bg },
  label: { color: colors.textMuted, fontSize: 13 },
  balance: { fontSize: 32, fontWeight: '700', color: colors.text, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 8 },
  topUpButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  topUpText: { fontWeight: '600', color: colors.text },
  muted: { color: colors.textMuted, marginTop: 12 },
  error: { color: colors.danger, marginBottom: 8 },
});
