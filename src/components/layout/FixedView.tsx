import React, { useEffect, useRef, useState } from 'react';
import Draggable from 'react-draggable';
import { useClickThrough } from '@/hooks/useClickThrough';
import { useViewManager } from '@/hooks/useViewManager';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { isTauri } from '@tauri-apps/api/core';

interface FixedViewProps {
  viewId: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const FixedView: React.FC<FixedViewProps> = ({ viewId, children, className, style }) => {
  const { registerWindow, unregisterWindow, updateWindow, isDragging } = useClickThrough();
  const { getView, updateView } = useViewManager();
  const view = getView(viewId);
  const nodeRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [draggablePosition, setDraggablePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartPositionRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize position from customPosition or style
  useEffect(() => {
    if (view?.customPosition) {
      setPosition(view.customPosition);
      setDraggablePosition({ x: 0, y: 0 });
    } else if (style?.left !== undefined && style?.top !== undefined) {
      const x = typeof style.left === 'number' ? style.left : parseInt(String(style.left).replace('px', '')) || 0;
      const y = typeof style.top === 'number' ? style.top : parseInt(String(style.top).replace('px', '')) || 0;
      setPosition({ x, y });
      setDraggablePosition({ x: 0, y: 0 });
    }
  }, [view?.customPosition, style?.left, style?.top]);

  const handleDragStart = () => {
    // Capture the actual rendered position at drag start
    const startRect = nodeRef.current?.getBoundingClientRect();
    if (startRect) {
      dragStartPositionRef.current = { x: startRect.left, y: startRect.top };
    }
    isDragging(viewId, true);
  };

  const handleDragStop = (_e: any, data: { x: number; y: number }) => {
    isDragging(viewId, false);

    // Calculate the new position based on where dragging started + the drag offset
    let absoluteX = data.x;
    let absoluteY = data.y;

    if (dragStartPositionRef.current) {
      // Use the captured position at drag start
      absoluteX = dragStartPositionRef.current.x + data.x;
      absoluteY = dragStartPositionRef.current.y + data.y;
    } else if (nodeRef.current) {
      // Fallback: use current rect position
      const rect = nodeRef.current.getBoundingClientRect();
      absoluteX = rect.left + data.x;
      absoluteY = rect.top + data.y;
    } else if (position) {
      // Last resort fallback
      absoluteX = position.x + data.x;
      absoluteY = position.y + data.y;
    }

    // Clear the drag start position
    dragStartPositionRef.current = null;

    // Update position state and save to view manager
    setPosition({ x: absoluteX, y: absoluteY });
    updateView(viewId, {
      customPosition: { x: absoluteX, y: absoluteY },
    });
    setDraggablePosition({ x: 0, y: 0 });

    // Update window box position after drag
    if (nodeRef.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const rect = nodeRef.current?.getBoundingClientRect();
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
    }
  };

  // Register/unregister window box for click-through
  useEffect(() => {
    if (!nodeRef.current) {
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
  }, [viewId, position, registerWindow, unregisterWindow]);

  // Merge position with existing style
  const mergedStyle: React.CSSProperties = {
    ...style,
    ...(position
      ? {
          left: `${position.x}px`,
          top: `${position.y}px`,
        }
      : {}),
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      handle="[data-drag-handle]"
      position={draggablePosition}
      onStart={handleDragStart}
      onStop={handleDragStop}
      onDrag={(e, data) => {
        // Update draggable position during drag
        setDraggablePosition({ x: data.x, y: data.y });
      }}
    >
      <div ref={nodeRef}
        className={className}
        style={mergedStyle}>
        {children}
      </div>
    </Draggable>
  );
};
