import React, { useEffect, useState, useRef } from 'react';
import Draggable from 'react-draggable';
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';
import { useViewManager } from '@/hooks/useViewManager';
import { useClickThrough } from '@/hooks/useClickThrough';
import { useDiablo } from '@/hooks/useDiablo';
import { cn } from '@/lib/utils';

interface PanelViewProps {
  viewId: string;
  children: React.ReactNode;
  className?: string;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  resizable?: boolean;
  onClose?: () => void;
}

export const PanelView: React.FC<PanelViewProps> = ({
  viewId,
  children,
  className,
  defaultPosition,
  defaultSize,
  resizable = true,
  onClose,
}) => {
  const { getView, hideView, updateView } = useViewManager();
  const { registerWindow, unregisterWindow, updateWindow, isDragging } = useClickThrough();
  const { diabloRectRelative } = useDiablo();
  const view = getView(viewId);
  const [position, setPosition] = useState(defaultPosition || { x: 100, y: 100 });
  const [size, setSize] = useState(defaultSize || { width: 600, height: 400 });
  const [draggablePosition, setDraggablePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingState, setIsDraggingState] = useState(false);
  const nodeRef = React.useRef<HTMLDivElement>(null);
  const dragStartPositionRef = useRef<{ x: number; y: number } | null>(null);
  const initialDiabloRectRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const initialCustomPositionRef = useRef<{ x: number; y: number } | null>(null);

  const isVisible = view?.visible ?? false;
  const zIndex = view?.zIndex ?? 1000;

  // Track previous values to prevent unnecessary updates
  const prevCustomPositionRef = useRef<{ x: number; y: number } | null>(null);
  const prevCustomSizeRef = useRef<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    // Don't update position during drag
    if (!isDraggingState) {
      if (view?.customPosition) {
        // Only update if position actually changed
        const posChanged =
          !prevCustomPositionRef.current ||
          Math.abs(prevCustomPositionRef.current.x - view.customPosition.x) > 0.1 ||
          Math.abs(prevCustomPositionRef.current.y - view.customPosition.y) > 0.1;

        if (posChanged) {
          setPosition(view.customPosition);
          prevCustomPositionRef.current = view.customPosition;
        }
        setDraggablePosition({ x: 0, y: 0 });
        // Initialize references when using custom position
        if (diabloRectRelative && !initialDiabloRectRef.current) {
          initialDiabloRectRef.current = diabloRectRelative;
        }
        if (!initialCustomPositionRef.current) {
          initialCustomPositionRef.current = view.customPosition;
        }
      } else if (defaultPosition) {
        // Only update if position actually changed
        const posChanged =
          !prevCustomPositionRef.current ||
          Math.abs(prevCustomPositionRef.current.x - defaultPosition.x) > 0.1 ||
          Math.abs(prevCustomPositionRef.current.y - defaultPosition.y) > 0.1;

        if (posChanged) {
          setPosition(defaultPosition);
          prevCustomPositionRef.current = defaultPosition;
        }
        setDraggablePosition({ x: 0, y: 0 });
        // Initialize references for default positions (like over-diablo)
        if (diabloRectRelative && !initialDiabloRectRef.current) {
          initialDiabloRectRef.current = diabloRectRelative;
        }
        if (!initialCustomPositionRef.current) {
          initialCustomPositionRef.current = defaultPosition;
        }
      }
    }

    // Initialize size from persisted customSize or defaultSize
    if (view?.customSize) {
      // Only update if size actually changed
      const sizeChanged =
        !prevCustomSizeRef.current ||
        prevCustomSizeRef.current.width !== view.customSize.width ||
        prevCustomSizeRef.current.height !== view.customSize.height;

      if (sizeChanged) {
        // Use persisted size with minimum constraints
        const newSize = {
          width: Math.max(300, view.customSize.width),
          height: Math.max(200, view.customSize.height),
        };
        setSize(newSize);
        prevCustomSizeRef.current = newSize;
      }
    } else if (defaultSize) {
      // Only update if size actually changed
      const sizeChanged =
        !prevCustomSizeRef.current ||
        prevCustomSizeRef.current.width !== defaultSize.width ||
        prevCustomSizeRef.current.height !== defaultSize.height;

      if (sizeChanged) {
        setSize(defaultSize);
        prevCustomSizeRef.current = defaultSize;
      }
    }
  }, [
    isVisible,
    view?.customPosition?.x,
    view?.customPosition?.y,
    view?.customSize?.width,
    view?.customSize?.height,
    defaultPosition?.x,
    defaultPosition?.y,
    defaultSize?.width,
    defaultSize?.height,
    isDraggingState,
    diabloRectRelative,
  ]);

  const handleDragStart = () => {
    // Capture the actual rendered position at drag start
    const startRect = nodeRef.current?.getBoundingClientRect();
    if (startRect) {
      dragStartPositionRef.current = { x: startRect.left, y: startRect.top };
    }

    console.log('[PanelView] Drag start:', {
      viewId,
      position,
      defaultPosition,
      customPosition: view?.customPosition,
      nodeRect: startRect,
      dragStartPosition: dragStartPositionRef.current,
    });
    setIsDraggingState(true);
    isDragging(viewId, true);
  };

  const handleDragStop = (_e: any, data: { x: number; y: number }) => {
    console.log('[PanelView] Drag stop - initial data:', {
      viewId,
      dragData: { x: data.x, y: data.y },
      position,
      defaultPosition,
      customPosition: view?.customPosition,
      dragStartPosition: dragStartPositionRef.current,
    });

    setIsDraggingState(false);
    isDragging(viewId, false);

    // Reset initial references after drag so position is recalculated relative to new Diablo position
    if (diabloRectRelative) {
      initialDiabloRectRef.current = diabloRectRelative;
    }

    // Calculate the new position based on where dragging started + the drag offset
    // The drag offset (data.x, data.y) is relative to the drag start position
    let absoluteX = data.x;
    let absoluteY = data.y;

    if (dragStartPositionRef.current) {
      // Use the captured position at drag start
      absoluteX = dragStartPositionRef.current.x + data.x;
      absoluteY = dragStartPositionRef.current.y + data.y;

      console.log('[PanelView] Calculated from drag start position:', {
        dragStartPosition: dragStartPositionRef.current,
        dragOffset: { x: data.x, y: data.y },
        calculated: { x: absoluteX, y: absoluteY },
        position,
      });
    } else if (nodeRef.current) {
      // Fallback: use current rect position (shouldn't happen, but just in case)
      const rect = nodeRef.current.getBoundingClientRect();
      absoluteX = rect.left + data.x;
      absoluteY = rect.top + data.y;

      console.log('[PanelView] Calculated from current rect (fallback):', {
        rect: { left: rect.left, top: rect.top },
        dragOffset: { x: data.x, y: data.y },
        calculated: { x: absoluteX, y: absoluteY },
      });
    } else {
      // Last resort fallback
      absoluteX = position.x + data.x;
      absoluteY = position.y + data.y;
      console.log('[PanelView] Calculated from position (last resort):', {
        position,
        dragOffset: { x: data.x, y: data.y },
        calculated: { x: absoluteX, y: absoluteY },
      });
    }

    // Clear the drag start position
    dragStartPositionRef.current = null;

    // Get current rect before updating
    const rectBeforeUpdate = nodeRef.current ? nodeRef.current.getBoundingClientRect() : null;
    console.log('[PanelView] Before updateView - rect:', rectBeforeUpdate);

    // Save position to view manager
    updateView(viewId, {
      customPosition: { x: absoluteX, y: absoluteY },
      position: 'custom',
    });

    // Update initial custom position reference
    initialCustomPositionRef.current = { x: absoluteX, y: absoluteY };

    // Update window box position after drag
    if (nodeRef.current) {
      // Use requestAnimationFrame to ensure CSS position is updated before resetting transform
      // This prevents flicker by ensuring the element is at the new CSS position before removing the transform
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Reset draggable position to 0,0 so the CSS position takes effect
          // Double RAF ensures the CSS position update has been applied
          setDraggablePosition({ x: 0, y: 0 });

          const rect = nodeRef.current?.getBoundingClientRect();
          console.log('[PanelView] After updateView - rect:', {
            rect,
            savedPosition: { x: absoluteX, y: absoluteY },
            difference: rect
              ? {
                  x: rect.left - absoluteX,
                  y: rect.top - absoluteY,
                }
              : null,
          });

          if (rect) {
            updateWindow(viewId, {
              id: viewId,
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            });
          }
        });
      });
    } else {
      // Fallback if nodeRef is not available
      setDraggablePosition({ x: 0, y: 0 });
    }
  };

  const handleResize = (_e: React.SyntheticEvent, data: { size: { width: number; height: number } }) => {
    const newSize = {
      width: Math.max(300, data.size.width),
      height: Math.max(200, data.size.height),
    };
    setSize(newSize);
  };

  const handleResizeStop = (_e: React.SyntheticEvent, data: { size: { width: number; height: number } }) => {
    const newSize = {
      width: Math.max(300, data.size.width),
      height: Math.max(200, data.size.height),
    };
    setSize(newSize);

    // Save size to view manager
    updateView(viewId, {
      customSize: newSize,
    });

    // Update window box position after resize
    if (nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect();
      updateWindow(viewId, {
        id: viewId,
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      hideView(viewId);
    }
  };

  // Register/unregister window box for click-through
  useEffect(() => {
    if (!isVisible || !nodeRef.current) {
      if (!isVisible) {
        unregisterWindow(viewId);
      }
      return;
    }

    const updateWindowBox = () => {
      if (nodeRef.current) {
        const rect = nodeRef.current.getBoundingClientRect();
        const box = {
          id: viewId,
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        };
        registerWindow(viewId, box);
      }
    };

    // Initial registration
    updateWindowBox();

    // Update on resize
    const resizeObserver = new ResizeObserver(updateWindowBox);
    if (nodeRef.current) {
      resizeObserver.observe(nodeRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      unregisterWindow(viewId);
    };
  }, [isVisible, viewId, size, position, registerWindow, unregisterWindow]);

  // Reset draggable position when position changes (but not during drag)
  useEffect(() => {
    if (!isDraggingState && position) {
      setDraggablePosition({ x: 0, y: 0 });
    }
  }, [position, isDraggingState]);

  // Store initial Diablo rect and custom position when window becomes visible or position changes
  useEffect(() => {
    if (!isVisible || isDraggingState) {
      return;
    }

    // Store initial values when window first becomes visible or when custom position is set
    if (diabloRectRelative && !initialDiabloRectRef.current) {
      initialDiabloRectRef.current = diabloRectRelative;
    }

    if (view?.customPosition && !initialCustomPositionRef.current) {
      initialCustomPositionRef.current = view.customPosition;
    }
  }, [isVisible, isDraggingState, diabloRectRelative, view?.customPosition]);

  // Track previous diabloRectRelative to detect actual changes
  const prevDiabloRectRelativeRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  // Recalculate position relative to Diablo when diabloRectRelative changes (like toasts)
  useEffect(() => {
    if (!isVisible || !diabloRectRelative || isDraggingState) {
      return;
    }

    // Skip if this is a centered window (shouldn't move with Diablo)
    if (view?.position === 'centered' && !view?.customPosition) {
      return;
    }

    // Check if diabloRectRelative actually changed (not just reference)
    const prev = prevDiabloRectRelativeRef.current;
    const curr = diabloRectRelative;
    const diabloRectChanged =
      !prev || prev.x !== curr.x || prev.y !== curr.y || prev.width !== curr.width || prev.height !== curr.height;

    if (!diabloRectChanged && prevDiabloRectRelativeRef.current) {
      // Diablo rect didn't actually change, skip update
      return;
    }

    prevDiabloRectRelativeRef.current = { ...diabloRectRelative };

    // Recalculate positions based on relative position to Diablo
    // This applies to both custom positions (dragged windows) and over-diablo positions
    // If we don't have initial references yet, set them now
    if (!initialDiabloRectRef.current) {
      initialDiabloRectRef.current = diabloRectRelative;
    }
    if (!initialCustomPositionRef.current) {
      // Use custom position if available, otherwise use current position
      if (view?.customPosition) {
        initialCustomPositionRef.current = view.customPosition;
      } else if (position) {
        initialCustomPositionRef.current = position;
      } else {
        // Can't calculate offset without initial position
        return;
      }
    }

    // Recalculate if we have both initial references
    if (initialDiabloRectRef.current && initialCustomPositionRef.current) {
      // Calculate the offset from the initial Diablo position
      const offsetX = initialCustomPositionRef.current.x - initialDiabloRectRef.current.x;
      const offsetY = initialCustomPositionRef.current.y - initialDiabloRectRef.current.y;

      // Recalculate position based on current Diablo position + offset
      const newPos = {
        x: diabloRectRelative.x + offsetX,
        y: diabloRectRelative.y + offsetY,
      };

      // Only update if position actually changed
      const positionChanged = Math.abs(position.x - newPos.x) > 0.1 || Math.abs(position.y - newPos.y) > 0.1;

      if (positionChanged) {
        setPosition(newPos);

        // Update the saved custom position if it exists or if this is an over-diablo window
        // Only update if the custom position would actually change
        const currentCustomPos = view?.customPosition;
        const customPosChanged =
          !currentCustomPos ||
          Math.abs(currentCustomPos.x - newPos.x) > 0.1 ||
          Math.abs(currentCustomPos.y - newPos.y) > 0.1;

        if (
          customPosChanged &&
          (view?.customPosition || view?.position === 'custom' || view?.position === 'over-diablo')
        ) {
          updateView(viewId, {
            customPosition: newPos,
          });
        }
      }
    }
  }, [
    isVisible,
    diabloRectRelative?.x,
    diabloRectRelative?.y,
    diabloRectRelative?.width,
    diabloRectRelative?.height,
    isDraggingState,
    view?.customPosition?.x,
    view?.customPosition?.y,
    view?.position,
    viewId,
    updateView,
  ]);

  if (!isVisible) {
    return null;
  }

  const content = (
    <div
      className={cn(
        'bg-background border border-border rounded-none shadow-lg overflow-hidden h-full w-full',
        className,
      )}
    >
      <div className="w-full h-full overflow-auto">{children}</div>
    </div>
  );

  const resizableContent = resizable ? (
    <Resizable
      width={size.width}
      height={size.height}
      onResize={handleResize}
      onResizeStop={handleResizeStop}
      minConstraints={[300, 200]}
      resizeHandles={['se']}
    >
      <div style={{ width: size.width, height: size.height }}>{content}</div>
    </Resizable>
  ) : (
    <div style={{ width: size.width, height: size.height }}>{content}</div>
  );

  return (
    <Draggable
      nodeRef={nodeRef}
      handle="[data-drag-handle]"
      defaultPosition={{ x: 0, y: 0 }}
      position={draggablePosition}
      onStart={handleDragStart}
      onStop={handleDragStop}
      onDrag={(e, data) => {
        setDraggablePosition({ x: data.x, y: data.y });
      }}
    >
      <div
        ref={nodeRef}
        className="fixed"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex,
        }}
      >
        {resizableContent}
      </div>
    </Draggable>
  );
};
