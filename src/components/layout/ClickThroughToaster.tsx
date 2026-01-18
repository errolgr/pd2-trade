import React, { useEffect, useRef } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { useClickThrough } from '@/hooks/useClickThrough';
import { ToasterProps } from 'sonner';

const TOAST_CONTAINER_ID = 'toast-container';

interface ClickThroughToasterProps extends ToasterProps {
  customPosition?: { x: number; y: number } | null;
}

export const ClickThroughToaster: React.FC<ClickThroughToasterProps> = ({ customPosition, ...props }) => {
  const { registerWindow, unregisterWindow, updateWindow } = useClickThrough();
  const containerRef = useRef<HTMLElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  const isRegisteredRef = useRef(false);
  const observedToastsRef = useRef<Set<HTMLElement>>(new Set());

  useEffect(() => {
    // Find all visible toast elements
    const findToastElements = (): HTMLElement[] => {
      // Sonner creates toast elements - try multiple strategies
      const toasts: HTMLElement[] = [];

      // Strategy 1: Look for Sonner's data attributes
      const sonnerToasts = document.querySelectorAll('[data-sonner-toast], [data-sonner-toast-wrapper]');
      sonnerToasts.forEach((el) => {
        if (el instanceof HTMLElement) {
          const style = window.getComputedStyle(el);
          if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              toasts.push(el);
            }
          }
        }
      });

      if (toasts.length > 0) return toasts;

      // Strategy 2: Look for elements with toast-related classes
      const classSelectors = ['[class*="sonner-toast"]', '[class*="toast"]', 'li[role="status"]', 'li[role="alert"]'];

      for (const selector of classSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          if (el instanceof HTMLElement) {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            // Check if it's positioned in bottom-right (where Sonner toasts appear)
            const isBottomRight = rect.bottom > window.innerHeight * 0.5 && rect.right > window.innerWidth * 0.5;
            if (
              isBottomRight &&
              style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              style.opacity !== '0' &&
              rect.width > 0 &&
              rect.height > 0
            ) {
              toasts.push(el);
            }
          }
        }
        if (toasts.length > 0) break;
      }

      // Strategy 3: Look for fixed positioned elements in bottom-right corner
      if (toasts.length === 0) {
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
          if (el instanceof HTMLElement) {
            const style = window.getComputedStyle(el);
            if (style.position === 'fixed') {
              const rect = el.getBoundingClientRect();
              // Check if it's in the bottom-right area and has reasonable size
              const isBottomRight = rect.bottom > window.innerHeight * 0.7 && rect.right > window.innerWidth * 0.7;
              if (isBottomRight && rect.width > 200 && rect.height > 50 && rect.width < 600 && rect.height < 1000) {
                // Check if it contains text or buttons (likely a toast)
                const hasText = el.textContent && el.textContent.trim().length > 0;
                const hasButtons = el.querySelector('button');
                if (hasText || hasButtons) {
                  toasts.push(el);
                }
              }
            }
          }
        }
      }

      return toasts;
    };

    // Calculate bounding box of all toast elements
    const calculateToastBounds = (
      toasts: HTMLElement[],
    ): { top: number; left: number; width: number; height: number } | null => {
      if (toasts.length === 0) return null;

      let minTop = Infinity;
      let minLeft = Infinity;
      let maxBottom = -Infinity;
      let maxRight = -Infinity;

      for (const toast of toasts) {
        const rect = toast.getBoundingClientRect();
        minTop = Math.min(minTop, rect.top);
        minLeft = Math.min(minLeft, rect.left);
        maxBottom = Math.max(maxBottom, rect.bottom);
        maxRight = Math.max(maxRight, rect.right);
      }

      // Add some padding around the toasts
      const padding = 10;
      return {
        top: Math.max(0, minTop - padding),
        left: Math.max(0, minLeft - padding),
        width: maxRight - minLeft + padding * 2,
        height: maxBottom - minTop + padding * 2,
      };
    };

    const updateToastContainer = () => {
      const toasts = findToastElements();
      const bounds = calculateToastBounds(toasts);

      if (bounds && toasts.length > 0) {
        const box = {
          id: TOAST_CONTAINER_ID,
          top: bounds.top,
          left: bounds.left,
          width: bounds.width,
          height: bounds.height,
        };

        // Set up or update ResizeObserver for all toast elements
        if (!resizeObserverRef.current) {
          resizeObserverRef.current = new ResizeObserver(() => {
            updateToastContainer();
          });
        }

        // Observe new toasts
        toasts.forEach((toast) => {
          if (!observedToastsRef.current.has(toast)) {
            resizeObserverRef.current?.observe(toast);
            observedToastsRef.current.add(toast);
          }
        });

        // Clean up observers for removed toasts
        observedToastsRef.current.forEach((observedToast) => {
          if (!toasts.includes(observedToast)) {
            resizeObserverRef.current?.unobserve(observedToast);
            observedToastsRef.current.delete(observedToast);
          }
        });

        if (isRegisteredRef.current) {
          updateWindow(TOAST_CONTAINER_ID, box);
        } else {
          registerWindow(TOAST_CONTAINER_ID, box);
          isRegisteredRef.current = true;
          containerRef.current = toasts[0]; // Store first toast as reference
          console.log('[ClickThroughToaster] Registered toast container:', box);
        }
      } else {
        // No toasts, unregister
        if (isRegisteredRef.current) {
          unregisterWindow(TOAST_CONTAINER_ID);
          isRegisteredRef.current = false;
          console.log('[ClickThroughToaster] Unregistered toast container');
        }
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
          resizeObserverRef.current = null;
        }
        observedToastsRef.current.clear();
        containerRef.current = null;
      }
    };

    // Initial check with a small delay to allow Sonner to render
    const initialTimeout = setTimeout(updateToastContainer, 100);

    // Set up MutationObserver to watch for toast additions/removals
    mutationObserverRef.current = new MutationObserver((mutations) => {
      // Only update if we see relevant changes
      let shouldUpdate = false;
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldUpdate = true;
          break;
        }
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          shouldUpdate = true;
          break;
        }
      }
      if (shouldUpdate) {
        // Debounce updates
        setTimeout(updateToastContainer, 50);
      }
    });

    // Observe the document body for changes (toasts are added/removed dynamically)
    mutationObserverRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    // No periodic check - rely on MutationObserver and ResizeObserver only

    return () => {
      clearTimeout(initialTimeout);
      if (mutationObserverRef.current) {
        mutationObserverRef.current.disconnect();
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (isRegisteredRef.current) {
        unregisterWindow(TOAST_CONTAINER_ID);
        isRegisteredRef.current = false;
      }
      containerRef.current = null;
    };
  }, [registerWindow, unregisterWindow, updateWindow]);

  // Apply custom positioning via CSS if provided
  useEffect(() => {
    // Apply CSS to override Sonner's default positioning with smooth transitions
    const styleId = 'toast-custom-position-style';
    let styleElement = document.getElementById(styleId);
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    if (!customPosition) {
      // Use default position (bottom-right of main layout)
      document.documentElement.style.removeProperty('--toast-custom-right');
      document.documentElement.style.removeProperty('--toast-custom-bottom');

      styleElement.textContent = `
        [data-sonner-toaster] {
          right: 16px !important;
          bottom: 16px !important;
          left: auto !important;
          top: auto !important;
          transition: right 0.3s ease-out, bottom 0.3s ease-out !important;
        }
      `;
    } else {
      // Calculate right and bottom values
      const right = window.innerWidth - customPosition.x;
      const bottom = window.innerHeight - customPosition.y;

      document.documentElement.style.setProperty('--toast-custom-right', `${right}px`);
      document.documentElement.style.setProperty('--toast-custom-bottom', `${bottom}px`);

      styleElement.textContent = `
        [data-sonner-toaster] {
          right: var(--toast-custom-right, 16px) !important;
          bottom: var(--toast-custom-bottom, 16px) !important;
          left: auto !important;
          top: auto !important;
          transition: right 0.3s ease-out, bottom 0.3s ease-out !important;
        }
      `;
    }
  }, [customPosition]);

  return <Toaster {...props} />;
};
