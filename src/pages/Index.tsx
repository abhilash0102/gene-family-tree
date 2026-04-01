import { FamilyTreeProvider } from '@/contexts/FamilyTreeContext';
import { Header } from '@/components/FamilyTree/Header';
import { Canvas } from '@/components/FamilyTree/Canvas';
import { DetailsPanel } from '@/components/FamilyTree/DetailsPanel';

const Index = () => {
  return (
    <FamilyTreeProvider>
      <div className="h-screen flex flex-col bg-canvas">
        <Header />
        <div className="mt-14 flex-1 relative">
          <Canvas />
          <DetailsPanel />
        </div>
      </div>
    </FamilyTreeProvider>
  );
};

export default Index;
