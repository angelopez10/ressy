'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { requestAdminCode, verifyAdminCode } from '@/lib/admin/actions';
import { Button } from '@/components/ui/Button';

/**
 * Formulario del step-up. Pide el código al montar y lo verifica.
 *
 * El input es de 6 dígitos con `inputMode numeric` y `autoComplete one-time-code`
 * para que el autofill del SO lo levante del mail.
 */
export function AccessForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [requested, setRequested] = useState(false);

  // Un solo pedido automático al entrar; los reenvíos son manuales.
  useEffect(() => {
    if (requested) return;
    setRequested(true);
    void requestAdminCode().then((res) => {
      if (res.ok) setNotice('Te mandamos un código al email.');
      else setError(res.error);
    });
  }, [requested]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await verifyAdminCode({ code });
      if (res.ok) {
        router.push('/admin');
        router.refresh();
      } else {
        setError(res.error);
        setCode('');
      }
    });
  }

  function resend() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await requestAdminCode();
      if (res.ok) setNotice('Listo, te mandamos otro código.');
      else setError(res.error);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label htmlFor="admin-otp" className="sr-only">
        Código de 6 dígitos
      </label>
      <input
        id="admin-otp"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        placeholder="000000"
        aria-invalid={error ? true : undefined}
        className="rounded-input border-border text-ink focus:border-accent w-full border px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] outline-none"
      />

      {error ? (
        <p role="alert" className="text-small text-warning font-semibold">
          {error}
        </p>
      ) : null}
      {notice && !error ? <p className="text-small text-ink-secondary">{notice}</p> : null}

      <Button type="submit" loading={pending} disabled={code.length !== 6}>
        Entrar al panel
      </Button>

      <button
        type="button"
        onClick={resend}
        disabled={pending}
        className="text-small text-ink-secondary hover:text-ink font-semibold disabled:opacity-60"
      >
        Reenviar código
      </button>
    </form>
  );
}
