import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from './src/supabaseClient';
import { isArcheologist } from './src/utils/roles';
import { colors } from './src/theme';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';
import AccountScreen from './src/screens/AccountScreen';
import ArchScreen from './src/screens/ArchScreen';
import EducationScreen from './src/screens/EducationScreen';
import TeamScreen from './src/screens/TeamScreen';
import SocialScreen from './src/screens/SocialScreen';
import ArchivesScreen from './src/screens/ArchivesScreen';
import JournalScreen from './src/screens/JournalScreen';

const TAB_HOME = 'home';
const TAB_MAP = 'map';
const TAB_ARCH = 'arch';
const TAB_EDUCATION = 'education';
const TAB_TEAM = 'team';
const TAB_SOCIAL = 'social';
const TAB_ACCOUNT = 'account';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState(TAB_HOME);
  const [subView, setSubView] = useState(null); // 'archives' | 'journal'
  const [journalSiteId, setJournalSiteId] = useState(null);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      setProfile(null);
      return;
    }
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user?.id) fetchProfile(s.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) fetchProfile(s.user?.id);
      else setProfile(null);
    });
    return () => subscription?.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    if (!supabase || !userId) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', userId);
    if (data?.[0]) setProfile(data[0]);
  }

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    setTab(TAB_HOME);
    setSubView(null);
  };

  if (!session) {
    return (
      <SafeAreaProvider>
        <AuthScreen />
        <StatusBar style="dark" />
      </SafeAreaProvider>
    );
  }

  const isArcheologistRole = isArcheologist(profile);
  const isStudent = profile?.role === 'Student';

  const tabs = [
    { key: TAB_HOME, label: 'Home', icon: '⌂' },
    { key: TAB_MAP, label: 'Map', icon: '⌗' },
    ...(isArcheologistRole ? [{ key: TAB_ARCH, label: 'Arch', icon: '▦' }] : []),
    ...(isStudent ? [{ key: TAB_EDUCATION, label: 'Edu', icon: '◫' }] : []),
    { key: TAB_TEAM, label: 'Team', icon: '👥' },
    { key: TAB_SOCIAL, label: 'Social', icon: '💬' },
    { key: TAB_ACCOUNT, label: 'Me', icon: '◆' },
  ];

  const renderContent = () => {
    if (subView === 'archives') {
      return (
        <ArchivesScreen
          onBack={() => { setSubView(null); }}
        />
      );
    }
    if (subView === 'journal' && journalSiteId) {
      return (
        <JournalScreen
          siteId={journalSiteId}
          onBack={() => { setSubView(null); setJournalSiteId(null); }}
        />
      );
    }
    switch (tab) {
      case TAB_HOME:
        return (
          <HomeScreen
            onOpenMap={() => setTab(TAB_MAP)}
            onOpenSocial={() => setTab(TAB_SOCIAL)}
          />
        );
      case TAB_MAP:
        return <MapScreen profile={profile} />;
      case TAB_ARCH:
        return (
          <ArchScreen
            onOpenMap={() => setTab(TAB_MAP)}
            onOpenArchives={() => setSubView('archives')}
          />
        );
      case TAB_EDUCATION:
        return <EducationScreen onOpenMap={() => setTab(TAB_MAP)} />;
      case TAB_TEAM:
        return <TeamScreen />;
      case TAB_SOCIAL:
        return <SocialScreen />;
      case TAB_ACCOUNT:
        return (
          <AccountScreen
            profile={profile}
            session={session}
            onProfileUpdate={(updated) => setProfile((p) => (p ? { ...p, ...updated } : null))}
            onLogout={handleLogout}
          />
        );
      default:
        return <HomeScreen onOpenMap={() => setTab(TAB_MAP)} onOpenSocial={() => setTab(TAB_SOCIAL)} />;
    }
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <View style={styles.main}>{renderContent()}</View>
        <View style={styles.tabBar}>
          {tabs.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, tab === t.key && styles.tabActive]}
              onPress={() => { setTab(t.key); setSubView(null); }}
            >
              <Text style={[styles.tabIcon, tab === t.key && styles.tabIconActive]}>{t.icon}</Text>
              <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]} numberOfLines={1}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.parchment },
  main: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 8,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabActive: { backgroundColor: 'rgba(44,40,37,0.06)' },
  tabIcon: { fontSize: 18, color: colors.inkMuted, marginBottom: 2 },
  tabIconActive: { color: colors.accent },
  tabLabel: { fontSize: 10, fontWeight: '600', color: colors.inkMuted },
  tabLabelActive: { color: colors.ink },
});
