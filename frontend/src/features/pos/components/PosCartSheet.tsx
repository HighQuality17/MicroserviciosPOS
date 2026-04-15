import { type ReactNode } from 'react';
import { Sheet } from '@/components/Sheet';

interface PosCartSheetProps {
  id?: string;
  title: string;
  subtitle?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function PosCartSheet({
  id,
  title,
  subtitle,
  open,
  onClose,
  children,
}: PosCartSheetProps) {
  return (
    <Sheet
      id={id}
      title={title}
      subtitle={subtitle}
      open={open}
      onClose={onClose}
      className="pos-cart-sheet"
      bodyClassName="pos-cart-sheet__body"
      showHandle
      titleVisuallyHidden
      closeLabel="Cerrar carrito"
      mobileOnly
    >
      {children}
    </Sheet>
  );
}
