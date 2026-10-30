import { Platform, useWindowDimensions } from 'react-native';

/** Widest the app gets in a narrow browser window, and from what width the desktop layout takes over. */
export const PHONE_WIDTH = 560;
export const DESKTOP_FROM = 1024;

/**
 * True in a computer's browser window wide enough for the desktop layout: a sidebar instead of
 * the bottom bar, and a dashboard instead of Today. Phones never get it.
 */
/**
 * A full-screen page of its own (a chat, say) on the desktop layout: see-through so the glow
 * shows, and a readable column in the middle rather than edge to edge.
 */
export const WIDE_PAGE = { backgroundColor: 'transparent', width: '100%', maxWidth: 880, alignSelf: 'center' } as const;

export function useWide() {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= DESKTOP_FROM;
}
