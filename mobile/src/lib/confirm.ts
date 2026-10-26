import { Alert, Platform } from 'react-native';

/** "Are you sure?" that works on phones and in the web preview. */
export function confirm(title: string, message: string, yes: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: yes, style: 'destructive', onPress: onYes },
  ]);
}
