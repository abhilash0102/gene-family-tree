import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Person, Gender, AppMode, EditSubMode, Position, TreeNode, InlineInputState,
  Relationship, RelationshipType, LayoutPreference,
  DragConnectionState, ConnectionMenuState,
} from '@/types/family';
import {
  LAYOUT_PARAMS, generateId,
  getPartner, getPartnerIds, getParentIds, getChildIds,
  hasPartnerRelationship, hasParentChildRelationship, wouldCreateCircularAncestry,
  buildTree, findRootId, getDescendantIds, computeGraphLayout,
} from '@/lib/familyTreeHelpers';

interface FamilyTreeContextType {
  people: Record<string, Person>;
  relationships: Relationship[];
  rootId: string | null;
  mode: AppMode;
  editSubMode: EditSubMode;
  selectedId: string | null;
  inlineInput: InlineInputState | null;
  positions: Map<string, Position>;
  tree: TreeNode | null;
  highlightedIds: Set<string>;
  layoutPreference: LayoutPreference;
  dragConnection: DragConnectionState | null;
  connectionMenu: ConnectionMenuState | null;
  searchQuery: string;
  searchResults: string[];
  isLoading: boolean;
  setMode: (mode: AppMode) => void;
  setEditSubMode: (subMode: EditSubMode) => void;
  selectPerson: (id: string | null) => void;
  addFirstPerson: (name: string, gender: Gender) => void;
  addFather: (childId: string, name: string) => void;
  addMother: (childId: string, name: string) => void;
  addChild: (parentId: string, name: string, gender: Gender) => void;
  addPartnerByName: (personId: string, name: string) => void;
  linkPartner: (personA: string, personB: string) => void;
  unlinkPartner: (personA: string, personB: string) => void;
  addParentChildRelationship: (parentId: string, childId: string) => void;
  deletePerson: (id: string) => void;
  updatePerson: (id: string, updates: Partial<Person>) => void;
  startInlineInput: (input: InlineInputState) => void;
  cancelInlineInput: () => void;
  hasChildren: (personId: string) => boolean;
  getPartnerOf: (personId: string) => Person | undefined;
  getParentsOf: (personId: string) => Person[];
  getChildrenOf: (personId: string) => Person[];
  setLayoutPreference: (pref: LayoutPreference) => void;
  startDragConnection: (state: DragConnectionState) => void;
  updateDragConnection: (pos: Position) => void;
  endDragConnection: () => void;
  showConnectionMenu: (state: ConnectionMenuState) => void;
  hideConnectionMenu: () => void;
  canConnect: (sourceId: string, targetId: string, type: RelationshipType, direction?: 'parent' | 'child') => boolean;
  getAllPeopleExcept: (excludeIds: string[]) => Person[];
  moveNode: (id: string, pos: Position) => void;
  saveNodePosition: (id: string, pos: Position) => void;
  resetPositions: () => void;
  setSearchQuery: (query: string) => void;
}

const FamilyTreeContext = createContext<FamilyTreeContextType | null>(null);

// Helper: convert DB row to Person
function dbToPerson(row: any): Person {
  return {
    id: row.id,
    name: row.name,
    gender: row.gender as Gender,
    dateOfBirth: row.date_of_birth ?? undefined,
    notes: row.notes ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    createdAt: Number(row.created_at),
  };
}

function dbToRelationship(row: any): Relationship {
  return {
    id: row.id,
    type: row.type as RelationshipType,
    personA: row.person_a,
    personB: row.person_b,
  };
}

