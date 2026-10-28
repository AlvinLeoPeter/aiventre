import { useState } from 'react';
import { Image, Text, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Box, Button, Chip, Field, Label, Link, ListField, Screen, Section, Segmented } from '@/components/ui';
import { choosePhoto, takePhoto } from '@/lib/drawing';
import { validGstin } from '@/lib/invoice';
import { deliveryRecord, RECORD_MIN_JOBS, type Shop } from '@/lib/model';
import { addPhoto, KIND_LABEL, MAX_PHOTOS, PHOTO_EDGE, type PhotoKind, removePhoto, updatePhoto, usePhotos } from '@/lib/photos';
import { shareProfile } from '@/lib/share';
import { updateShop, useData } from '@/lib/store';
import { trustSteps, UDYAM } from '@/lib/trust';
import { makeStyles, R, S, type, useTheme } from '@/lib/theme';

const INSTRUMENTS = ['Vernier caliper', 'Micrometer', 'Height gauge', 'Bore gauge', 'Thread gauges', 'Dial indicator', 'Surface plate', 'Surface roughness tester', 'CMM'];

/** What a buyer checks before trusting a new shop, filled in once and sent as the company profile. */
export default function TrustScreen() {
  const { c } = useTheme();
  const s = useStyles();
  const data = useData();
  const photos = usePhotos();
  const shop = data.shop!;
  const [gstin, setGstin] = useState(shop.gstin ?? '');
  const [udyam, setUdyam] = useState(shop.udyam ?? '');
  const [address, setAddress] = useState(shop.address ?? '');
  const [kind, setKind] = useState<PhotoKind>('machine');
  const [error, setError] = useState('');
  const record = deliveryRecord(data.jobs);

  const save = (patch: Partial<Shop>) => updateShop({ ...shop, ...patch });
  const steps = trustSteps(data, photos.length);
  const done = steps.filter((x) => x.done).length;

  const pick = async (how: typeof takePhoto) => {
    setError('');
    try {
      const p = await how(PHOTO_EDGE);
      if (p) addPhoto(p, kind);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const toggleInstrument = (name: string) => {
    const list = shop.inspection ?? [];
    save({ inspection: list.includes(name) ? list.filter((x) => x !== name) : [...list, name] });
  };

  return (
    <Screen padTop={false}>
      <Stack.Screen options={{ title: 'Trust pack' }} />
      <Text style={s.body}>
        A buyer giving work to a new shop wants proof it’s real and can deliver. Fill these in once — they all go on your company
        profile PDF.
      </Text>

      <Box>
        <View style={s.between}>
          <Text style={s.heading}>
            {done} of {steps.length} done
          </Text>
          <Text style={s.meta}>{done === steps.length ? 'Ready to impress' : 'Keep going'}</Text>
        </View>
        {steps.map((x) => (
          <View key={x.label} style={s.step}>
            <Ionicons name={x.done ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={x.done ? c.running : c.faint} />
            <View style={{ flex: 1 }}>
              <Text style={s.strong}>{x.label}</Text>
              <Text style={s.meta}>{x.why}</Text>
            </View>
          </View>
        ))}
      </Box>

      <Section title="Registration" />
      <Box>
        <Field
          label="GSTIN"
          value={gstin}
          onChangeText={(v) => setGstin(v.toUpperCase().replace(/\s/g, ''))}
          onBlur={() => save({ gstin })}
          autoCapitalize="characters"
          maxLength={15}
          hint={gstin && !validGstin(gstin) ? 'This doesn’t pass the GSTIN check — look for a typo.' : undefined}
        />
        <Field
          label="Udyam registration number"
          value={udyam}
          onChangeText={(v) => setUdyam(v.toUpperCase().replace(/\s/g, ''))}
          onBlur={() => save({ udyam })}
          autoCapitalize="characters"
          placeholder="UDYAM-TN-02-0012345"
          hint={udyam && !UDYAM.test(udyam) ? 'It looks like UDYAM-TN-02-0012345.' : 'Free at udyamregistration.gov.in if you don’t have one.'}
        />
        <Field label="Shop address" value={address} onChangeText={setAddress} onBlur={() => save({ address })} placeholder="e.g. Plot 12, SIDCO Industrial Estate, Ambattur" />
      </Box>

      <Section title={`Photos · ${photos.length}/${MAX_PHOTOS}`} />
      {photos.map((p) => (
        <Box key={p.id} style={s.photoRow}>
          <Image source={{ uri: `data:image/jpeg;base64,${p.data}` }} style={s.photo} accessibilityLabel={p.caption || KIND_LABEL[p.kind]} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={s.meta}>{KIND_LABEL[p.kind]}</Text>
            <TextInput
              value={p.caption}
              onChangeText={(caption) => updatePhoto(p.id, { caption })}
              placeholder="Caption, e.g. Haas VMC, 850 mm"
              placeholderTextColor={c.faint}
              selectionColor={c.text}
              style={s.caption}
              accessibilityLabel="Photo caption"
            />
            <Link label="Remove" onPress={() => removePhoto(p.id)} />
          </View>
        </Box>
      ))}
      {photos.length < MAX_PHOTOS && (
        <Box>
          <Segmented
            options={(Object.keys(KIND_LABEL) as PhotoKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))}
            value={kind}
            onChange={setKind}
          />
          <View style={s.row}>
            <Button label="Take photo" icon="camera-outline" small flex onPress={() => pick(takePhoto)} />
            <Button label="From gallery" icon="image-outline" kind="secondary" small flex onPress={() => pick(choosePhoto)} />
          </View>
          <Text style={s.meta}>Bright and clear: the whole machine, a clean shop floor, a finished part next to a vernier.</Text>
          {!!error && <Text style={[s.meta, { color: c.idle }]}>{error}</Text>}
        </Box>
      )}

      <Section title="Quality" />
      <Box>
        <Label>Measuring instruments you have</Label>
        <View style={s.chips}>
          {[...new Set([...INSTRUMENTS, ...(shop.inspection ?? [])])].map((name) => (
            <Chip key={name} label={name} selected={shop.inspection?.includes(name)} onPress={() => toggleInstrument(name)} />
          ))}
        </View>
        <ListField
          key={(shop.inspection ?? []).join('|')}
          label="Add sizes or others"
          placeholder="e.g. Micrometer 0–25 mm, Bore gauge 18–35 mm"
          value={(shop.inspection ?? []).filter((x) => !INSTRUMENTS.includes(x))}
          onChange={(extra) => save({ inspection: [...(shop.inspection ?? []).filter((x) => INSTRUMENTS.includes(x)), ...extra] })}
        />
      </Box>

      <Section title="Customers you’ve served" />
      <Box>
        <ListField
          label="Company names, one per line"
          placeholder={'e.g. Ashok Auto Components, Ambattur\nPump maker, Coimbatore'}
          hint="Only names they’re happy for you to share."
          lines
          value={shop.customers}
          onChange={(customers) => save({ customers })}
        />
      </Box>

      <Section title="On-time record" />
      <Box>
        {record.enough ? (
          <>
            <Text style={s.big}>{Math.round(record.share * 100)}%</Text>
            <Text style={s.body}>
              {record.onTime} of {record.jobs} jobs finished by the date planned when they started (last year). Pressing “+1 day” counts as
              late, so this is honest.
            </Text>
          </>
        ) : (
          <Text style={s.body}>
            Builds itself as you mark jobs done: {record.jobs} of {RECORD_MIN_JOBS} so far. It shows on your profile once there are{' '}
            {RECORD_MIN_JOBS}.
          </Text>
        )}
      </Box>

      <Button
        label="Send my company profile (PDF)"
        icon="document-text-outline"
        onPress={() => {
          setError('');
          shareProfile(data, photos).catch((e) => setError((e as Error).message));
        }}
      />
      <Box>
        <Text style={s.strong}>What else wins trust</Text>
        <Text style={s.body}>• Offer a sample or a small trial batch first.</Text>
        <Text style={s.body}>• Invite their purchase or quality team to visit.</Text>
        <Text style={s.body}>• Put your shop on Google Maps with photos, and ask happy customers for a review.</Text>
        <Text style={s.body}>• Reply fast, and ask good questions about the drawing.</Text>
      </Box>
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  heading: { ...type.heading, color: c.text },
  strong: { ...type.strong, color: c.text },
  body: { ...type.body, color: c.text },
  meta: { ...type.meta, color: c.muted },
  big: { ...type.value, fontSize: 40, color: c.running },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  step: { flexDirection: 'row', gap: S.md, alignItems: 'flex-start' },
  row: { flexDirection: 'row', gap: S.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  photoRow: { flexDirection: 'row', gap: S.md, alignItems: 'flex-start' },
  photo: { width: 104, height: 78, borderRadius: R.control, backgroundColor: c.raised },
  caption: { minHeight: 40, borderWidth: 1, borderColor: c.border, borderRadius: R.control, paddingHorizontal: 10, color: c.text, fontSize: 15, backgroundColor: c.ground },
}));
