import React, { useRef, useState, useEffect } from 'react';
import { useFamilyTree } from '@/contexts/FamilyTreeContext';
import { Position, InlineInputState } from '@/types/family';

interface PersonNodeProps {
  personId: string;
  position: Position;
  dimmed: boolean;
}

export function PersonNode({ personId, position, dimmed }: PersonNodeProps) {
  const {
    people, mode, editSubMode, selectedId, selectPerson, startInlineInput, hasChildren,
    getPartnerOf, getParentsOf, startDragConnection, updateDragConnection, endDragConnection,
    showConnectionMenu, positions, dragConnection, moveNode, saveNodePosition,
  } = useFamilyTree();
  const nodeRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const [isDraggingNode, setIsDraggingNode] = useState(false);

  const person = people[personId];

  // Move mode drag effect - must be before early return
  useEffect(() => {
    if (!isDraggingNode) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const canvas = document.querySelector('[data-canvas="true"]');
      if (!canvas) return;
      const transform = window.getComputedStyle(canvas).transform;
      let scale = 1;
      if (transform && transform !== 'none') {
        const values = transform.match(/matrix\(([^)]+)\)/);
        if (values) scale = parseFloat(values[1].split(',')[0]);
      }
      const dx = (e.clientX - dragStartRef.current.x) / scale;
      const dy = (e.clientY - dragStartRef.current.y) / scale;
      moveNode(personId, {
        x: dragStartRef.current.posX + dx,
        y: dragStartRef.current.posY + dy,
      });
    };
    const handleMouseUp = () => {
      setIsDraggingNode(false);
      if (dragStartRef.current) {
        const dx = Math.abs(dragStartRef.current.posX - (positions.get(personId)?.x ?? 0));
        const dy = Math.abs(dragStartRef.current.posY - (positions.get(personId)?.y ?? 0));
        if (dx > 5 || dy > 5) {
          // Auto-save position to DB
          const pos = positions.get(personId);
          if (pos) {
            saveNodePosition(personId, pos);
          }
        }
      }
      dragStartRef.current = null;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingNode, personId, moveNode]);

  if (!person) return null;

  const isSelected = selectedId === personId;
  const isMale = person.gender === 'male';
  const partner = getPartnerOf(personId);
  const hasPart = !!partner;
  const hasKids = hasChildren(personId);
  const parents = getParentsOf(personId);
  const hasFather = parents.some(p => p.gender === 'male');
  const hasMother = parents.some(p => p.gender === 'female');

  const initials = person.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Move mode: drag node to reposition
  const handleMoveMouseDown = (e: React.MouseEvent) => {
    if (editSubMode !== 'move') return;
    e.stopPropagation();
    e.preventDefault();
    dragStartRef.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y };
    setIsDraggingNode(true);
  };



  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editSubMode === 'move') return;
    selectPerson(personId);
  };

  const handleAddFather = (e: React.MouseEvent) => {
    e.stopPropagation();
    startInlineInput({
      type: 'father',
      targetId: personId,
      position: { x: position.x, y: position.y - 70 },
      gender: 'male',
    });
  };

  const handleAddMother = (e: React.MouseEvent) => {
    e.stopPropagation();
    startInlineInput({
      type: 'mother',
      targetId: personId,
      position: { x: position.x, y: position.y - 70 },
      gender: 'female',
    });
  };

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    startInlineInput({
      type: 'child',
      targetId: personId,
      position: { x: position.x, y: position.y + 90 },
      gender: 'male',
    });
  };

  // Drag-to-connect anchor
  const handleConnectorMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    startDragConnection({
      sourceId: personId,
      sourcePos: { x: position.x, y: position.y },
      currentPos: { x: position.x, y: position.y },
    });
  };

  // If dragging and hovering this node, handle drop
  const handleDrop = (e: React.MouseEvent) => {
    if (dragConnection && dragConnection.sourceId !== personId) {
      e.stopPropagation();
      endDragConnection();
      showConnectionMenu({
        sourceId: dragConnection.sourceId,
        targetId: personId,
        position: { x: e.clientX, y: e.clientY },
      });
    }
  };

  const isMoving = mode === 'edit' && editSubMode === 'move';
  const showChildAdd = mode === 'edit' && editSubMode === 'normal' && (hasPart || hasKids);
  const isDragTarget = dragConnection && dragConnection.sourceId !== personId;

  return (
    <div
      className="absolute"
      style={{
        left: position.x - 40,
        top: position.y - 40,
        transition: isDraggingNode ? 'none' : 'opacity 0.3s ease, filter 0.3s ease, transform 0.4s cubic-bezier(0.25,0.1,0.25,1)',
        opacity: dimmed ? 0.15 : 1,
        filter: dimmed ? 'blur(0.5px)' : 'none',
        cursor: isMoving ? (isDraggingNode ? 'grabbing' : 'grab') : undefined,
      }}
    >
      {/* Add parent buttons (Edit mode) */}
      {mode === 'edit' && editSubMode === 'normal' && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex gap-2" onMouseDown={e => e.stopPropagation()}>
          {!hasFather && (
            <button
              onClick={handleAddFather}
              className="w-7 h-7 rounded-full bg-male-node text-xs font-body font-bold shadow-node hover:shadow-node-hover hover:scale-110 transition-all duration-200 flex items-center justify-center"
              title="Add Father"
            >
              ♂
            </button>
          )}
          {!hasMother && (
            <button
              onClick={handleAddMother}
              className="w-7 h-7 rounded-full bg-female-node text-xs font-body font-bold shadow-node hover:shadow-node-hover hover:scale-110 transition-all duration-200 flex items-center justify-center"
              title="Add Mother"
            >
              ♀
            </button>
          )}
        </div>
      )}

      {/* Circle node */}
      <div
        onClick={handleClick}
        onMouseDown={isMoving ? handleMoveMouseDown : undefined}
        onMouseUp={handleDrop}
        className={`relative w-20 h-20 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 ${
          isMale ? 'bg-male-node' : 'bg-female-node'
        } ${isSelected ? 'glow-selected scale-105' : 'shadow-node hover:shadow-node-hover'} ${
          isDragTarget ? 'ring-2 ring-accent-purple ring-offset-2' : ''
        }`}
        style={{
          outline: `1px solid ${isMale ? 'hsl(200 80% 85%)' : 'hsl(340 80% 90%)'}`,
          outlineOffset: '-1px',
        }}
      >
        {person.photoUrl ? (
          <img
            src={person.photoUrl}
            alt={person.name}
            className="w-full h-full rounded-full object-cover"
            style={{ outline: '1px solid rgba(0,0,0,0.08)', outlineOffset: '-1px' }}
          />
        ) : (
          <span className="text-lg font-body font-semibold text-foreground select-none">
            {initials}
          </span>
        )}

        {/* Camera icon (Edit mode) */}
        {mode === 'edit' && editSubMode === 'normal' && (
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/4 w-6 h-6 rounded-full bg-card shadow-node flex items-center justify-center text-xs cursor-pointer hover:scale-110 transition-transform"
            onClick={(e) => {
              e.stopPropagation();
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = async (ev) => {
                const file = (ev.target as HTMLInputElement).files?.[0];
                if (file) {
                  const ext = file.name.split('.').pop() || 'jpg';
                  const filePath = `${personId}.${ext}`;
                  const { supabase } = await import('@/integrations/supabase/client');
                  const { error } = await supabase.storage
                    .from('photos')
                    .upload(filePath, file, { upsert: true });
                  if (error) {
                    console.error('Photo upload error:', error);
                    return;
                  }
                  const { data: urlData } = supabase.storage
                    .from('photos')
                    .getPublicUrl(filePath);
                  const publicUrl = urlData.publicUrl + '?t=' + Date.now();
                  const event = new CustomEvent('photo-upload', { detail: { personId, url: publicUrl } });
                  window.dispatchEvent(event);
                }
              };
              input.click();
            }}
          >
            📷
          </div>
        )}

        {/* Drag connector anchor (Edit mode) */}
        {mode === 'edit' && editSubMode === 'normal' && !dragConnection && (
          <div
            className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-accent-purple border-2 border-card cursor-crosshair hover:scale-125 transition-transform opacity-0 hover:opacity-100 group-hover:opacity-100"
            style={{ opacity: 0.6 }}
            onMouseDown={handleConnectorMouseDown}
            title="Drag to connect"
          />
        )}
      </div>

      {/* Name */}
      <p className="text-center text-xs font-body font-semibold text-foreground mt-2 max-w-24 truncate select-none"
         style={{ letterSpacing: '-0.01em' }}>
        {person.name}
      </p>

      {/* Add child button */}
      {showChildAdd && (
        <div className="flex justify-center mt-1" onMouseDown={e => e.stopPropagation()}>
          <button
            onClick={handleAddChild}
            className="w-6 h-6 rounded-full bg-accent-purple text-primary-foreground text-xs font-bold shadow-node hover:shadow-node-hover hover:scale-125 transition-all duration-200 flex items-center justify-center"
            title="Add Child"
          >
            +
          </button>
        </div>
      )}

    </div>
  );
}