export function FamilyTreeProvider({ children }: { children: React.ReactNode }) {
  const { treeOwnerId } = useAuth();
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [mode, setMode] = useState<AppMode>('edit');
  const [editSubMode, setEditSubMode] = useState<EditSubMode>('normal');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inlineInput, setInlineInput] = useState<InlineInputState | null>(null);
  const [layoutPreference, setLayoutPreference] = useState<LayoutPreference>('balanced');
  const [dragConnection, setDragConnection] = useState<DragConnectionState | null>(null);
  const [connectionMenu, setConnectionMenu] = useState<ConnectionMenuState | null>(null);
  const [manualPositions, setManualPositions] = useState<Record<string, Position>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load data from Supabase
  useEffect(() => {
    if (!treeOwnerId) {
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      const [{ data: pData }, { data: rData }, { data: posData }] = await Promise.all([
        supabase.from('people').select('*').eq('admin_id', treeOwnerId),
        supabase.from('relationships').select('*').eq('admin_id', treeOwnerId),
        supabase.from('node_positions').select('*').eq('admin_id', treeOwnerId),
      ]);

      const pMap: Record<string, Person> = {};
      (pData ?? []).forEach(row => {
        const p = dbToPerson(row);
        pMap[p.id] = p;
      });
      setPeople(pMap);
      setRelationships((rData ?? []).map(dbToRelationship));

      // Load saved positions
      const savedPos: Record<string, Position> = {};
      (posData ?? []).forEach((row: any) => {
        savedPos[row.person_id] = { x: row.x, y: row.y };
      });
      setManualPositions(savedPos);

      setIsLoading(false);
    };

    load();
  }, [treeOwnerId]);

  const params = LAYOUT_PARAMS[layoutPreference];
  const rootId = useMemo(() => findRootId(people, relationships), [people, relationships]);

  const tree = useMemo(() => {
    if (!rootId) return null;
    return buildTree(people, relationships, rootId);
  }, [people, relationships, rootId]);

  const positions = useMemo(() => {
    const ids = Object.keys(people);
    if (ids.length === 0) {
      const pos = new Map<string, Position>();
      for (const [id, manualPos] of Object.entries(manualPositions)) {
        if (people[id]) pos.set(id, manualPos);
      }
      return pos;
    }
    const pos = computeGraphLayout(people, relationships, params);
    // Always apply manual positions — override computed ones
    for (const [id, manualPos] of Object.entries(manualPositions)) {
      if (people[id]) pos.set(id, manualPos);
    }
    return pos;
  }, [params, people, relationships, manualPositions]);

  const highlightedIds = useMemo(() => {
    if (mode !== 'view' || !selectedId) return new Set<string>();
    return getDescendantIds(selectedId, people, relationships);
  }, [mode, selectedId, people, relationships]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return Object.values(people)
      .filter(p => p.name.toLowerCase().includes(q))
      .map(p => p.id);
  }, [searchQuery, people]);

  // --- DB mutation helpers ---
  const insertPerson = useCallback(async (person: Person) => {
    if (!treeOwnerId) { console.error('insertPerson: no treeOwnerId'); return; }
    console.log('insertPerson:', person.name, 'admin_id:', treeOwnerId);
    const { error } = await supabase.from('people').insert({
      id: person.id,
      admin_id: treeOwnerId,
      name: person.name,
      gender: person.gender,
      date_of_birth: person.dateOfBirth ?? null,
      notes: person.notes ?? null,
      photo_url: person.photoUrl ?? null,
      created_at: person.createdAt,
    });
    if (error) console.error('insertPerson error:', error);
    else console.log('insertPerson success:', person.name);
  }, [treeOwnerId]);

  const insertRelationship = useCallback(async (rel: Relationship) => {
    if (!treeOwnerId) { console.error('insertRelationship: no treeOwnerId'); return; }
    const { error } = await supabase.from('relationships').insert({
      id: rel.id,
      admin_id: treeOwnerId,
      type: rel.type,
      person_a: rel.personA,
      person_b: rel.personB,
    });
    if (error) console.error('insertRelationship error:', error);
  }, [treeOwnerId]);

  // --- Actions ---
  const addFirstPerson = useCallback(async (name: string, gender: Gender) => {
    const id = generateId();
    const person: Person = { id, name, gender, createdAt: Date.now() };
    setPeople({ [id]: person });
    setRelationships([]);
    setInlineInput(null);
    await insertPerson(person);
  }, [insertPerson]);

  const addFather = useCallback(async (childId: string, name: string) => {
    const fatherId = generateId();
    const father: Person = { id: fatherId, name, gender: 'male', createdAt: Date.now() };

    setPeople(prev => {
      if (!prev[childId]) return prev;
      return { ...prev, [fatherId]: father };
    });

    const newRels: Relationship[] = [];
    setRelationships(prev => {
      const existingFather = prev.find(r => r.type === 'parent-child' && r.personB === childId && people[r.personA]?.gender === 'male');
      if (existingFather) return prev;

      const pcRel: Relationship = { id: generateId(), type: 'parent-child', personA: fatherId, personB: childId };
      const result = [...prev, pcRel];
      newRels.push(pcRel);
      const existingMother = prev.find(r => r.type === 'parent-child' && r.personB === childId);
      if (existingMother && existingMother.personA !== fatherId) {
        const partnerRel: Relationship = { id: generateId(), type: 'partner', personA: fatherId, personB: existingMother.personA };
        result.push(partnerRel);
        newRels.push(partnerRel);
      }
      return result;
    });
    setInlineInput(null);

    await insertPerson(father);
    for (const rel of newRels) await insertRelationship(rel);
  }, [people, insertPerson, insertRelationship]);

  const addMother = useCallback(async (childId: string, name: string) => {
    const motherId = generateId();
    const mother: Person = { id: motherId, name, gender: 'female', createdAt: Date.now() };

    setPeople(prev => {
      if (!prev[childId]) return prev;
      return { ...prev, [motherId]: mother };
    });

    const newRels: Relationship[] = [];
    setRelationships(prev => {
      const existingMother = prev.find(r => r.type === 'parent-child' && r.personB === childId && people[r.personA]?.gender === 'female');
      if (existingMother) return prev;

      const pcRel: Relationship = { id: generateId(), type: 'parent-child', personA: motherId, personB: childId };
      const result = [...prev, pcRel];
      newRels.push(pcRel);
      const existingFather = prev.find(r => r.type === 'parent-child' && r.personB === childId);
      if (existingFather && existingFather.personA !== motherId) {
        const partnerRel: Relationship = { id: generateId(), type: 'partner', personA: motherId, personB: existingFather.personA };
        result.push(partnerRel);
        newRels.push(partnerRel);
      }
      return result;
    });
    setInlineInput(null);

    await insertPerson(mother);
    for (const rel of newRels) await insertRelationship(rel);
  }, [people, insertPerson, insertRelationship]);

  const addChild = useCallback(async (parentId: string, name: string, gender: Gender) => {
    const childId = generateId();
    const child: Person = { id: childId, name, gender, createdAt: Date.now() };

    setPeople(prev => {
      if (!prev[parentId]) return prev;
      return { ...prev, [childId]: child };
    });

    const newRels: Relationship[] = [];
    setRelationships(prev => {
      const pcRel: Relationship = { id: generateId(), type: 'parent-child', personA: parentId, personB: childId };
      const result = [...prev, pcRel];
      newRels.push(pcRel);
      const partnerId = getPartner(parentId, prev);
      if (partnerId) {
        const pcRel2: Relationship = { id: generateId(), type: 'parent-child', personA: partnerId, personB: childId };
        result.push(pcRel2);
        newRels.push(pcRel2);
      }
      return result;
    });
    setInlineInput(null);

    await insertPerson(child);
    for (const rel of newRels) await insertRelationship(rel);
  }, [insertPerson, insertRelationship]);

  const addPartnerByName = useCallback(async (personId: string, name: string) => {
    const person = people[personId];
    if (!person) return;
    const partnerId = generateId();
    const partnerGender: Gender = person.gender === 'male' ? 'female' : 'male';
    const partner: Person = { id: partnerId, name, gender: partnerGender, createdAt: Date.now() };
    const rel: Relationship = { id: generateId(), type: 'partner', personA: personId, personB: partnerId };

    setPeople(prev => ({ ...prev, [partnerId]: partner }));
    setRelationships(prev => [...prev, rel]);

    await insertPerson(partner);
    await insertRelationship(rel);
  }, [people, insertPerson, insertRelationship]);

  const linkPartner = useCallback(async (personA: string, personB: string) => {
    if (personA === personB) return;
    const rel: Relationship = { id: generateId(), type: 'partner', personA, personB };
    setRelationships(prev => {
      if (hasPartnerRelationship(personA, personB, prev)) return prev;
      return [...prev, rel];
    });
    await insertRelationship(rel);
  }, [insertRelationship]);

  const unlinkPartner = useCallback(async (personA: string, personB: string) => {
    setRelationships(prev => {
      const toRemove = prev.find(r =>
        r.type === 'partner' && ((r.personA === personA && r.personB === personB) || (r.personA === personB && r.personB === personA))
      );
      if (toRemove) {
        supabase.from('relationships').delete().eq('id', toRemove.id);
      }
      return prev.filter(r => r !== toRemove);
    });
  }, []);

  const addParentChildRelationship = useCallback(async (parentId: string, childId: string) => {
    if (parentId === childId) return;
    const rel: Relationship = { id: generateId(), type: 'parent-child', personA: parentId, personB: childId };
    setRelationships(prev => {
      if (hasParentChildRelationship(parentId, childId, prev)) return prev;
      if (wouldCreateCircularAncestry(parentId, childId, prev)) return prev;
      return [...prev, rel];
    });
    await insertRelationship(rel);
  }, [insertRelationship]);

  const deletePerson = useCallback(async (id: string) => {
    setPeople(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setRelationships(prev => prev.filter(r => r.personA !== id && r.personB !== id));
    if (selectedId === id) setSelectedId(null);
    // CASCADE on relationships handles DB side
    await supabase.from('people').delete().eq('id', id);
  }, [selectedId]);

  const updatePerson = useCallback(async (id: string, updates: Partial<Person>) => {
    setPeople(prev => {
      if (!prev[id]) return prev;
      return { ...prev, [id]: { ...prev[id], ...updates } };
    });

    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
    if (updates.dateOfBirth !== undefined) dbUpdates.date_of_birth = updates.dateOfBirth;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.photoUrl !== undefined) dbUpdates.photo_url = updates.photoUrl;
    if (Object.keys(dbUpdates).length > 0) {
      await supabase.from('people').update(dbUpdates).eq('id', id);
    }
  }, []);

  const selectPerson = useCallback((id: string | null) => setSelectedId(id), []);
  const startInlineInput = useCallback((input: InlineInputState) => setInlineInput(input), []);
  const cancelInlineInput = useCallback(() => setInlineInput(null), []);

  const hasChildrenFn = useCallback((personId: string): boolean => {
    return relationships.some(r => r.type === 'parent-child' && r.personA === personId);
  }, [relationships]);

  const getPartnerOf = useCallback((personId: string): Person | undefined => {
    const pid = getPartner(personId, relationships);
    return pid ? people[pid] : undefined;
  }, [people, relationships]);

  const getParentsOf = useCallback((personId: string): Person[] => {
    return getParentIds(personId, relationships).map(id => people[id]).filter(Boolean);
  }, [people, relationships]);

  const getChildrenOf = useCallback((personId: string): Person[] => {
    return getChildIds(personId, relationships).map(id => people[id]).filter(Boolean);
  }, [people, relationships]);

  const startDragConnection = useCallback((state: DragConnectionState) => setDragConnection(state), []);
  const updateDragConnection = useCallback((pos: Position) => {
    setDragConnection(prev => prev ? { ...prev, currentPos: pos } : null);
  }, []);
  const endDragConnection = useCallback(() => setDragConnection(null), []);
  const showConnectionMenu = useCallback((state: ConnectionMenuState) => setConnectionMenu(state), []);
  const hideConnectionMenu = useCallback(() => setConnectionMenu(null), []);

  const canConnect = useCallback((sourceId: string, targetId: string, type: RelationshipType, direction?: 'parent' | 'child'): boolean => {
    if (sourceId === targetId) return false;
    if (type === 'partner') return !hasPartnerRelationship(sourceId, targetId, relationships);
    if (type === 'parent-child') {
      const parentId = direction === 'child' ? sourceId : targetId;
      const childId = direction === 'child' ? targetId : sourceId;
      if (hasParentChildRelationship(parentId, childId, relationships)) return false;
      if (wouldCreateCircularAncestry(parentId, childId, relationships)) return false;
      return true;
    }
    return false;
  }, [relationships]);

  const getAllPeopleExcept = useCallback((excludeIds: string[]): Person[] => {
    const excludeSet = new Set(excludeIds);
    return Object.values(people).filter(p => !excludeSet.has(p.id));
  }, [people]);

  const moveNode = useCallback((id: string, pos: Position) => {
    setManualPositions(prev => ({ ...prev, [id]: pos }));
  }, []);

  const saveNodePosition = useCallback(async (id: string, pos: Position) => {
    if (!treeOwnerId) { console.error('saveNodePosition: no treeOwnerId'); return; }
    setManualPositions(prev => ({ ...prev, [id]: pos }));
    console.log('saveNodePosition:', id, pos);
    const { error } = await supabase.from('node_positions').upsert(
      { admin_id: treeOwnerId, person_id: id, x: pos.x, y: pos.y },
      { onConflict: 'admin_id,person_id' }
    );
    if (error) console.error('saveNodePosition error:', error);
    else console.log('saveNodePosition success:', id);
  }, [treeOwnerId]);

  const resetPositions = useCallback(async () => {
    setManualPositions({});
    if (treeOwnerId) {
      await supabase.from('node_positions').delete().eq('admin_id', treeOwnerId);
    }
  }, [treeOwnerId]);

  // Listen for photo uploads
  useEffect(() => {
    const handler = (e: Event) => {
      const { personId, url } = (e as CustomEvent).detail;
      updatePerson(personId, { photoUrl: url });
    };
    window.addEventListener('photo-upload', handler);
    return () => window.removeEventListener('photo-upload', handler);
  }, [updatePerson]);

  return (
    <FamilyTreeContext.Provider value={{
      people, relationships, rootId, mode, editSubMode, selectedId, inlineInput, positions, tree, highlightedIds,
      layoutPreference, dragConnection, connectionMenu, searchQuery, searchResults, isLoading,
      setMode, setEditSubMode, selectPerson,
      addFirstPerson, addFather, addMother, addChild,
      deletePerson, addPartnerByName, linkPartner, unlinkPartner, addParentChildRelationship,
      updatePerson, startInlineInput, cancelInlineInput,
      hasChildren: hasChildrenFn, getPartnerOf, getParentsOf, getChildrenOf,
      setLayoutPreference,
      startDragConnection, updateDragConnection, endDragConnection,
      showConnectionMenu, hideConnectionMenu,
      canConnect, getAllPeopleExcept,
      moveNode, saveNodePosition, resetPositions, setSearchQuery,
    }}>
      {children}
    </FamilyTreeContext.Provider>
  );
}

export function useFamilyTree() {
  const ctx = useContext(FamilyTreeContext);
  if (!ctx) throw new Error('useFamilyTree must be used within FamilyTreeProvider');
  return ctx;
}
