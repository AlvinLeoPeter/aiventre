import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { parseDay } from './model';

/**
 * "Is it done?" and "follow up?" reminders. When a job gets a finish date, one local notification is
 * booked on the phone for 10 AM that day — no server and no daily updating needed.
 */

const supported = Platform.OS !== 'web';
const REMIND_HOUR = 10;

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

let permission: boolean | null = null;

async function allowed(): Promise<boolean> {
  if (!supported) return false;
  if (permission !== null) return permission;
  const current = await Notifications.getPermissionsAsync();
  permission = current.granted || (await Notifications.requestPermissionsAsync()).granted;
  return permission;
}

export async function bookDoneCheck(machineName: string, jobLabel: string, due: string): Promise<string | null> {
  try {
    const when = parseDay(due);
    when.setHours(REMIND_HOUR, 0, 0, 0);
    if (when.getTime() <= Date.now() || !(await allowed())) return null;
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: `${machineName}: is it done?`,
        body: `${jobLabel} was due today. Tap to mark it done or add a day.`,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
    });
  } catch {
    return null; // A missed reminder must never break saving a job.
  }
}

/** A nudge on the morning a buyer is due a follow-up. */
export async function bookFollowUp(company: string, day: string): Promise<string | null> {
  try {
    const when = parseDay(day);
    when.setHours(REMIND_HOUR, 0, 0, 0);
    if (when.getTime() <= Date.now() || !(await allowed())) return null;
    return await Notifications.scheduleNotificationAsync({
      content: { title: `Follow up with ${company}?`, body: 'No reply yet. Aiventre can write a short follow-up for you.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
    });
  } catch {
    return null;
  }
}

export async function cancelReminder(id: string | null) {
  if (!supported || !id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Already fired or gone.
  }
}
