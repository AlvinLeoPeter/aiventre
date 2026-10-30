import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, type ScrollViewInstance, Text, TextInput, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Markdown } from '@/components/chat';
import { Link, Press, tap } from '@/components/ui';
import { useAIReady } from '@/lib/auth';
import { CHAT_EDGE, choosePhoto, type PickedDrawing, takePhoto } from '@/lib/drawing';
import { askExpert, type ExpertEntry, newExpertChat, useExpert } from '@/lib/expert';
import { getData } from '@/lib/store';
import { useWide, WIDE_PAGE } from '@/lib/layout';
import { makeStyles, R, S, type, useTheme } from '@/lib/theme';

const SUGGESTIONS = [
  'Speed and feed for a Ø10 carbide end mill in EN8 on my VMC?',
  'Which insert grade should I use for turning SS304, and why?',
  'I’m getting chatter while boring a long hole. What do I try first?',
  'How do I hold ±0.01 mm on a bore across a batch of 500?',
];

/** A photo the owner sent. Old previews can vanish when the phone clears its cache. */
function SentPhoto({ uri }: { uri: string }) {
  const s = useStyles();
  const [gone, setGone] = useState(false);
  if (gone) return <Text style={s.mineText}>📷 Photo</Text>;
  return <Image source={{ uri }} style={s.sentPhoto} onError={() => setGone(true)} />;
}

function Message({ entry }: { entry: ExpertEntry }) {
  const { c } = useTheme();
  const s = useStyles();
  if (entry.role === 'user')
    return (
      <View style={s.mine}>
        {!!entry.photo && <SentPhoto uri={entry.photo} />}
        {!!entry.text && <Text style={s.mineText}>{entry.text}</Text>}
      </View>
    );
  if (entry.role === 'activity')
    return (
      <View style={s.activity}>
        <Ionicons name="search-outline" size={14} color={c.faint} />
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

/** Ask anything about machines, tools, materials and alarms — with a photo if it helps. */
export default function Expert() {
  const { c } = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const wide = useWide();
  const { machine } = useLocalSearchParams<{ machine?: string }>();
  const { log, busy, busySince } = useExpert();
  const aiReady = useAIReady();
  const [text, setText] = useState(() => {
    const m = getData().machines.find((x) => x.id === machine);
    return m ? `About my ${m.name} (${[m.type, m.details].filter(Boolean).join(', ')}): ` : '';
  });
  const [photo, setPhoto] = useState<PickedDrawing | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const scroll = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [busy]);
  const seconds = Math.max(0, Math.floor((now - busySince) / 1000));

  const canSend = (!!text.trim() || !!photo) && !busy && aiReady;
  const send = (m = text) => {
    if ((!m.trim() && !photo) || busy) return;
    setText('');
    setPhoto(null);
    askExpert(m, photo);
  };
  const pick = async (how: (edge: number) => Promise<PickedDrawing | null>) => {
    setError('');
    try {
      const p = await how(CHAT_EDGE);
      if (p) setPhoto(p);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <KeyboardAvoidingView style={[s.screen, wide && WIDE_PAGE]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[s.header, { paddingTop: insets.top + S.sm }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={12} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
        <Text style={s.title}>Machine expert</Text>
        {log.length > 0 && !busy ? <Link label="New chat" onPress={newExpertChat} /> : <View style={{ width: 26 }} />}
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
            <Text style={s.heading}>Ask about any machine, tool or job</Text>
            <Text style={s.body}>
              Speeds and feeds, insert grades, materials, tolerances, alarms, G-code, maintenance. Send a photo of a worn tool, a bad
              finish or an alarm screen. It knows your machines and answers in English, Tamil or Hindi.
            </Text>
            {!aiReady && <Text style={[s.body, { color: c.idle }]}>Sign in or add the access code first: My shop.</Text>}
            {SUGGESTIONS.map((q) => (
              <Press key={q} onPress={() => send(q)} style={s.suggestion} scale={0.98} disabled={busy || !aiReady}>
                <Text style={s.answer}>{q}</Text>
              </Press>
            ))}
            <Text style={s.meta}>For electrical faults, crashes or leaks, stop the machine and call your service engineer first.</Text>
          </View>
        ) : (
          log.map((e, i) => <Message key={i} entry={e} />)
        )}
        {busy && (
          <View style={s.activity}>
            <ActivityIndicator size="small" color={c.muted} />
            <Text style={s.meta}>
              Thinking… {seconds}s{seconds > 20 ? ' · looking things up can take a minute' : ''}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={[s.composer, { paddingBottom: insets.bottom + S.sm }]}>
        {!!error && <Text style={[s.meta, { color: c.idle }]}>{error}</Text>}
        {photo && (
          <View style={s.attached}>
            {photo.preview ? <Image source={{ uri: photo.preview }} style={s.thumb} /> : <View style={s.thumb} />}
            <Text style={[s.meta, { flex: 1 }]}>Photo added — ask about it, or just send</Text>
            <Link label="Remove" onPress={() => setPhoto(null)} />
          </View>
        )}
        <View style={s.row}>
          <Pressable accessibilityRole="button" accessibilityLabel="Take a photo" hitSlop={8} onPress={() => pick(takePhoto)} style={s.icon}>
            <Ionicons name="camera-outline" size={22} color={c.muted} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Choose a photo" hitSlop={8} onPress={() => pick(choosePhoto)} style={s.icon}>
            <Ionicons name="image-outline" size={22} color={c.muted} />
          </Pressable>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Ask about a machine, tool or part…"
            placeholderTextColor={c.faint}
            selectionColor={c.text}
            multiline
            style={s.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            disabled={!canSend}
            onPress={() => {
              tap();
              send();
            }}
            style={[s.send, !canSend && { opacity: 0.35 }]}>
            <Ionicons name="arrow-up" size={20} color={c.onPrimary} />
          </Pressable>
        </View>
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
  mine: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: c.primary, borderRadius: R.box, borderBottomRightRadius: 6, paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  mineText: { ...type.body, color: c.onPrimary },
  sentPhoto: { width: 200, height: 150, borderRadius: R.control },
  theirs: { alignSelf: 'flex-start', maxWidth: '92%', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: R.box, borderTopLeftRadius: 6, padding: 14 },
  activity: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4 },
  composer: { gap: S.sm, paddingHorizontal: S.lg, paddingTop: S.sm, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: S.xs },
  icon: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  attached: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  thumb: { width: 44, height: 44, borderRadius: R.control, backgroundColor: c.raised },
  input: { flex: 1, maxHeight: 140, minHeight: 44, borderRadius: R.box, backgroundColor: c.raised, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 11, color: c.text, fontSize: 16 },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
}));
