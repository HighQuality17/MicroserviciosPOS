import { useEffect } from 'react';

interface ScrollLockSnapshot {
  scrollY: number;
  htmlOverflow: string;
  htmlOverscrollBehavior: string;
  bodyOverflow: string;
  bodyPosition: string;
  bodyTop: string;
  bodyLeft: string;
  bodyRight: string;
  bodyWidth: string;
  bodyPaddingRight: string;
}

let activeLocks = 0;
let snapshot: ScrollLockSnapshot | null = null;

function acquireDocumentScrollLock() {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return () => undefined;
  }

  const html = document.documentElement;
  const body = document.body;

  if (activeLocks === 0) {
    const scrollY = window.scrollY;
    const scrollbarWidth = Math.max(
      0,
      window.innerWidth - document.documentElement.clientWidth,
    );

    snapshot = {
      scrollY,
      htmlOverflow: html.style.overflow,
      htmlOverscrollBehavior: html.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyPaddingRight: body.style.paddingRight,
    };

    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  activeLocks += 1;

  return () => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    activeLocks = Math.max(0, activeLocks - 1);

    if (activeLocks > 0 || snapshot === null) {
      return;
    }

    const html = document.documentElement;
    const body = document.body;
    const currentSnapshot = snapshot;

    html.style.overflow = currentSnapshot.htmlOverflow;
    html.style.overscrollBehavior = currentSnapshot.htmlOverscrollBehavior;
    body.style.overflow = currentSnapshot.bodyOverflow;
    body.style.position = currentSnapshot.bodyPosition;
    body.style.top = currentSnapshot.bodyTop;
    body.style.left = currentSnapshot.bodyLeft;
    body.style.right = currentSnapshot.bodyRight;
    body.style.width = currentSnapshot.bodyWidth;
    body.style.paddingRight = currentSnapshot.bodyPaddingRight;
    snapshot = null;
    window.scrollTo(0, currentSnapshot.scrollY);
  };
}

export function useDocumentScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) {
      return;
    }

    return acquireDocumentScrollLock();
  }, [active]);
}
