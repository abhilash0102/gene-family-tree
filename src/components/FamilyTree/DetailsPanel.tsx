import React, { useState, useEffect, useMemo } from 'react';
import { useFamilyTree } from '@/contexts/FamilyTreeContext';
import { motion, AnimatePresence } from 'framer-motion';

export function DetailsPanel() {
  const {
    people, selectedId, selectPerson, mode, updatePerson, deletePerson,
    addPartnerByName, linkPartner, unlinkPartner, getPartnerOf,
    getParentsOf, getChildrenOf, getAllPeopleExcept,
  } = useFamilyTree();
  const person = selectedId ? people[selectedId] : null;

  const [formState, setFormState] = useState({
    name: '',
    gender: 'male' as 'male' | 'female',
    dateOfBirth: '',
    notes: '',
  });
  const [partnerSearch, setPartnerSearch] = useState('');
  const [showPartnerDropdown, setShowPartnerDropdown] = useState(false);
  const [showNewPartnerInput, setShowNewPartnerInput] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState('');

  const partner = person ? getPartnerOf(person.id) : undefined;
  const parents = person ? getParentsOf(person.id) : [];
  const children = person ? getChildrenOf(person.id) : [];

  useEffect(() => {
    if (person) {
      setFormState({
        name: person.name,
        gender: person.gender,
        dateOfBirth: person.dateOfBirth || '',
        notes: person.notes || '',
      });
      setShowPartnerDropdown(false);
      setShowNewPartnerInput(false);
      setPartnerSearch('');
      setNewPartnerName('');
    }
  }, [person]);

  // Listen for photo uploads
  useEffect(() => {
    const handler = (e: Event) => {
      const { personId, url } = (e as CustomEvent).detail;
      updatePerson(personId, { photoUrl: url });
    };
    window.addEventListener('photo-upload', handler);
    return () => window.removeEventListener('photo-upload', handler);
  }, [updatePerson]);

  const handleSave = () => {
    if (!selectedId) return;
    updatePerson(selectedId, {
      name: formState.name,
      gender: formState.gender,
      dateOfBirth: formState.dateOfBirth || undefined,
      notes: formState.notes || undefined,
    });
  };

  // Available people for partner selection (exclude self, current partner)
  const availablePartners = useMemo(() => {
    if (!person) return [];
    const excludeIds = [person.id];
    if (partner) excludeIds.push(partner.id);
    return getAllPeopleExcept(excludeIds).filter(p =>
      !partnerSearch || p.name.toLowerCase().includes(partnerSearch.toLowerCase())
    );
  }, [person, partner, getAllPeopleExcept, partnerSearch]);

  const handleSelectExistingPartner = (partnerId: string) => {
    if (!selectedId) return;
    linkPartner(selectedId, partnerId);
    setShowPartnerDropdown(false);
    setPartnerSearch('');
  };

  const handleCreateNewPartner = () => {
    if (!selectedId || !newPartnerName.trim()) return;
    addPartnerByName(selectedId, newPartnerName.trim());
    setShowNewPartnerInput(false);
    setNewPartnerName('');
  };

  const handleUnlinkPartner = () => {
    if (!selectedId || !partner) return;
    unlinkPartner(selectedId, partner.id);
  };

  return (
    <AnimatePresence>
      {person && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', ease: [0.25, 0.1, 0.25, 1], duration: 0.35 }}
          className="fixed top-14 right-0 h-[calc(100vh-3.5rem)] w-full sm:w-80 bg-card shadow-panel z-50 p-6 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => selectPerson(null)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            ×
          </button>

          <div className="space-y-5 mt-4">
            {/* Avatar */}
            <div className="flex justify-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-body font-semibold ${
                person.gender === 'male' ? 'bg-male-node' : 'bg-female-node'
              }`}>
                {person.photoUrl ? (
                  <img src={person.photoUrl} alt={person.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  person.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                )}
              </div>
            </div>

            {mode === 'edit' ? (
              <>
                {/* Name */}
                <div>
                  <label className="text-xs font-body text-muted-foreground mb-1 block">Full Name</label>
                  <input
                    value={formState.name}
                    onChange={e => setFormState(s => ({ ...s, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-secondary text-sm font-body text-foreground outline-none focus:ring-2 focus:ring-accent-purple"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="text-xs font-body text-muted-foreground mb-1 block">Gender</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFormState(s => ({ ...s, gender: 'male' }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-body font-semibold transition-all ${
                        formState.gender === 'male' ? 'bg-male-node shadow-node' : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      ♂ Male
                    </button>
                    <button
                      onClick={() => setFormState(s => ({ ...s, gender: 'female' }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-body font-semibold transition-all ${
                        formState.gender === 'female' ? 'bg-female-node shadow-node' : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      ♀ Female
                    </button>
                  </div>
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="text-xs font-body text-muted-foreground mb-1 block">Date of Birth</label>
                  <input
                    type="date"
                    value={formState.dateOfBirth}
                    onChange={e => setFormState(s => ({ ...s, dateOfBirth: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-secondary text-sm font-body text-foreground outline-none focus:ring-2 focus:ring-accent-purple"
                  />
                </div>

                {/* Partner - searchable dropdown */}
                <div>
                  <label className="text-xs font-body text-muted-foreground mb-1 block">Partner</label>
                  {partner ? (
                    <div className="px-3 py-2 rounded-lg bg-secondary text-sm font-body text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="text-female-border">♥</span>
                        {partner.name}
                      </span>
                      <button
                        onClick={handleUnlinkPartner}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove partner link"
                      >
                        ✕
                      </button>
                    </div>
                  ) : showPartnerDropdown ? (
                    <div className="relative">
                      <input
                        value={partnerSearch}
                        onChange={e => setPartnerSearch(e.target.value)}
                        placeholder="Search existing people..."
                        className="w-full px-3 py-2 rounded-lg bg-secondary text-sm font-body text-foreground outline-none focus:ring-2 focus:ring-accent-purple"
                        autoFocus
                        onKeyDown={e => e.key === 'Escape' && setShowPartnerDropdown(false)}
                      />
                      <div className="absolute top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-card rounded-lg shadow-node-hover z-10">
                        {availablePartners.length > 0 ? (
                          availablePartners.map(p => (
                            <button
                              key={p.id}
                              onClick={() => handleSelectExistingPartner(p.id)}
                              className="w-full px-3 py-2 text-left text-sm font-body hover:bg-secondary transition-colors flex items-center gap-2"
                            >
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                p.gender === 'male' ? 'bg-male-node' : 'bg-female-node'
                              }`}>
                                {p.name[0]}
                              </span>
                              {p.name}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-xs text-muted-foreground">No matches found</div>
                        )}
                      </div>
                      <div className="flex gap-1 mt-1">
                        <button
                          onClick={() => { setShowPartnerDropdown(false); setShowNewPartnerInput(true); }}
                          className="text-xs text-accent-purple hover:underline font-body"
                        >
                          + Create new person
                        </button>
                        <span className="text-xs text-muted-foreground">·</span>
                        <button
                          onClick={() => setShowPartnerDropdown(false)}
                          className="text-xs text-muted-foreground hover:text-foreground font-body"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : showNewPartnerInput ? (
                    <div className="flex gap-1">
                      <input
                        value={newPartnerName}
                        onChange={e => setNewPartnerName(e.target.value)}
                        placeholder="Partner name..."
                        className="flex-1 px-3 py-2 rounded-lg bg-secondary text-sm font-body text-foreground outline-none focus:ring-2 focus:ring-accent-purple"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleCreateNewPartner();
                          if (e.key === 'Escape') setShowNewPartnerInput(false);
                        }}
                      />
                      <button onClick={handleCreateNewPartner} className="px-3 py-2 rounded-lg bg-accent-purple text-primary-foreground text-sm font-body font-semibold">
                        ✓
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowPartnerDropdown(true)}
                      className="w-full px-3 py-2 rounded-lg bg-secondary text-sm font-body text-muted-foreground hover:text-foreground transition-colors text-left"
                    >
                      + Link Partner
                    </button>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-body text-muted-foreground mb-1 block">Notes</label>
                  <textarea
                    value={formState.notes}
                    onChange={e => setFormState(s => ({ ...s, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-secondary text-sm font-body text-foreground outline-none focus:ring-2 focus:ring-accent-purple resize-none"
                  />
                </div>

                {/* Save */}
                <button
                  onClick={handleSave}
                  className="w-full py-2.5 rounded-lg bg-accent-purple text-primary-foreground font-body font-semibold shadow-node hover:shadow-node-hover transition-all"
                >
                  Save Changes
                </button>

                {/* Delete */}
                <button
                  onClick={() => {
                    if (selectedId && window.confirm(`Delete "${person.name}" from the tree?`)) {
                      deletePerson(selectedId);
                    }
                  }}
                  className="w-full py-2.5 rounded-lg bg-destructive text-destructive-foreground font-body font-semibold hover:opacity-90 transition-all"
                >
                  Delete Person
                </button>
              </>
            ) : (
              /* View Mode */
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-heading font-bold text-foreground">{person.name}</h3>
                  <p className="text-sm font-body text-muted-foreground">
                    {person.gender === 'male' ? '♂ Male' : '♀ Female'}
                  </p>
                </div>

                {person.dateOfBirth && (
                  <div>
                    <span className="text-xs font-body text-muted-foreground">Date of Birth</span>
                    <p className="text-sm font-body text-foreground">{person.dateOfBirth}</p>
                  </div>
                )}

                {partner && (
                  <div>
                    <span className="text-xs font-body text-muted-foreground">Partner</span>
                    <p className="text-sm font-body text-foreground flex items-center gap-1">
                      <span className="text-female-border">♥</span> {partner.name}
                    </p>
                  </div>
                )}

                {parents.length > 0 && (
                  <div>
                    <span className="text-xs font-body text-muted-foreground">Parents</span>
                    {parents.map(p => (
                      <p key={p.id} className="text-sm font-body text-foreground">
                        {p.gender === 'male' ? '♂' : '♀'} {p.name}
                      </p>
                    ))}
                  </div>
                )}

                {children.length > 0 && (
                  <div>
                    <span className="text-xs font-body text-muted-foreground">Children</span>
                    {children.map(c => (
                      <p key={c.id} className="text-sm font-body text-foreground">
                        {c.gender === 'male' ? '♂' : '♀'} {c.name}
                      </p>
                    ))}
                  </div>
                )}

                {person.notes && (
                  <div>
                    <span className="text-xs font-body text-muted-foreground">Notes</span>
                    <p className="text-sm font-body text-foreground whitespace-pre-wrap">{person.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
