import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

const focusableSelector = 'button, input, select, textarea, a[href]';

export function useAccessibleModal(visible: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof document === 'undefined') return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    let dialog: HTMLElement | null = null;
    let dialogFrame = 0;
    let focusFrame = 0;

    const getFocusable = () => dialog
      ? Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((element) => (
          element.tabIndex >= 0
          && !element.hasAttribute('disabled')
          && element.getAttribute('aria-disabled') !== 'true'
        ))
      : [];

    const handleKeyDown = (event: KeyboardEvent) => {
      const activeDialog = dialog;
      if (!activeDialog) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) {
        event.preventDefault();
        activeDialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const focusOutsideDialog = !activeDialog.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || focusOutsideDialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || focusOutsideDialog)) {
        event.preventDefault();
        first.focus();
      }
    };

    const attachToDialog = () => {
      dialog = document.querySelector<HTMLElement>('[aria-modal="true"], [role="dialog"]');
      if (!dialog) {
        dialogFrame = window.requestAnimationFrame(attachToDialog);
        return;
      }

      document.addEventListener('keydown', handleKeyDown, true);
      focusFrame = window.requestAnimationFrame(() => getFocusable()[0]?.focus());
    };

    dialogFrame = window.requestAnimationFrame(attachToDialog);
    return () => {
      window.cancelAnimationFrame(dialogFrame);
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown, true);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [visible]);
}