import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, type ScrollViewInstance, Text, TextInput, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Markdown } from '@/components/chat';
import { Link, Press, tap } from '@/components/ui';
import { ask, type Entry, newChat, useChat } from '@/lib/assistant';
import { useAIReady } from '@/lib/auth';
import { makeStyles, R, S, type, useTheme } from '@/lib/theme';

const SUGGESTIONS = [
  'My machines have free days next week. Find companies near me that buy this kind of work.',
  'Find 10 tractor and farm-equipment makers within 200 km that outsource machining.',
  'Check GeM and other tender sites for jobs I could bid on.',
  'Write first messages for my new buyers that have a phone or email.',
];

function Message({ entry }: { entry: Entry }) {
  const { c } = useTheme();
  const s = useStyles();
  if (entry.role === 'user')
    return (
      <View style={s.mine}>
        <Text style={s.mineText}>{entry.text}</Text>
      </View>
    );
  if (entry.role === 'activity')
    return (
      <View style={s.activity}>
        <Ionicons name="checkmark-circle-outline" size={14} color={c.faint} />
        <Text style={[s.meta, { flex: 1 }]}>{entry.text}</Text>
      </View>
    );
  if (entry.role === 'error') return <Text style={[s.meta, { color: c.idle }]}>{entry.text}</Text>;
  return (
    <View style={s.theirs}>
      <Markdown text={entry.text} />
    </View>
  );
}

export default function Assistant() {
  const { c } = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const { log, busy, busySince } = useChat();
  const aiReady = useAIReady();
  const [text, setText] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const scroll = useRef<ScrollViewInstance>(null);

  // A ticking clock while the agent works, so a long web search doesn't look frozen.
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [busy]);
  const seconds = Math.max(0, Math.floor((now - busySince) / 1000));

  const send = (m = text) => {
    if (!m.trim() || busy) return;
    setText('');
    ask(m.trim());
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[s.header, { paddingTop: insets.top + S.sm }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={12} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
        <Text style={s.title}>Ask Aiventre</Text>
        {log.length > 0 && !busy ? <Link label="New chat" onPress={newChat} /> : <View style={{ width: 26 }} />}
      </View>

      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={s.list}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
        {log.length === 0 ? (
          <View style={{ gap: S.md }}>
            <Text style={s.heading}>What should I work on?</Text>
            <Text style={s.body}>
              I look for real companies on the web, save them to your buyers with the link, and write messages for you to check. I
              never send anything myself.
            </Text>
            {!aiReady && <Text style={[s.body, { color: c.idle }]}>Sign in or add the access code first: My shop.</Text>}
            {SUGGESTIONS.map((q) => (
              <Press key={q} onPress={() => send(q)} style={s.suggestion} scale={0.98} disabled={!!busy || !aiReady}>
                <Text style={s.answer}>{q}</Text>
              </Press>
            ))}
          </View>
        ) : (
          log.map((e, i) => <Message key={i} entry={e} />)
        )}
        {!!busy && (
          <View style={s.activity}>
            <ActivityIndicator size="small" color={c.muted} />
            <Text style={s.meta}>
              {busy} {seconds}s{seconds > 20 ? ' · web research can take a minute or two' : ''}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={[s.composer, { paddingBottom: insets.bottom + S.sm }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Tell Aiventre what you need…"
          placeholderTextColor={c.faint}
          selectionColor={c.text}
          multiline
          style={s.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send"
          disabled={!text.trim() || !!busy}
          onPress={() => {
            tap();
            send();
          }}
          style={[s.send, (!text.trim() || !!busy) && { opacity: 0.35 }]}>
          <Ionicons name="arrow-up" size={20} color={c.onPrimary} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.ground },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.lg, paddingBottom: S.sm, gap: S.md },
  title: { ...type.heading, color: c.text, flex: 1 },
  list: { padding: S.lg, gap: S.md },
  heading: { ...type.title, fontSize: 24, color: c.text },
  body: { ...type.body, color: c.muted },
  meta: { ...type.meta, color: c.muted },
  answer: { ...type.body, color: c.text },
  suggestion: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: R.box, padding: S.lg },
  mine: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: c.primary, borderRadius: R.box, borderBottomRightRadius: 6, paddingHorizontal: 14, paddingVertical: 10 },
  mineText: { ...type.body, color: c.onPrimary },
  theirs: { alignSelf: 'flex-start', maxWidth: '92%', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: R.box, borderTopLeftRadius: 6, padding: 14 },
  activity: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: S.sm, paddingHorizontal: S.lg, paddingTop: S.sm, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface },
  input: { flex: 1, maxHeight: 140, minHeight: 44, borderRadius: R.box, backgroundColor: c.raised, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 11, color: c.text, fontSize: 16 },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
}));
