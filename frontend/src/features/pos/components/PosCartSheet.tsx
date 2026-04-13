import { type ReactNode, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/Button';

interface PosCartSheetProps {
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
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) =>
      !element.hasAttribute('disabled') &&
      element.getAttribute('aria-hidden') !== 'true' &&
      element.tabIndex !== -1,
  );
}

export function PosCartSheet({
  id,
  title,
  subtitle,
  open,
  onClose,
  children,
}: PosCartSheetProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const lockedScrollYRef = useRef(0);
  const onCloseRef = useRef(onClose);
  const initialFocusFrameRef = useRef<number | null>(null);
  const returnFocusFrameRef = useRef<number | null>(null);
  const titleId = useId();
  const subtitleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const isOpening = !wasOpenRef.current;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyLeft = document.body.style.left;
    const previousBodyRight = document.body.style.right;
    const previousBodyWidth = document.body.style.width;
    const previousBodyOverflow = document.body.style.overflow;

    lockedScrollYRef.current = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${lockedScrollYRef.current}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

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
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.left = previousBodyLeft;
      document.body.style.right = previousBodyRight;
      document.body.style.width = previousBodyWidth;
      document.body.style.overflow = previousBodyOverflow;
      window.scrollTo(0, lockedScrollYRef.current);
    };
  }, [open]);

  useEffect(() => {
    if (open || !wasOpenRef.current) {
      return;
    }

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

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 pointer-events-none sm:hidden">
      <div
        className="absolute inset-0 pointer-events-auto bg-[var(--overlay)] backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute inset-0 flex items-end justify-center pointer-events-none">
        <div
          id={id}
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={subtitle ? subtitleId : undefined}
          tabIndex={-1}
          className="pos-cart-sheet glass-panel-strong pointer-events-auto mx-auto grid min-h-0 w-full max-w-2xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-t-[1.85rem]"
        >
          <div className="shrink-0 px-4 pb-2 pt-3">
            <h2 id={titleId} className="sr-only">
              {title}
            </h2>
            {subtitle ? (
              <p id={subtitleId} className="sr-only">
                {subtitle}
              </p>
            ) : null}

            <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-white/15" aria-hidden="true" />

            <div className="flex justify-end">
              <Button
                ref={closeButtonRef}
                type="button"
                variant="ghost"
                onClick={onClose}
                aria-label="Cerrar carrito"
                className="min-h-11 rounded-2xl px-3"
              >
                <X size={18} />
              </Button>
            </div>
          </div>

          <div ref={bodyRef} className="pos-cart-sheet__body grid h-full min-h-0 overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
