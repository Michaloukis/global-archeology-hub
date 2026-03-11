import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { colors } from '../theme';

const ARTICLES = [
  {
    id: '1',
    title: 'Massive Mayan City "Valeriana" Discovered via Lidar in Mexico',
    summary: 'Archaeologists have discovered a hidden Mayan city covering nearly 16.6 square kilometers.',
    source: 'SMITHSONIAN',
    date: 'OCT 2025',
    url: 'https://www.smithsonianmag.com/smart-news/archaeologists-discover-massive-lost-maya-city-mexico-using-lidar-180985356/',
  },
  {
    id: '2',
    title: 'Rare 4,000-Year-Old Circular Structure Found on Crete Hilltop',
    summary: 'A unique Minoan building of "monumental" proportions unearthed on Papoura Hill.',
    source: 'SMITHSONIAN',
    date: 'JUN 2024',
    url: 'https://www.smithsonianmag.com/smart-news/monumental-4000-year-old-circular-labyrinth-unearthed-greek-island-180984534/',
  },
  {
    id: '3',
    title: 'Pompeii: Uncovering the "House of the Painters at Work"',
    summary: 'New excavations revealed frescoes and tools left during the eruption of AD 79.',
    source: 'SMITHSONIAN',
    date: 'MAY 2024',
    url: 'https://www.smithsonianmag.com/smart-news/paintbrushes-bowls-pigment-unearthed-pompeii-180984442/',
  },
];

const EVENTS = [
  { title: 'International Seminar on Lidar Tech', day: '12', month: 'FEB', loc: 'Virtual Hub' },
  { title: 'Field Expedition: Giza Plateau', day: '24', month: 'MAR', loc: 'Cairo, Egypt' },
  { title: 'Lab Workshop: Carbon Dating 2.0', day: '05', month: 'APR', loc: 'London, UK' },
];

export default function HomeScreen({ onOpenMap, onOpenSocial }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>The Global Archaeology Hub</Text>
        <Text style={styles.headerSubtitle}>A global standardized archaeology data platform</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Global Sites</Text>
          <TouchableOpacity onPress={onOpenMap}>
            <Text style={styles.cardLink}>View Full Map →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.miniMapPlaceholder}>
          <Text style={styles.miniMapText}>Map preview</Text>
          <TouchableOpacity style={styles.miniMapButton} onPress={onOpenMap}>
            <Text style={styles.miniMapButtonText}>Open Map</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.cardNote}>● Active Sites — Public-safe data only.</Text>
      </View>

      {onOpenSocial && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Social</Text>
          <TouchableOpacity onPress={onOpenSocial}>
            <Text style={styles.cardLink}>View activity →</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.sectionTitle}>Latest Reports</Text>
      {ARTICLES.map((article) => (
        <TouchableOpacity
          key={article.id}
          style={styles.articleCard}
          onPress={() => article.url && Linking.openURL(article.url)}
          activeOpacity={0.8}
        >
          <View style={styles.articleMeta}>
            <Text style={styles.articleSource}>{article.source}</Text>
            <Text style={styles.articleDate}>{article.date}</Text>
          </View>
          <Text style={styles.articleTitle}>{article.title}</Text>
          <Text style={styles.articleSummary}>{article.summary}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.sectionTitle}>Global Events</Text>
      {EVENTS.map((e, i) => (
        <View key={i} style={styles.eventRow}>
          <View style={styles.eventDate}>
            <Text style={styles.eventMonth}>{e.month}</Text>
            <Text style={styles.eventDay}>{e.day}</Text>
          </View>
          <View style={styles.eventBody}>
            <Text style={styles.eventTitle}>{e.title}</Text>
            <Text style={styles.eventLoc}>Location: {e.loc}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.parchment },
  content: { padding: 16, paddingBottom: 100 },
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.ink },
  headerSubtitle: { fontSize: 14, color: colors.inkMuted, marginTop: 4 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(44,40,37,0.1)',
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.ink },
  cardLink: { fontSize: 14, color: colors.inkMuted, fontWeight: '500' },
  miniMapPlaceholder: {
    aspectRatio: 4 / 3,
    minHeight: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(44,40,37,0.1)',
    backgroundColor: colors.parchmentDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniMapText: { fontSize: 12, color: colors.inkLight },
  miniMapButton: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: colors.ink, borderRadius: 8 },
  miniMapButtonText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  cardNote: { fontSize: 12, color: colors.inkMuted, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 12, marginTop: 8 },
  articleCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(44,40,37,0.1)',
    padding: 16,
    marginBottom: 12,
  },
  articleMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  articleSource: { fontSize: 10, fontWeight: '800', color: colors.error, backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 2 },
  articleDate: { fontSize: 10, fontWeight: '700', color: colors.inkLight },
  articleTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, textTransform: 'uppercase' },
  articleSummary: { fontSize: 12, color: colors.inkLight, marginTop: 6 },
  eventRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  eventDate: {
    width: 60,
    backgroundColor: colors.ink,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  eventMonth: { fontSize: 10, fontWeight: '800', color: colors.white },
  eventDay: { fontSize: 18, fontWeight: '800', color: colors.white },
  eventBody: { flex: 1 },
  eventTitle: { fontSize: 14, fontWeight: '800', color: colors.ink, textTransform: 'uppercase' },
  eventLoc: { fontSize: 10, color: colors.inkLight, marginTop: 2, textTransform: 'uppercase' },
});
