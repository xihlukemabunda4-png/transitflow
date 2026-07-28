import { useState } from 'react';
import { Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from './src/lib/auth';
import { AuthScreen } from './src/screens/AuthScreen';
import { StopsScreen } from './src/screens/StopsScreen';
import { WalletScreen } from './src/screens/WalletScreen';
import { colors } from './src/theme';

function Shell() {
  const { user, loading, logout } = useAuth();
  const [tab, setTab] = useState<'stops' | 'wallet'>('stops');

  if (loading) return null;
  if (!user) return <AuthScreen />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TransitFlow</Text>
        <Pressable onPress={logout}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>
      <View style={styles.tabs}>
        <Pressable style={[styles.tab, tab === 'stops' && styles.tabActive]} onPress={() => setTab('stops')}>
          <Text style={[styles.tabText, tab === 'stops' && styles.tabTextActive]}>Nearby Stops</Text>
        </Pressable>
        <Pressable style={[styles.tab, tab === 'wallet' && styles.tabActive]} onPress={() => setTab('wallet')}>
          <Text style={[styles.tabText, tab === 'wallet' && styles.tabTextActive]}>Wallet</Text>
        </Pressable>
      </View>
      {tab === 'stops' ? <StopsScreen /> : <WalletScreen />}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar barStyle="dark-content" />
      <Shell />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  signOut: { color: colors.textMuted, textDecorationLine: 'underline' },
  tabs: { flexDirection: 'row', gap: 8, padding: 12 },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.surfaceRaised },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: colors.primaryInk },
});
