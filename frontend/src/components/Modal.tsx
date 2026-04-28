import { ReactNode, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { IconButton } from '@/components/IconButton';
import { useDocumentScrollLock } from '@/hooks/useDocumentScrollLock';

interface ModalProps {
  id?: string;
  title: string;
  subtitle?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
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
  size = 'md',
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const initialFocusFrameRef = useRef<number | null>(null);
  const returnFocusFrameRef = useRef<number | null>(null);
  const titleId = useId();
  const subtitleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useDocumentScrollLock(open);

  useEffect(() => {
    if (!open) return;

    const isOpening = !wasOpenRef.current;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
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

    if (isOpening) {
      wasOpenRef.current = true;
      previouslyFocusedElementRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;

      if (returnFocusFrameRef.current !== null) {
        window.cancelAnimationFrame(returnFocusFrameRef.current);
        returnFocusFrameRef.current = null;
      }

      initialFocusFrameRef.current = window.requestAnimationFrame(() => {
        initialFocusFrameRef.current = null;

        const activeElement =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        if (activeElement && dialogRef.current?.contains(activeElement)) {
          return;
        }

        const firstFocusable =
          getFocusableElements(bodyRef.current)[0] ?? closeButtonRef.current ?? dialogRef.current;
        firstFocusable?.focus();
      });
    }

    return () => {
      if (initialFocusFrameRef.current !== null) {
        window.cancelAnimationFrame(initialFocusFrameRef.current);
        initialFocusFrameRef.current = null;
      }
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open || !wasOpenRef.current) return;

    wasOpenRef.current = false;
    const previouslyFocusedElement = previouslyFocusedElementRef.current;
    previouslyFocusedElementRef.current = null;

    returnFocusFrameRef.current = window.requestAnimationFrame(() => {
      returnFocusFrameRef.current = null;
      if (previouslyFocusedElement?.isConnected) {
        previouslyFocusedElement.focus();
      }
    });

    return () => {
      if (returnFocusFrameRef.current !== null) {
        window.cancelAnimationFrame(returnFocusFrameRef.current);
        returnFocusFrameRef.current = null;
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center px-4 py-4 sm:py-8">
      <div
        id={id}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        tabIndex={-1}
        className="modal-shell w-full"
        data-size={size}
      >
        <div className="modal-header">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-2xl font-bold theme-text-strong">
              {title}
            </h2>
            {subtitle ? (
              <p id={subtitleId} className="mt-2 text-sm leading-6 theme-text-secondary">
                {subtitle}
              </p>
            ) : null}
          </div>
          <IconButton
            ref={closeButtonRef}
            variant="ghost"
            className="modal-close-button"
            icon={<X size={18} />}
            label="Cerrar modal"
            onClick={onClose}
          />
        </div>
        <div ref={bodyRef} className="modal-body min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
