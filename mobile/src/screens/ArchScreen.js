import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { colors } from '../theme';

const WEB_HUB_URL = 'https://global-archeology-hub.vercel.app'; // or your deployed URL

export default function ArchScreen({ onOpenMap, onOpenArchives }) {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={true}
    >
      <Text style={styles.title}>Arch Zone</Text>
      <Text style={styles.subtitle}>Field archaeology tools and site management</Text>
      <View style={styles.card}>
        <Text style={styles.cardText}>
          Full Arch Zone (sites, journals, archives) is available on the web app. Open the link below for the complete experience.
        </Text>
        <TouchableOpacity style={styles.linkButton} onPress={() => Linking.openURL(WEB_HUB_URL)}>
          <Text style={styles.linkButtonText}>Open in browser</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.buttonRow}>
        {onOpenArchives && (
          <TouchableOpacity style={styles.secondaryButton} onPress={onOpenArchives}>
            <Text style={styles.secondaryButtonText}>Archives</Text>
          </TouchableOpacity>
        )}
        {onOpenMap && (
          <TouchableOpacity style={styles.secondaryButton} onPress={onOpenMap}>
            <Text style={styles.secondaryButtonText}>View map</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.parchment },
  content: { flexGrow: 1, padding: 20, paddingBottom: 100 },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 14, color: colors.inkMuted, marginTop: 4, marginBottom: 20 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 16,
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
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 12, flexWrap: 'wrap' },
  secondaryButton: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.ink,
    alignSelf: 'flex-start',
  },
  secondaryButtonText: { color: colors.ink, fontWeight: '600', fontSize: 14 },
});
