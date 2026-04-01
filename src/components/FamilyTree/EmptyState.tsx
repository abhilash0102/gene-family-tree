import { useFamilyTree } from '@/contexts/FamilyTreeContext';
import { InlineInputState } from '@/types/family';

export function EmptyState() {
  const { startInlineInput } = useFamilyTree();

  const handleAdd = (gender: 'male' | 'female') => {
    const input: InlineInputState = {
      type: 'first',
      position: { x: 0, y: 0 },
      gender,
    };
    startInlineInput(input);
  };

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] bg-canvas px-4">
      <div className="text-center animate-fade-in">
        <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-3 tracking-tight">
          Your history, spatially preserved.
        </h2>
        <p className="text-muted-foreground font-body text-base sm:text-lg mb-8">
          The story begins with one.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <button
            onClick={() => handleAdd('male')}
            className="px-6 py-3 rounded-xl bg-male-node text-foreground font-body font-semibold shadow-node hover:shadow-node-hover transition-all duration-200 hover:scale-105"
          >
            ♂ Add First Person
          </button>
          <button
            onClick={() => handleAdd('female')}
            className="px-6 py-3 rounded-xl bg-female-node text-foreground font-body font-semibold shadow-node hover:shadow-node-hover transition-all duration-200 hover:scale-105"
          >
            ♀ Add First Person
          </button>
        </div>
      </div>
    </div>
  );
}
