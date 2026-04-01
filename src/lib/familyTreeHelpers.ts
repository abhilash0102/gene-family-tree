import { Person, Relationship, Position, TreeNode, LayoutPreference } from '@/types/family';

// --- Layout constants by preference ---
// Equilateral 60° triangle: partnerGap = 2 * genGap / √3
const eq60 = (genGap: number) => Math.round(2 * genGap / Math.sqrt(3));
export const LAYOUT_PARAMS: Record<LayoutPreference, { partnerGap: number; genGap: number; minNodeGap: number }> = {
  compact: { partnerGap: eq60(150), genGap: 150, minNodeGap: 140 },
  balanced: { partnerGap: eq60(200), genGap: 200, minNodeGap: 180 },
  wide: { partnerGap: eq60(280), genGap: 280, minNodeGap: 240 },
};

export function generateId(): string {
  return crypto.randomUUID();
}

// --- Relationship helpers ---
export function getPartnerIds(personId: string, relationships: Relationship[]): string[] {
  return relationships
    .filter(r => r.type === 'partner' && (r.personA === personId || r.personB === personId))
    .map(r => r.personA === personId ? r.personB : r.personA);
}

export function getPartner(personId: string, relationships: Relationship[]): string | undefined {
  return getPartnerIds(personId, relationships)[0];
}

export function getParentIds(childId: string, relationships: Relationship[]): string[] {
  return relationships
    .filter(r => r.type === 'parent-child' && r.personB === childId)
    .map(r => r.personA);
}

export function getChildIds(parentId: string, relationships: Relationship[]): string[] {
  return relationships
    .filter(r => r.type === 'parent-child' && r.personA === parentId)
    .map(r => r.personB);
}

export function hasPartnerRelationship(a: string, b: string, relationships: Relationship[]): boolean {
  return relationships.some(r =>
    r.type === 'partner' && ((r.personA === a && r.personB === b) || (r.personA === b && r.personB === a))
  );
}

export function hasParentChildRelationship(parent: string, child: string, relationships: Relationship[]): boolean {
  return relationships.some(r =>
    r.type === 'parent-child' && r.personA === parent && r.personB === child
  );
}

export function wouldCreateCircularAncestry(parentId: string, childId: string, relationships: Relationship[]): boolean {
  const visited = new Set<string>();
  const queue = [parentId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (id === childId) return true;
    if (visited.has(id)) continue;
    visited.add(id);
    for (const pid of getParentIds(id, relationships)) {
      if (!visited.has(pid)) queue.push(pid);
    }
  }
  return false;
}

// --- Ancestry tree model ---
// An inverted tree where "children" are parent-couples going upward
interface AncestryNode {
  leftId: string;         // male (or single person)
  rightId?: string;       // female partner
  leftAncestry?: AncestryNode;   // parents of leftId
  rightAncestry?: AncestryNode;  // parents of rightId
  children: AncestryNode[];      // children going downward
}

interface Extents {
  left: number;   // distance from center to leftmost point
  right: number;  // distance from center to rightmost point
}

function buildAncestryNode(
  personId: string,
  people: Record<string, Person>,
  relationships: Relationship[],
  visited: Set<string>,
): AncestryNode | null {
  if (visited.has(personId) || !people[personId]) return null;
  visited.add(personId);

  const partnerId = getPartner(personId, relationships);
  let leftId = personId;
  let rightId: string | undefined;

  if (partnerId && !visited.has(partnerId) && people[partnerId]) {
    visited.add(partnerId);
    rightId = partnerId;
    // Male on left, female on right
    if (people[personId].gender === 'female' && people[partnerId].gender === 'male') {
      leftId = partnerId;
      rightId = personId;
    }
  }

  // Parents of left member (ancestry going up)
  const leftParents = getParentIds(leftId, relationships).filter(pid => !visited.has(pid) && people[pid]);
  let leftAncestry: AncestryNode | undefined;
  if (leftParents.length > 0) {
    const node = buildAncestryNode(leftParents[0], people, relationships, visited);
    if (node) leftAncestry = node;
  }

  // Parents of right member
  let rightAncestry: AncestryNode | undefined;
  if (rightId) {
    const rightParents = getParentIds(rightId, relationships).filter(pid => !visited.has(pid) && people[pid]);
    if (rightParents.length > 0) {
      const node = buildAncestryNode(rightParents[0], people, relationships, visited);
      if (node) rightAncestry = node;
    }
  }

  // Children going downward
  const childIdSet = new Set<string>();
  const memberIds = rightId ? [leftId, rightId] : [leftId];
  for (const mid of memberIds) {
    for (const cid of getChildIds(mid, relationships)) {
      if (!visited.has(cid) && people[cid]) childIdSet.add(cid);
    }
  }
  const children: AncestryNode[] = [];
  for (const cid of childIdSet) {
    const node = buildAncestryNode(cid, people, relationships, visited);
    if (node) children.push(node);
  }

  return { leftId, rightId, leftAncestry, rightAncestry, children };
}

