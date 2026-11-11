import { useEffect, useState, type ReactNode } from 'react';
import { Button, type ButtonProps } from '../ui';

/** Ação crítica em 2 toques: o primeiro arma, o segundo confirma (3s de janela). */
export function ConfirmButton({ onConfirm, children, confirmLabel = 'Toque de novo para confirmar', ...rest }: ButtonProps & { onConfirm: () => void; confirmLabel?: ReactNode }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <Button
      {...rest}
      variant={armed ? 'danger' : rest.variant}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}
