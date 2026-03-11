import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { supabase } from '../supabaseClient';
import { colors } from '../theme';

let MapView, Marker;
try {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
} catch (_) {
  MapView = null;
  Marker = null;
}

const DEFAULT_REGION = { latitude: 20, longitude: 0, latitudeDelta: 80, longitudeDelta: 80 };

export default function MapScreen({ profile }) {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setError('Database not configured');
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const query = profile?.id
          ? supabase.from('sites').select('*').or(`is_public.eq.true,created_by.eq.${profile.id}`)
          : supabase.from('sites').select('*').eq('is_public', true);
        const { data, error: e } = await query;
        if (!mounted) return;
        if (e) throw e;
        const withCoords = (data || []).map((s) => {
          const lat = typeof s?.lat === 'number' ? s.lat : 15 + (s.id % 35) - 5;
          const lng = typeof s?.lng === 'number' ? s.lng : ((s.id * 37) % 360) - 180;
          return { ...s, lat, lng };
        });
        setSites(withCoords);
      } catch (err) {
        if (mounted) {
          setError(err?.message || 'Failed to load sites');
          setSites([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [profile?.id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.ink} />
        <Text style={styles.loadingText}>Loading sites…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!MapView || Platform.OS === 'web') {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Map is available on Android and iOS. Use the native app or open the web app in a browser for the full map.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={DEFAULT_REGION}
        showsUserLocation
        showsMyLocationButton
      >
        {sites.filter((s) => typeof s.lat === 'number' && typeof s.lng === 'number').map((site) => (
          <Marker
            key={site.id}
            coordinate={{ latitude: site.lat, longitude: site.lng }}
            title={site.name || 'Site'}
            description={site.description || undefined}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1, width: '100%', height: '100%' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.parchment, padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.inkMuted },
  errorText: { fontSize: 14, color: colors.error, textAlign: 'center' },
});
