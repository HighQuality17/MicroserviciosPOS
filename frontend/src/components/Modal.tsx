import { ReactNode, useEffect, useId, useRef } from 'react';
import { Button } from '@/components/Button';

interface ModalProps {
  id?: string;
  title: string;
  subtitle?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

const focusableSelector = [
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  '[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(container: HTMLElement | null) {
  if (!container) return [];

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) =>
      !element.hasAttribute('disabled') &&
      element.getAttribute('aria-hidden') !== 'true' &&
      element.tabIndex !== -1,
  );
}

export function Modal({
  id,
  title,
  subtitle,
  open,
  onClose,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
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
          if (previouslyFocusedElement?.isConnected) {
            previouslyFocusedElement.focus();
          }
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
      const firstFocusable =
        getFocusableElements(bodyRef.current)[0] ?? closeButtonRef.current ?? dialogRef.current;
      firstFocusable?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements(dialogRef.current);
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      const activeElement =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const focusInsideDialog =
        activeElement !== null && dialogRef.current?.contains(activeElement);

      if (event.shiftKey) {
        if (!focusInsideDialog || activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable.focus();
        }
        return;
      }

      if (!focusInsideDialog || activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
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
        id={id}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        tabIndex={-1}
        className="glass-panel-strong w-full max-w-2xl max-h-[min(90vh,48rem)] overflow-y-auto rounded-[1.75rem] p-5 sm:rounded-[2rem] sm:p-6"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-2xl font-bold text-white">
              {title}
            </h2>
            {subtitle ? (
              <p id={subtitleId} className="mt-1 text-sm text-slate-300">
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
