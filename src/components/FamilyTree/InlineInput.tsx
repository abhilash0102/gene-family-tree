import React, { useState, useRef, useEffect } from 'react';
import { useFamilyTree } from '@/contexts/FamilyTreeContext';

export function InlineInput() {
  const { inlineInput, addFirstPerson, addFather, addMother, addChild, cancelInlineInput } = useFamilyTree();
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inlineInput) {
      setName('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [inlineInput]);

  if (!inlineInput) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = name.trim();
    if (!trimmed) return;

    switch (inlineInput.type) {
      case 'first':
        addFirstPerson(trimmed, inlineInput.gender);
        break;
      case 'father':
        if (inlineInput.targetId) addFather(inlineInput.targetId, trimmed);
        break;
      case 'mother':
        if (inlineInput.targetId) addMother(inlineInput.targetId, trimmed);
        break;
      case 'child':
        if (inlineInput.targetId) addChild(inlineInput.targetId, trimmed, inlineInput.gender);
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      cancelInlineInput();
    }
  };

  return (
    <div
      className="absolute z-30"
      style={{
        left: inlineInput.position.x - 70,
        top: inlineInput.position.y - 16,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <form onSubmit={handleSubmit} className="flex gap-1">
        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Name..."
          className="w-32 px-3 py-1.5 rounded-lg bg-card shadow-node-hover text-sm font-body text-foreground border-none outline-none focus:ring-2 focus:ring-accent-purple"
        />
        <button
          type="submit"
          className="px-3 py-1.5 rounded-lg bg-accent-purple text-primary-foreground text-sm font-body font-semibold shadow-node hover:shadow-node-hover transition-all"
        >
          ✓
        </button>
      </form>
    </div>
  );
}