function computeAncestryExtents(
  node: AncestryNode,
  params: typeof LAYOUT_PARAMS.balanced,
): Extents {
  const halfPg = node.rightId ? params.partnerGap / 2 : 0;
  const minHalf = params.minNodeGap / 2;

  // Base extents (just this couple/single)
  let baseLeft = Math.max(halfPg, minHalf);
  let baseRight = Math.max(halfPg, minHalf);

  // Compute ancestry extents (going upward)
  if (node.leftAncestry && node.rightAncestry) {
    const le = computeAncestryExtents(node.leftAncestry, params);
    const re = computeAncestryExtents(node.rightAncestry, params);

    // Left ancestry centered above left member (at -halfPg from center)
    // Right ancestry centered above right member (at +halfPg from center)
    // Check if inner edges overlap
    const leftInnerEdge = -halfPg + le.right;
    const rightInnerEdge = halfPg - re.left;

    if (leftInnerEdge + params.minNodeGap > rightInnerEdge) {
      // Overlap! Push ancestries apart
      const needed = le.right + re.left + params.minNodeGap;
      const leftCenter = -needed / 2;
      const rightCenter = needed / 2;
      baseLeft = Math.max(baseLeft, -leftCenter + le.left);
      baseRight = Math.max(baseRight, rightCenter + re.right);
    } else {
      baseLeft = Math.max(baseLeft, halfPg + le.left);
      baseRight = Math.max(baseRight, halfPg + re.right);
    }
  } else if (node.leftAncestry) {
    const le = computeAncestryExtents(node.leftAncestry, params);
    baseLeft = Math.max(baseLeft, halfPg + le.left);
    baseRight = Math.max(baseRight, le.right - halfPg, baseRight);
  } else if (node.rightAncestry) {
    const re = computeAncestryExtents(node.rightAncestry, params);
    baseLeft = Math.max(baseLeft, re.left - halfPg, baseLeft);
    baseRight = Math.max(baseRight, halfPg + re.right);
  }

  // Compute children extents (going downward)
  if (node.children.length > 0) {
    const childExtents = node.children.map(c => computeAncestryExtents(c, params));
    const childWidths = childExtents.map(e => e.left + e.right);
    const totalChildWidth = childWidths.reduce((a, b) => a + b, 0)
      + (node.children.length - 1) * params.minNodeGap;
    baseLeft = Math.max(baseLeft, totalChildWidth / 2);
    baseRight = Math.max(baseRight, totalChildWidth / 2);
  }

  return { left: baseLeft, right: baseRight };
}

function getAncestryCenter(
  node: AncestryNode,
  params: typeof LAYOUT_PARAMS.balanced,
): { leftCenter: number; rightCenter: number } {
  const halfPg = node.rightId ? params.partnerGap / 2 : 0;

  if (node.leftAncestry && node.rightAncestry) {
    const le = computeAncestryExtents(node.leftAncestry, params);
    const re = computeAncestryExtents(node.rightAncestry, params);

    const leftInnerEdge = -halfPg + le.right;
    const rightInnerEdge = halfPg - re.left;

    if (leftInnerEdge + params.minNodeGap > rightInnerEdge) {
      const needed = le.right + re.left + params.minNodeGap;
      return { leftCenter: -needed / 2, rightCenter: needed / 2 };
    }
  }

  return { leftCenter: -halfPg, rightCenter: halfPg };
}

function positionAncestryNode(
  node: AncestryNode,
  cx: number,
  cy: number,
  positions: Map<string, Position>,
  params: typeof LAYOUT_PARAMS.balanced,
) {
  const halfPg = node.rightId ? params.partnerGap / 2 : 0;

  // Position this couple/single
  positions.set(node.leftId, { x: cx - halfPg, y: cy });
  if (node.rightId) {
    positions.set(node.rightId, { x: cx + halfPg, y: cy });
  }

  // Position ancestry (parents above)
  const parentY = cy - params.genGap;
  const centers = getAncestryCenter(node, params);

  if (node.leftAncestry) {
    positionAncestryNode(node.leftAncestry, cx + centers.leftCenter, parentY, positions, params);
  }
  if (node.rightAncestry) {
    positionAncestryNode(node.rightAncestry, cx + centers.rightCenter, parentY, positions, params);
  }

  // Position children below
  if (node.children.length > 0) {
    const childY = cy + params.genGap;
    const childExtents = node.children.map(c => computeAncestryExtents(c, params));
    const childWidths = childExtents.map(e => e.left + e.right);
    const totalChildWidth = childWidths.reduce((a, b) => a + b, 0)
      + (node.children.length - 1) * params.minNodeGap;

    let currentX = cx - totalChildWidth / 2;
    node.children.forEach((child, i) => {
      const childCx = currentX + childExtents[i].left;
      positionAncestryNode(child, childCx, childY, positions, params);
      currentX += childWidths[i] + params.minNodeGap;
    });
  }
}

