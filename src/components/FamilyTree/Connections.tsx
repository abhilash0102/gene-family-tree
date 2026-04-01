import { useMemo, useState } from 'react';
import { useFamilyTree } from '@/contexts/FamilyTreeContext';

export function Connections() {
  const { relationships, positions, mode, highlightedIds } = useFamilyTree();
  const [hoveredPartner, setHoveredPartner] = useState<string | null>(null);

  const { partnerPaths, childPaths } = useMemo(() => {
    const partners: Array<{
      x1: number; y1: number; x2: number; y2: number;
      id: string; personAId: string; personBId: string;
    }> = [];
    const children: Array<{
      fromX: number; fromY: number; toX: number; toY: number;
      parentIds: string[]; childId: string;
    }> = [];

    const seenPartners = new Set<string>();

    // Build all partner connections from relationships
    for (const rel of relationships) {
      if (rel.type === 'partner') {
        const key = [rel.personA, rel.personB].sort().join('-');
        if (seenPartners.has(key)) continue;
        seenPartners.add(key);
        const pos1 = positions.get(rel.personA);
        const pos2 = positions.get(rel.personB);
        if (pos1 && pos2) {
          partners.push({
            x1: pos1.x, y1: pos1.y,
            x2: pos2.x, y2: pos2.y,
            id: key,
            personAId: rel.personA,
            personBId: rel.personB,
          });
        }
      }
    }

    // Build all parent-child connections from relationships
    // Group children by their parent set to compute midpoint from couple
    const childParentMap = new Map<string, string[]>();
    for (const rel of relationships) {
      if (rel.type === 'parent-child') {
        const existing = childParentMap.get(rel.personB) || [];
        existing.push(rel.personA);
        childParentMap.set(rel.personB, existing);
      }
    }

    for (const [childId, parentIds] of childParentMap) {
      const childPos = positions.get(childId);
      if (!childPos) continue;

      // Compute the "from" point: midpoint of all positioned parents
      const parentPositions = parentIds.map(pid => positions.get(pid)).filter(Boolean) as { x: number; y: number }[];
      if (parentPositions.length === 0) continue;

      const fromX = parentPositions.reduce((s, p) => s + p.x, 0) / parentPositions.length;
      const fromY = parentPositions.reduce((s, p) => s + p.y, 0) / parentPositions.length;

      children.push({
        fromX,
        fromY: fromY + 50,
        toX: childPos.x,
        toY: childPos.y - 50,
        parentIds,
        childId,
      });
    }

    return { partnerPaths: partners, childPaths: children };
  }, [relationships, positions]);

  const hasHighlight = mode === 'view' && highlightedIds.size > 0;

  function isHighlighted(ids: string[]): boolean {
    if (!hasHighlight) return true;
    return ids.some(id => highlightedIds.has(id));
  }

  return (
    <svg
      className="absolute overflow-visible pointer-events-none"
      style={{ left: 0, top: 0, width: 1, height: 1 }}
    >
      <defs>
        <filter id="partner-glow-hover" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="partner-glow-highlight" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Partner curved connections */}
      {partnerPaths.map(line => {
        const highlighted = isHighlighted([line.personAId, line.personBId]);
        const isHovered = hoveredPartner === line.id;
        const isGlowing = (hasHighlight && highlighted) || isHovered;

        const startX = line.x1 + 40;
        const startY = line.y1;
        const endX = line.x2 - 40;
        const endY = line.y2;
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        const curveDepth = Math.max(18, Math.abs(endX - startX) * 0.15);

        const path = `M ${startX} ${startY} C ${startX + 20} ${startY + curveDepth}, ${endX - 20} ${endY + curveDepth}, ${endX} ${endY}`;

        // Heart position at Bézier midpoint (t=0.5)
        const heartX = midX;
        const heartY = midY + curveDepth * 0.75;

        return (
          <g key={line.id}>
            {/* Invisible wider hit area for hover */}
            <path
              d={path}
              fill="none"
              stroke="transparent"
              strokeWidth={20}
              className="pointer-events-auto cursor-default"
              onMouseEnter={() => setHoveredPartner(line.id)}
              onMouseLeave={() => setHoveredPartner(null)}
            />
            <path
              d={path}
              fill="none"
              stroke={isGlowing && hasHighlight && highlighted
                ? 'hsl(270 70% 60%)'
                : 'hsl(340 80% 68%)'}
              strokeWidth={isGlowing ? 2.5 : 2}
              strokeDasharray="6 4"
              opacity={highlighted ? 1 : 0.15}
              filter={isGlowing ? (hasHighlight && highlighted ? 'url(#partner-glow-highlight)' : 'url(#partner-glow-hover)') : undefined}
              className="transition-all duration-300"
            />
            <text
              x={heartX}
              y={heartY + 5}
              textAnchor="middle"
              fontSize={isGlowing ? 16 : 14}
              opacity={highlighted ? 1 : 0.15}
              className="transition-all duration-300 select-none"
              fill={isGlowing && hasHighlight && highlighted ? 'hsl(270 70% 60%)' : undefined}
            >
              ♥
            </text>
          </g>
        );
      })}

      {/* Child connections */}
      {childPaths.map((conn, i) => {
        const highlighted = isHighlighted([...conn.parentIds, conn.childId]);
        const midY = (conn.fromY + conn.toY) / 2;
        const path = `M ${conn.fromX} ${conn.fromY} C ${conn.fromX} ${midY}, ${conn.toX} ${midY}, ${conn.toX} ${conn.toY}`;
        return (
          <path
            key={i}
            d={path}
            fill="none"
            stroke="hsl(var(--connection-line))"
            strokeWidth={2}
            opacity={highlighted ? 1 : 0.15}
            className="transition-opacity duration-300"
          />
        );
      })}
    </svg>
  );
}
