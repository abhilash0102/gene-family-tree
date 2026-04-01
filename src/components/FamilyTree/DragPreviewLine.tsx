import { useFamilyTree } from '@/contexts/FamilyTreeContext';

export function DragPreviewLine() {
  const { dragConnection } = useFamilyTree();
  if (!dragConnection) return null;

  const { sourcePos, currentPos } = dragConnection;

  return (
    <svg
      className="absolute overflow-visible pointer-events-none z-20"
      style={{ left: 0, top: 0, width: 1, height: 1 }}
    >
      <line
        x1={sourcePos.x}
        y1={sourcePos.y}
        x2={currentPos.x}
        y2={currentPos.y}
        stroke="hsl(var(--accent-purple))"
        strokeWidth={2}
        strokeDasharray="8 4"
        opacity={0.6}
      />
      <circle
        cx={currentPos.x}
        cy={currentPos.y}
        r={6}
        fill="hsl(var(--accent-purple))"
        opacity={0.4}
      />
    </svg>
  );
}