function countAncestryDepth(
  personId: string,
  people: Record<string, Person>,
  relationships: Relationship[],
  visited: Set<string>,
): number {
  if (visited.has(personId) || !people[personId]) return 0;
  const seen = new Set(visited);
  seen.add(personId);

  const partnerId = getPartner(personId, relationships);
  if (partnerId && !seen.has(partnerId) && people[partnerId]) seen.add(partnerId);

  const memberIds = partnerId && !visited.has(partnerId) && people[partnerId]
    ? [personId, partnerId] : [personId];

  let maxDepth = 0;
  for (const mid of memberIds) {
    for (const pid of getParentIds(mid, relationships)) {
      if (!seen.has(pid) && people[pid]) {
        maxDepth = Math.max(maxDepth, 1 + countAncestryDepth(pid, people, relationships, seen));
      }
    }
  }
  return maxDepth;
}

// --- Main layout function ---
export function computeGraphLayout(
  people: Record<string, Person>,
  relationships: Relationship[],
  params: typeof LAYOUT_PARAMS.balanced,
): Map<string, Position> {
  const positions = new Map<string, Position>();
  const ids = Object.keys(people);
  if (ids.length === 0) return positions;

  // Find focus person: prefer leaf node (has parents, no children)
  const hasChildRel = new Set<string>();
  const hasParentRel = new Set<string>();
  relationships.forEach(r => {
    if (r.type === 'parent-child') {
      hasChildRel.add(r.personA);
      hasParentRel.add(r.personB);
    }
  });

  const focusId = ids.find(id => hasParentRel.has(id) && !hasChildRel.has(id))
    || ids.find(id => !hasParentRel.has(id))
    || ids[0];

  // Count depth above focus to set Y origin
  const depth = countAncestryDepth(focusId, people, relationships, new Set());

  // Build the ancestry tree from focus
  const visited = new Set<string>();
  const rootNode = buildAncestryNode(focusId, people, relationships, visited);

  if (rootNode) {
    const startY = depth * params.genGap;
    positionAncestryNode(rootNode, 0, startY, positions, params);
  }

  // Handle disconnected/unvisited nodes
  const unplaced = ids.filter(id => !positions.has(id));
  if (unplaced.length > 0) {
    let maxY = 0;
    positions.forEach(p => { if (p.y > maxY) maxY = p.y; });
    let sx = 0;
    for (const id of unplaced) {
      positions.set(id, { x: sx, y: maxY + params.genGap });
      sx += params.minNodeGap;
    }
  }

  return positions;
}

// Keep legacy functions for compatibility but they're no longer primary
export function buildTree(people: Record<string, Person>, relationships: Relationship[], rootId: string): TreeNode | null {
  if (!people[rootId]) return null;
  const visited = new Set<string>();

  function build(id: string): TreeNode {
    visited.add(id);
    const partnerId = getPartner(id, relationships);
    let effectivePartnerId: string | undefined;

    if (partnerId && !visited.has(partnerId) && people[partnerId]) {
      effectivePartnerId = partnerId;
      visited.add(partnerId);
    }

    const childIdSet = new Set<string>();
    const idsToCheck = [id];
    if (effectivePartnerId) idsToCheck.push(effectivePartnerId);

    for (const pid of idsToCheck) {
      for (const childId of getChildIds(pid, relationships)) {
        if (!visited.has(childId) && people[childId]) {
          childIdSet.add(childId);
        }
      }
    }

    return {
      personId: id,
      partnerId: effectivePartnerId,
      children: Array.from(childIdSet).map(cid => build(cid)),
    };
  }

  return build(rootId);
}

export function findRootId(people: Record<string, Person>, relationships: Relationship[]): string | null {
  const ids = Object.keys(people);
  if (ids.length === 0) return null;

  const hasParent = new Set<string>();
  relationships.forEach(r => {
    if (r.type === 'parent-child') hasParent.add(r.personB);
  });

  let current = ids.find(id => !hasParent.has(id)) || ids[0];

  const partnerId = getPartner(current, relationships);
  if (partnerId && people[partnerId] && people[partnerId].createdAt < people[current].createdAt) {
    current = partnerId;
  }

  return current;
}

export function getDescendantIds(personId: string, people: Record<string, Person>, relationships: Relationship[]): Set<string> {
  const result = new Set<string>();
  const queue = [personId];

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (result.has(id)) continue;
    result.add(id);

    const partnerId = getPartner(id, relationships);
    if (partnerId && !result.has(partnerId)) {
      result.add(partnerId);
      for (const childId of getChildIds(partnerId, relationships)) {
        if (!result.has(childId)) queue.push(childId);
      }
    }

    for (const childId of getChildIds(id, relationships)) {
      if (!result.has(childId)) queue.push(childId);
    }
  }

  return result;
}
