import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useFamilyTree } from '@/contexts/FamilyTreeContext';
import { PersonNode } from './PersonNode';
import { Connections } from './Connections';
import { InlineInput } from './InlineInput';
import { EmptyState } from './EmptyState';
import { DragPreviewLine } from './DragPreviewLine';
import { ConnectionMenu } from './ConnectionMenu';

export function Canvas() {
  const {
    people, positions, rootId, selectPerson, inlineInput, mode, editSubMode, highlightedIds,
    dragConnection, updateDragConnection, endDragConnection, hideConnectionMenu, searchResults, isLoading,
  } = useFamilyTree();
  const hasSearchHighlight = searchResults.length > 0;
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [didPan, setDidPan] = useState(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const [lastTouchDist, setLastTouchDist] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Auto-center tree based on actual node bounds
  useEffect(() => {
    if (!containerRef.current || !rootId || positions.size === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    let minY = Infinity;
    positions.forEach(pos => {
      if (pos.y < minY) minY = pos.y;
    });

    // Place topmost node ~60px from top, centered horizontally
    const targetPanY = 60 - minY * scale;
    setPan({ x: rect.width / 2, y: targetPanY });
    if (!initialized) setInitialized(true);
  }, [rootId, positions.size, initialized]);

  // Re-center when first person is added
  useEffect(() => {
    if (containerRef.current && rootId && Object.keys(people).length === 1) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({ x: rect.width / 2, y: 60 });
    }
  }, [rootId, people]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (dragConnection) return; // Don't pan while dragging connection
    setIsPanning(true);
    setDidPan(false);
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }, [dragConnection]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragConnection) {
      // Convert screen coords to canvas coords
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const canvasX = (e.clientX - rect.left - pan.x) / scale;
        const canvasY = (e.clientY - rect.top - pan.y) / scale;
        updateDragConnection({ x: canvasX, y: canvasY });
      }
      return;
    }
    if (!isPanning) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) setDidPan(true);
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }, [isPanning, dragConnection, pan, scale, updateDragConnection]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    if (dragConnection) {
      endDragConnection();
    }
  }, [dragConnection, endDragConnection]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.95 : 1.05;
      setScale(prev => Math.min(Math.max(prev * delta, 0.2), 3));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setLastTouchDist(dist);
    } else if (e.touches.length === 1) {
      setIsPanning(true);
      setDidPan(false);
      lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDist !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist / lastTouchDist;
      setScale(prev => Math.min(Math.max(prev * delta, 0.2), 3));
      setLastTouchDist(dist);
    } else if (e.touches.length === 1 && isPanning) {
      const dx = e.touches[0].clientX - lastMouseRef.current.x;
      const dy = e.touches[0].clientY - lastMouseRef.current.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) setDidPan(true);
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, [isPanning, lastTouchDist]);

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
    setLastTouchDist(null);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (didPan) return;
    if (e.target === e.currentTarget || (e.target as HTMLElement).dataset?.canvas) {
      selectPerson(null);
      hideConnectionMenu();
    }
  }, [selectPerson, didPan, hideConnectionMenu]);

  const zoomIn = () => setScale(prev => Math.min(prev * 1.2, 3));
  const zoomOut = () => setScale(prev => Math.max(prev * 0.8, 0.2));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-[calc(100vh-3.5rem)] bg-canvas">
        <p className="text-muted-foreground font-body">Loading family tree...</p>
      </div>
    );
  }

  if (!rootId && Object.keys(people).length === 0 && !inlineInput) {
    return <EmptyState />;
  }

  const hasHighlight = (mode === 'view' && highlightedIds.size > 0) || hasSearchHighlight;

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden w-full h-[calc(100vh-3.5rem)] bg-canvas select-none"
      style={{ cursor: dragConnection ? 'crosshair' : (mode === 'edit' && editSubMode === 'move') ? 'default' : isPanning ? 'grabbing' : 'grab' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleCanvasClick}
    >
      <div
        data-canvas="true"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
      >
        <Connections />
        <DragPreviewLine />
        {Array.from(positions.entries()).map(([id, pos]) => (
          <PersonNode
            key={id}
            personId={id}
            position={pos}
            dimmed={hasHighlight && !highlightedIds.has(id) && !searchResults.includes(id)}
          />
        ))}
        {inlineInput && <InlineInput />}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 flex flex-col gap-2 z-30">
        <button
          onClick={(e) => { e.stopPropagation(); zoomIn(); }}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-card shadow-node flex items-center justify-center text-foreground text-lg font-body hover:shadow-node-hover transition-shadow"
        >
          +
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); zoomOut(); }}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-card shadow-node flex items-center justify-center text-foreground text-lg font-body hover:shadow-node-hover transition-shadow"
        >
          −
        </button>
      </div>

      {/* Connection menu overlay */}
      <ConnectionMenu />
    </div>
  );
}
