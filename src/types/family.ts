export type Gender = 'male' | 'female';
export type AppMode = 'edit' | 'view';
export type EditSubMode = 'normal' | 'move';
export type LayoutPreference = 'compact' | 'balanced' | 'wide';
export type RelationshipType = 'partner' | 'parent-child';

export interface Person {
  id: string;
  name: string;
  gender: Gender;
  dateOfBirth?: string;
  notes?: string;
  photoUrl?: string;
  createdAt: number;
}

export interface Relationship {
  id: string;
  type: RelationshipType;
  personA: string; // for parent-child: parent
  personB: string; // for parent-child: child
}

export interface Position {
  x: number;
  y: number;
}

export interface TreeNode {
  personId: string;
  partnerId?: string;
  children: TreeNode[];
}

export interface InlineInputState {
  type: 'father' | 'mother' | 'child' | 'first';
  targetId?: string;
  position: Position;
  gender: Gender;
}

export interface DragConnectionState {
  sourceId: string;
  sourcePos: Position;
  currentPos: Position;
}

export interface ConnectionMenuState {
  sourceId: string;
  targetId: string;
  position: Position;
}
