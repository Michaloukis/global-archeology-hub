import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../supabaseClient';
import { colors } from '../theme';

export default function AccountScreen({ profile, session, onProfileUpdate, onLogout }) {
  const [username, setUsername] = useState(profile?.username ?? '');
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    setUsername(profile?.username ?? '');
    setFullName(profile?.full_name ?? '');
  }, [profile?.id, profile?.username, profile?.full_name]);

  const handleSave = async () => {
    if (!supabase || !profile?.id) return;
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim() || null,
          full_name: fullName.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);
      if (error) throw error;
      onProfileUpdate?.({ ...profile, username: username.trim(), full_name: fullName.trim() });
      setMessage({ type: 'success', text: 'Settings saved.' });
    } catch (e) {
      setMessage({ type: 'error', text: e?.message || 'Failed to save.' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', onPress: onLogout, style: 'destructive' },
    ]);
  };

  const email = session?.user?.email ?? '';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Account</Text>

        <View style={styles.avatarRow}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {(fullName || email || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.avatarInfo}>
            <Text style={styles.email}>{email}</Text>
            <Text style={styles.role}>{profile?.role ?? '—'}</Text>
          </View>
        </View>

        <Text style={styles.label}>Full name</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Your name"
          placeholderTextColor={colors.inkLight}
        />
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Username"
          placeholderTextColor={colors.inkLight}
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>

        {message.text ? (
          <View style={[styles.messageBox, message.type === 'error' && styles.messageBoxError]}>
            <Text style={styles.messageText}>{message.text}</Text>
          </View>
        ) : null}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.parchment },
  content: { padding: 20, paddingBottom: 120 },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, marginBottom: 20 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: { fontSize: 24, fontWeight: '700', color: colors.white },
  avatarInfo: { marginLeft: 16 },
  email: { fontSize: 14, color: colors.ink, fontWeight: '600' },
  role: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  label: { fontSize: 12, fontWeight: '700', color: colors.ink, marginBottom: 6, textTransform: 'uppercase' },
  input: {
    height: 44,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 16,
  },
  button: {
    height: 44,
    backgroundColor: colors.ink,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  messageBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(21, 128, 61, 0.15)',
  },
  messageBoxError: { backgroundColor: 'rgba(185, 28, 28, 0.15)' },
  messageText: { fontSize: 12, color: colors.ink, fontWeight: '600' },
  logoutButton: { marginTop: 32, paddingVertical: 12, alignItems: 'center' },
  logoutText: { fontSize: 14, color: colors.error, fontWeight: '700' },
});
