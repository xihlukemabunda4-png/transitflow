import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { colors } from '../theme';

export function AuthScreen() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') await login(email, password);
      else await signup(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TransitFlow</Text>
      <Text style={styles.subtitle}>The smarter way to move.</Text>

      <View style={styles.tabs}>
        <Pressable onPress={() => setMode('login')} style={[styles.tab, mode === 'login' && styles.tabActive]}>
          <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Sign in</Text>
        </Pressable>
        <Pressable onPress={() => setMode('signup')} style={[styles.tab, mode === 'signup' && styles.tabActive]}>
          <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>Sign up</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.submit} onPress={submit} disabled={submitting || !email || !password}>
        {submitting ? <ActivityIndicator color={colors.primaryInk} /> : <Text style={styles.submitText}>{mode === 'login' ? 'Sign in' : 'Create account'}</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: 24 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.surfaceRaised, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: colors.primaryInk },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    color: colors.text,
  },
  error: { color: colors.danger, marginBottom: 8, fontSize: 13 },
  submit: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  submitText: { color: colors.primaryInk, fontWeight: '700', fontSize: 16 },
});
