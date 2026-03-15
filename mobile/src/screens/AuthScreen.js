import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../supabaseClient';
import { colors } from '../theme';

const ROLES = ['Director', 'Field Archeologist', 'Student', 'Public'];

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('Public');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async () => {
    setLoading(true);
    setMessage('');

    if (!supabase) {
      Alert.alert('System Error', 'Database connection lost.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, username, role },
          },
        });
        if (authError) throw authError;
        if (authData?.user) {
          await supabase.from('profiles').insert([
            {
              id: authData.user.id,
              full_name: fullName,
              username,
              role,
              updated_at: new Date().toISOString(),
            },
          ]);
        }
        setMessage('Registration complete. Identity verified.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.title}>Global Archaeology Hub</Text>
            <Text style={styles.subtitle}>Authentication · v2.0</Text>

            {isSignUp && (
              <>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Official Name"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  placeholderTextColor={colors.inkLight}
                />
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Unique ID"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  placeholderTextColor={colors.inkLight}
                />
                <Text style={styles.label}>Designation</Text>
                <View style={styles.roleRow}>
                  {ROLES.map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.roleChip, role === r && styles.roleChipActive]}
                      onPress={() => setRole(r)}
                    >
                      <Text style={[styles.roleChipText, role === r && styles.roleChipTextActive]}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="id@institution.org"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={colors.inkLight}
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={colors.inkLight}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleAuth}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Wait…' : isSignUp ? 'Create Profile' : 'Access Hub'}
              </Text>
            </TouchableOpacity>

            {message ? (
              <View style={styles.messageBox}>
                <Text style={styles.messageText}>{message}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.toggle}
              onPress={() => { setIsSignUp(!isSignUp); setMessage(''); }}
            >
              <Text style={styles.toggleText}>
                {isSignUp ? 'Back to Login' : 'Register New Identity'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.parchment },
  keyboard: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingVertical: 32 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 10,
    color: colors.inkMuted,
    letterSpacing: 2,
    fontWeight: '700',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.ink,
  },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(44,40,37,0.08)',
  },
  roleChipActive: { backgroundColor: colors.ink, },
  roleChipText: { fontSize: 12, color: colors.ink, fontWeight: '600' },
  roleChipTextActive: { color: colors.white },
  button: {
    height: 44,
    backgroundColor: colors.ink,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  messageBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  messageText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  toggle: {
    marginTop: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.ink,
    textTransform: 'uppercase',
  },
});
