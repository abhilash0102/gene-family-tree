import { useNavigate } from 'react-router-dom';
import { useFamilyTree } from '@/contexts/FamilyTreeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { LayoutPreference, EditSubMode } from '@/types/family';
import { Move, Pencil, Shield, LogOut, Search, X, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useRef, useEffect } from 'react';

const LAYOUT_OPTIONS: { value: LayoutPreference; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'wide', label: 'Wide' },
];

const EDIT_SUB_MODES: { value: EditSubMode; label: string; icon: React.ReactNode }[] = [
  { value: 'normal', label: 'Edit', icon: <Pencil className="w-3.5 h-3.5" /> },
  { value: 'move', label: 'Move', icon: <Move className="w-3.5 h-3.5" /> },
];

export function Header() {
  const { mode, setMode, editSubMode, setEditSubMode, layoutPreference, setLayoutPreference, resetPositions, searchQuery, setSearchQuery, searchResults, people, selectPerson } = useFamilyTree();
  const { signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [showSearch, setShowSearch] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showSearch && inputRef.current) inputRef.current.focus();
  }, [showSearch]);

  const handleSearchSelect = (id: string) => {
    selectPerson(id);
    setShowDropdown(false);
    setSearchQuery('');
    setShowSearch(false);
  };

  const SearchWidget = () => (
    <div className="relative">
      {showSearch ? (
        <div className="flex items-center gap-1 bg-secondary rounded-lg px-2 py-1">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
            placeholder="Search person..."
            className="bg-transparent text-sm font-body text-foreground outline-none w-32 sm:w-40 placeholder:text-muted-foreground"
          />
          <button onClick={() => { setShowSearch(false); setSearchQuery(''); setShowDropdown(false); }}>
            <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
          {showDropdown && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
              {searchResults.length === 0 ? (
                <p className="text-xs text-muted-foreground px-3 py-2">No results found</p>
              ) : (
                searchResults.map(id => {
                  const p = people[id];
                  if (!p) return null;
                  return (
                    <button
                      key={id}
                      onClick={() => handleSearchSelect(id)}
                      className="w-full text-left px-3 py-2 text-sm font-body hover:bg-secondary transition-colors flex items-center gap-2"
                    >
                      <span className={`w-2 h-2 rounded-full ${p.gender === 'male' ? 'bg-male-node' : 'bg-female-node'}`} />
                      {p.name}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowSearch(true)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          title="Search person"
        >
          <Search className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  // Mobile layout
  if (isMobile) {
    return (
      <>
        <header className="fixed top-0 left-0 right-0 h-14 bg-card shadow-node z-40 flex items-center justify-between px-4">
          <h1 className="text-base font-heading font-bold tracking-tight text-foreground">
            Family Archive
          </h1>
          <div className="flex items-center gap-2">
            <SearchWidget />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="fixed top-14 left-0 right-0 bg-card shadow-lg z-40 border-t border-border p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
            {/* Mode toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-body text-muted-foreground">Mode</span>
              <div className="flex items-center bg-secondary rounded-lg p-0.5">
                <button
                  onClick={() => { setMode('edit'); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-body font-semibold transition-all duration-200 ${
                    mode === 'edit' ? 'bg-card shadow-node text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  Edit
                </button>
                <button
                  onClick={() => { setMode('view'); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-body font-semibold transition-all duration-200 ${
                    mode === 'view' ? 'bg-card shadow-node text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  View
                </button>
              </div>
            </div>

            {/* Edit sub-mode */}
            {mode === 'edit' && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-body text-muted-foreground">Tools</span>
                <div className="flex items-center bg-secondary rounded-lg p-0.5 gap-0.5">
                  {EDIT_SUB_MODES.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setEditSubMode(opt.value)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-body font-semibold transition-all duration-200 ${
                        editSubMode === opt.value ? 'bg-card shadow-node text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                  {editSubMode === 'move' && (
                    <button
                      onClick={resetPositions}
                      className="px-2 py-1 rounded-md text-xs font-body font-semibold text-destructive hover:bg-destructive/10 transition-all duration-200"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Layout */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-body text-muted-foreground">Layout</span>
              <div className="flex items-center bg-secondary rounded-lg p-0.5">
                {LAYOUT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setLayoutPreference(opt.value)}
                    className={`px-3 py-1.5 rounded-md text-xs font-body font-semibold transition-all duration-200 ${
                      layoutPreference === opt.value ? 'bg-card shadow-node text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={() => { navigate('/admin'); setMobileMenuOpen(false); }} className="gap-1.5 flex-1">
                  <Shield className="w-4 h-4" />
                  Admin
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5 flex-1">
                <LogOut className="w-4 h-4" />
                Log out
              </Button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop layout
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-card shadow-node z-40 flex items-center justify-between px-6">
      <h1 className="text-lg font-heading font-bold tracking-tight text-foreground">
        Family Archive
      </h1>
      <div className="flex items-center gap-3">
        <SearchWidget />

        {/* Layout preference */}
        <div className="flex items-center bg-secondary rounded-lg p-0.5">
          {LAYOUT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setLayoutPreference(opt.value)}
              className={`px-3 py-1 rounded-md text-xs font-body font-semibold transition-all duration-200 ${
                layoutPreference === opt.value
                  ? 'bg-card shadow-node text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Edit sub-mode toggle */}
        {mode === 'edit' && (
          <div className="flex items-center bg-secondary rounded-lg p-0.5 gap-0.5">
            {EDIT_SUB_MODES.map(opt => (
              <button
                key={opt.value}
                onClick={() => setEditSubMode(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-body font-semibold transition-all duration-200 ${
                  editSubMode === opt.value
                    ? 'bg-card shadow-node text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
            {editSubMode === 'move' && (
              <button
                onClick={resetPositions}
                className="px-2 py-1 rounded-md text-xs font-body font-semibold text-destructive hover:bg-destructive/10 transition-all duration-200"
                title="Reset all positions to auto-layout"
              >
                Reset
              </button>
            )}
          </div>
        )}

        {/* Mode toggle */}
        <div className="flex items-center bg-secondary rounded-lg p-1">
          <button
            onClick={() => setMode('edit')}
            className={`px-4 py-1.5 rounded-md text-sm font-body font-semibold transition-all duration-200 ${
              mode === 'edit'
                ? 'bg-card shadow-node text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Edit
          </button>
          <button
            onClick={() => setMode('view')}
            className={`px-4 py-1.5 rounded-md text-sm font-body font-semibold transition-all duration-200 ${
              mode === 'view'
                ? 'bg-card shadow-node text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            View
          </button>
        </div>

        {/* Admin panel link - only for admins */}
        {isAdmin && (
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="gap-1.5">
            <Shield className="w-4 h-4" />
            Admin
          </Button>
        )}

        {/* Logout */}
        <Button variant="ghost" size="icon" onClick={signOut} title="Log out">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
