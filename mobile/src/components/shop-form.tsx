import { useState } from 'react';

import type { Shop } from '@/lib/model';
import { updateShop, useData } from '@/lib/store';

import { Button } from './ui';

/**
 * Editing part of the shop profile on one settings screen: a copy to type into, saved
 * with one button. When the profile changes elsewhere (the AI, a restore, sync), the copy
 * starts again from the new one; `key` changes with it so list fields refill too.
 */
export function useShopForm() {
  const shop = useData().shop!;
  const [form, setForm] = useState<Shop>(shop);
  const [base, setBase] = useState(shop);
  if (base !== shop) {
    setBase(shop);
    setForm(shop);
  }
  const [saved, setSaved] = useState(false);
  const changed = JSON.stringify(form) !== JSON.stringify(shop);
  return {
    form,
    changed,
    saved,
    key: JSON.stringify(base),
    patch: (p: Partial<Shop>) => setForm((f) => ({ ...f, ...p })),
    save: () => {
      updateShop({ ...form, name: form.name.trim() });
      setSaved(true);
    },
  };
}

export function SaveButton({ f }: { f: ReturnType<typeof useShopForm> }) {
  const done = f.saved && !f.changed;
  return <Button label={done ? 'Saved' : 'Save'} icon={done ? 'checkmark' : undefined} disabled={!f.changed || !f.form.name.trim()} onPress={f.save} />;
}
