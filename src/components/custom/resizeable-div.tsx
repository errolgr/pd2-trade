import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ChevronDown} from "lucide-react";

interface ResizeableDivProps {
  children: React.ReactNode;
  width: number;
  height: number;
  onResize?: (width: number,  height: number) => void
  onMouseDown: (e: any) => void;
  onMouseUp: (e: any) => void;
}
export default function ResizableDiv({
 children,
 width,
 height,
 onResize,
  onMouseDown,
  onMouseUp
                                     }: ResizeableDivProps) {
  const [dimensions, setDimensions] = useState({ width, height });
  const dimensionsRef = useRef(dimensions);

  // Keep the ref in sync with the state.
  useEffect(() => {
    dimensionsRef.current = dimensions;
  }, [dimensions]);

  const resizableRef = useRef(null);

  const handleMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = dimensionsRef.current.width;
      const startHeight = dimensionsRef.current.height;

      const handleMouseMove = (e: MouseEvent) => {
        const newWidth = Math.max(startWidth + e.clientX - startX, 100); // minimum width
        const newHeight = Math.max(startHeight + e.clientY - startY, 100); // minimum height
        setDimensions({ width: newWidth, height: newHeight });
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        if (onResize) {
          // Use the ref to access the latest dimensions.
          onResize(dimensionsRef.current.width, dimensionsRef.current.height);
        }
        if (onMouseUp) {
          onMouseUp(e);
        }
      };

      if (onMouseDown) {
        onMouseDown(e);
      }

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [onResize, onMouseUp, onMouseDown],
  );

  return (
    <div
      ref={resizableRef}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {children}
      <ChevronDown
        onMouseDown={handleMouseDown}
        style={{
          transform: 'rotate(315deg)',
          position: 'absolute',
          right: 1,
          bottom: 1,
          width: '20px',
          height: '20px',
          cursor: 'nwse-resize',
        }}
      />
    </div>
  );
}