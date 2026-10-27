import { Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { makeStyles, type, useTheme } from '@/lib/theme';

/* Just enough formatting for the AI's replies: paragraphs, bullet and numbered lists, **bold** and [links](url). */
function Inline({ text, style }: { text: string; style: object }) {
  const { c } = useTheme();
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g);
  return (
    <Text style={style}>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) return <Text key={i} style={{ fontWeight: '600' }}>{p.slice(2, -2)}</Text>;
        const link = p.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
        if (link)
          return (
            <Text key={i} style={{ color: c.text, textDecorationLine: 'underline' }} onPress={() => WebBrowser.openBrowserAsync(link[2]).catch(() => {})}>
              {link[1]}
            </Text>
          );
        return p;
      })}
    </Text>
  );
}

export function Markdown({ text }: { text: string }) {
  const s = useStyles();
  const lines = text.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim());
  return (
    <View style={{ gap: 6 }}>
      {lines.map((line, i) => {
        const item = line.match(/^\s*([-*•]|\d+[.)])\s+(.*)$/);
        const heading = line.match(/^#{1,6}\s+(.*)$/);
        if (item)
          return (
            <View key={i} style={{ flexDirection: 'row', gap: 6 }}>
              <Text style={s.answer}>{/\d/.test(item[1]) ? item[1] : '•'}</Text>
              <Inline text={item[2]} style={[s.answer, { flex: 1 }]} />
            </View>
          );
        return <Inline key={i} text={heading ? `**${heading[1]}**` : line} style={s.answer} />;
      })}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  answer: { ...type.body, color: c.text },
}));
