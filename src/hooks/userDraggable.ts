import { useState, useEffect, useCallback } from 'react';

export function useDraggable(initialX = 0, initialY = 0) {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setDragging(true);
      setOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    },
    [position],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      setPosition({
        x: e.clientX - offset.x,
        y: e.clientY - offset.y,
      });
    };

    const handleMouseUp = () => setDragging(false);

    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, offset]);

  return {
    position,
    dragging,
    handleMouseDown,
    setPosition,
  };
}
