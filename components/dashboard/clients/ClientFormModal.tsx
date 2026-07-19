'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { saveCustomer } from '@/lib/dashboard/clients.actions';
import { useIsMobile } from '@/components/dashboard/calendar/useIsMobile';

const field = 'flex flex-col gap-1.5';
const label = 'text-ink-secondary text-sm font-semibold';

export interface ClientFormValue {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
}

export function ClientFormModal({
  client,
  onClose,
  onSaved,
}: {
  client: ClientFormValue | null;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const t = useTranslations('dashboard.clients');
  const te = useTranslations('dashboard.clients.errors');
  const tc = useTranslations('dashboard.actions');
  const isMobile = useIsMobile();

  const [fullName, setFullName] = useState(client?.fullName ?? '');
  const [email, setEmail] = useState(client?.email ?? '');
  const [phone, setPhone] = useState(client?.phone ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setLoading(true);
    const res = await saveCustomer({ id: client?.id, fullName, email, phone });
    setLoading(false);
    if (res.ok) onSaved(res.id);
    else setError(te(['nameRequired', 'contactRequired'].includes(res.error) ? res.error : 'generic'));
  }

  return (
    <Modal open onClose={onClose} side={isMobile ? 'bottom' : 'center'} label={client ? t('form.editTitle') : t('form.createTitle')} className="max-w-md">
      <ModalHeader title={client ? t('form.editTitle') : t('form.createTitle')} onClose={onClose} closeLabel={tc('close')} />
      <div className="flex flex-col gap-4 p-5">
        <label className={field}>
          <span className={label}>{t('form.name')}</span>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t('form.namePlaceholder')} />
        </label>
        <label className={field}>
          <span className={label}>{t('form.email')}</span>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className={field}>
          <span className={label}>{t('form.phone')}</span>
          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        {error && <p className="text-warning text-sm">{error}</p>}
        <Button onClick={submit} loading={loading} disabled={!fullName.trim()}>
          {loading ? tc('saving') : tc('save')}
        </Button>
      </div>
    </Modal>
  );
}
