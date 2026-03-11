import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { colors } from '../theme';

const WEB_HUB_URL = 'https://global-archeology-hub.vercel.app';

export default function SocialScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Social</Text>
      <Text style={styles.subtitle}>Activity and chat</Text>
      <View style={styles.card}>
        <Text style={styles.cardText}>
          Social feed and chatrooms are available on the web app.
        </Text>
        <TouchableOpacity style={styles.linkButton} onPress={() => Linking.openURL(WEB_HUB_URL)}>
          <Text style={styles.linkButtonText}>Open in browser</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.parchment },
  content: { padding: 20, paddingBottom: 100 },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 14, color: colors.inkMuted, marginTop: 4, marginBottom: 20 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  cardText: { fontSize: 14, color: colors.ink, lineHeight: 22 },
  linkButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.ink,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  linkButtonText: { color: colors.white, fontWeight: '700', fontSize: 14 },
});
