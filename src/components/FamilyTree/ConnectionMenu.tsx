import { useFamilyTree } from '@/contexts/FamilyTreeContext';
import { motion, AnimatePresence } from 'framer-motion';

export function ConnectionMenu() {
  const {
    connectionMenu, hideConnectionMenu, linkPartner,
    addParentChildRelationship, canConnect, people,
  } = useFamilyTree();

  if (!connectionMenu) return null;

  const { sourceId, targetId, position } = connectionMenu;
  const source = people[sourceId];
  const target = people[targetId];
  if (!source || !target) return null;

  const canPartner = canConnect(sourceId, targetId, 'partner');
  const canParent = canConnect(sourceId, targetId, 'parent-child', 'parent');
  const canChild = canConnect(sourceId, targetId, 'parent-child', 'child');

  const handlePartner = () => {
    linkPartner(sourceId, targetId);
    hideConnectionMenu();
  };

  const handleAddParent = () => {
    addParentChildRelationship(sourceId, targetId);
    hideConnectionMenu();
  };

  const handleAddChild = () => {
    addParentChildRelationship(targetId, sourceId);
    hideConnectionMenu();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed z-[60] bg-card rounded-xl shadow-node-hover p-2 min-w-[160px]"
        style={{ left: position.x, top: position.y }}
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        <p className="px-3 py-1.5 text-xs font-body text-muted-foreground border-b border-border mb-1">
          {source.name} → {target.name}
        </p>
        {canPartner && (
          <button
            onClick={handlePartner}
            className="w-full px-3 py-2 text-left text-sm font-body hover:bg-secondary rounded-lg transition-colors flex items-center gap-2"
          >
            <span className="text-female-border">♥</span> Make Partner
          </button>
        )}
        {canParent && (
          <button
            onClick={handleAddParent}
            className="w-full px-3 py-2 text-left text-sm font-body hover:bg-secondary rounded-lg transition-colors flex items-center gap-2"
          >
            <span className="text-accent-purple">↑</span> {source.name} is parent of {target.name}
          </button>
        )}
        {canChild && (
          <button
            onClick={handleAddChild}
            className="w-full px-3 py-2 text-left text-sm font-body hover:bg-secondary rounded-lg transition-colors flex items-center gap-2"
          >
            <span className="text-accent-purple">↓</span> {target.name} is parent of {source.name}
          </button>
        )}
        <button
          onClick={hideConnectionMenu}
          className="w-full px-3 py-2 text-left text-sm font-body text-muted-foreground hover:bg-secondary rounded-lg transition-colors"
        >
          Cancel
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
