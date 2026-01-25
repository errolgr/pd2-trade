import React from 'react';
import { useDiablo } from '@/hooks/useDiablo';

export const DiabloFrame: React.FC = () => {
  const { diabloRect, diabloRectRelative } = useDiablo();

  if (!diabloRect || !diabloRectRelative) {
    return null;
  }

  return (
    <div
      className="fixed pointer-events-none"
      style={{
        left: `${diabloRectRelative.x}px`,
        top: `${diabloRectRelative.y}px`,
        width: `${diabloRectRelative.width}px`,
        height: `${diabloRectRelative.height}px`,
        zIndex: 1, // Below other overlays but above main content
      }}
    >
      {/* Diablo frame content can go here if needed */}
    </div>
  );
};
