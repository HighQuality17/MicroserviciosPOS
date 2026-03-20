import { ReactNode, useEffect, useId, useRef } from 'react';
import { Button } from '@/components/Button';

interface ModalProps {
  title: string;
  subtitle?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({
  title,
  subtitle,
  open,
  onClose,
  children,
}: ModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const titleId = useId();
  const subtitleId = useId();

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) {
        const previouslyFocusedElement = previouslyFocusedElementRef.current;
        wasOpenRef.current = false;
        window.requestAnimationFrame(() => {
          previouslyFocusedElement?.focus();
        });
      }
      return;
    }

    wasOpenRef.current = true;
    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const frame = window.requestAnimationFrame(() => {
      const firstFocusable = bodyRef.current?.querySelector<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      (firstFocusable ?? closeButtonRef.current)?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 py-4 sm:py-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        className="glass-panel-strong w-full max-w-2xl max-h-[min(90vh,48rem)] overflow-y-auto rounded-[1.75rem] p-5 sm:rounded-[2rem] sm:p-6"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-2xl font-bold text-white">
              {title}
            </h2>
            {subtitle ? (
              <p id={subtitleId} className="mt-1 text-sm text-slate-400">
                {subtitle}
              </p>
            ) : null}
          </div>
          <Button ref={closeButtonRef} variant="ghost" className="shrink-0" onClick={onClose}>
            Cerrar
          </Button>
        </div>
        <div ref={bodyRef} className="min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
