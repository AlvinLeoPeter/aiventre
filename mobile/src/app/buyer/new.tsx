import { useState } from 'react';
import { Text } from 'react-native';
import { router, Stack } from 'expo-router';

import { Button, Field, Screen } from '@/components/ui';
import { addLeads, useData } from '@/lib/store';
import { checkLeads } from '@/lib/verify';
import { makeStyles, type } from '@/lib/theme';

/** A buyer you already know, added by hand. */
export default function NewBuyer() {
  const s = useStyles();
  const data = useData();
  const [f, setF] = useState({ company: '', city: '', phone: '', email: '', website: '', whyFit: '' });
  const [error, setError] = useState('');
  const bind = (k: keyof typeof f) => ({ value: f[k], onChangeText: (v: string) => setF({ ...f, [k]: v }) });

  return (
    <Screen padTop={false}>
      <Stack.Screen options={{ title: 'Add a buyer' }} />
      <Field label="Company" placeholder="e.g. Kirloskar Pumps" autoFocus {...bind('company')} />
      <Field label="City" placeholder="e.g. Pune" {...bind('city')} />
      <Field label="Phone" keyboardType="phone-pad" {...bind('phone')} />
      <Field label="Email" keyboardType="email-address" autoCapitalize="none" {...bind('email')} />
      <Field label="Website" autoCapitalize="none" {...bind('website')} />
      <Field label="What might they buy from you?" placeholder="e.g. pump housings, flanges" {...bind('whyFit')} />
      {!!error && <Text style={s.error}>{error}</Text>}
      <Button
        label="Add buyer"
        disabled={!f.company.trim()}
        onPress={() => {
          const trimmed = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim()])) as typeof f;
          const { added, ids } = addLeads('', [trimmed]);
          if (!added) return setError(`${trimmed.company} is already on your list${trimmed.company.toLowerCase() === data.shop?.name.toLowerCase() ? ' (that’s your own shop)' : ''}.`);
          if (trimmed.website) checkLeads(ids);
          router.replace({ pathname: '/buyer/[id]', params: { id: ids[0] } });
        }}
      />
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  error: { ...type.body, color: c.idle },
}));
