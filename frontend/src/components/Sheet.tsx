import { ReactNode, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { IconButton } from '@/components/IconButton';

interface SheetProps {
  id?: string;
  title: string;
  subtitle?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  showHandle?: boolean;
  titleVisuallyHidden?: boolean;
  closeLabel?: string;
  mobileOnly?: boolean;
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

export function Sheet({
  id,
  title,
  subtitle,
  open,
  onClose,
  children,
  className,
  bodyClassName,
  showHandle = false,
  titleVisuallyHidden = false,
  closeLabel = 'Cerrar panel',
  mobileOnly = false,
}: SheetProps) {
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
    <div className={clsx('fixed inset-0 z-40 pointer-events-none', mobileOnly && 'sm:hidden')}>
      <div
        className="sheet-backdrop absolute inset-0 pointer-events-auto"
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
          className={clsx(
            'sheet-shell pointer-events-auto mx-auto grid min-h-0 w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden',
            className,
          )}
          data-placement="bottom"
        >
          <div className="sheet-header">
            {showHandle ? <div className="sheet-handle" aria-hidden="true" /> : null}
            <div className="sheet-header__row">
              <div className="min-w-0">
                <h2 id={titleId} className={titleVisuallyHidden ? 'sr-only' : 'font-display text-xl font-bold theme-text-strong'}>
                  {title}
                </h2>
                {subtitle ? (
                  <p
                    id={subtitleId}
                    className={titleVisuallyHidden ? 'sr-only' : 'mt-2 text-sm leading-6 theme-text-secondary'}
                  >
                    {subtitle}
                  </p>
                ) : null}
              </div>
              <IconButton
                ref={closeButtonRef}
                type="button"
                variant="ghost"
                size="sm"
                icon={<X size={18} />}
                label={closeLabel}
                onClick={onClose}
              />
            </div>
          </div>

          <div ref={bodyRef} className={clsx('sheet-body grid h-full min-h-0 overflow-hidden', bodyClassName)}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
