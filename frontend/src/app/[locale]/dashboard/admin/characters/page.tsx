'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCharacters, createCharacter, updateCharacter, deleteCharacter } from '@/lib/api';
import { Loader2, Plus, Edit3, Trash2, Users, Sparkles, X } from 'lucide-react';

export default function CharactersAdminModule() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingCharId, setEditingCharId] = useState<number | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [themeColor, setThemeColor] = useState('#3b82f6');

  const { data: characters = [], isLoading: loadingCharacters } = useQuery({
    queryKey: ['characters'],
    queryFn: getCharacters,
  });

  const createCharacterMutation = useMutation({
    mutationFn: (data: Parameters<typeof createCharacter>[0]) => createCharacter(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      resetForm();
    },
  });

  const updateCharacterMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateCharacter>[1] }) => updateCharacter(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      resetForm();
    },
  });

  const deleteCharacterMutation = useMutation({
    mutationFn: (id: number) => deleteCharacter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters'] });
    },
  });

  const resetForm = () => {
    setShowModal(false);
    setEditingCharId(null);
    setName('');
    setDescription('');
    setImageFile(null);
    setThemeColor('#3b82f6');
  };

  const handleEdit = (char: (typeof characters)[0]) => {
    setEditingCharId(char.id);
    setName(char.name);
    setDescription(char.description || '');
    setImageFile(null); // When editing, we don't preview the existing url in the file input, but we can just show it. 
    setThemeColor(char.theme_color || '#3b82f6');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name,
      description,
      theme_color: themeColor,
    };
    if (imageFile) {
      payload.image = imageFile;
    }

    if (editingCharId) {
      updateCharacterMutation.mutate({ id: editingCharId, data: payload });
    } else {
      createCharacterMutation.mutate(payload);
    }
  };

  if (loadingCharacters) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-neutral-900 border border-neutral-800 rounded-3xl">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
        <span className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Loading OC Universe...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-6 rounded-3xl shadow-xs">
        <div>
          <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest">OC Worldbuilding Control</span>
          <h2 className="text-2xl font-extrabold text-white">Characters Universe Profiles</h2>
          <p className="text-xs text-neutral-400 mt-1">Manage original character profiles, lore, theme accents, and reference sheets.</p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 text-white" /> Create New OC Profile
        </button>
      </div>

      {/* Characters Profiles Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {characters.map((char) => (
          <div key={char.id} className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-xs flex flex-col justify-between">
            <div className="aspect-square bg-neutral-950 relative border-b border-neutral-800 overflow-hidden group flex items-center justify-center">
              {char.image_url ? (
                <img
                  src={char.image_url.startsWith('/') ? `http://127.0.0.1:8000${char.image_url}` : char.image_url}
                  alt={char.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-black shadow-md"
                  style={{ backgroundColor: char.theme_color || '#3b82f6' }}
                >
                  {char.name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Theme color badge */}
              <span
                className="absolute top-3 right-3 w-4 h-4 rounded-full border-2 border-white shadow-xs"
                style={{ backgroundColor: char.theme_color || '#3b82f6' }}
              />
            </div>

            <div className="p-5 space-y-3">
              <div>
                <span className="text-[9px] font-mono font-bold text-blue-400 uppercase">OC ID #{char.id}</span>
                <h3 className="text-base font-extrabold text-white truncate">{char.name}</h3>
                <p className="text-xs text-neutral-400 line-clamp-2 mt-1">{char.description || 'No background lore supplied.'}</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
                <span className="text-[10px] font-mono text-neutral-400">Theme: {char.theme_color || '#3b82f6'}</span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(char)}
                    className="p-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteCharacterMutation.mutate(char.id)}
                    className="p-1.5 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Character Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-white">
            <button
              onClick={resetForm}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-white">
              {editingCharId ? 'Edit Character Profile' : 'Create New OC Profile'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-400 font-bold uppercase block mb-1">Character Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lunaria Vesper"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-2.5 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-neutral-400 font-bold uppercase block mb-1">Avatar / Ref Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setImageFile(e.target.files[0]);
                  }}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-2.5 focus:outline-none focus:border-blue-500"
                />
                {imageFile && <p className="text-[10px] text-blue-400 mt-1">Selected: {imageFile.name}</p>}
                {!imageFile && editingCharId && <p className="text-[10px] text-neutral-500 mt-1">Leave empty to keep current image</p>}
              </div>

              <div>
                <label className="text-neutral-400 font-bold uppercase block mb-1">Character Theme Color Accent</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    className="w-10 h-10 rounded-xl bg-neutral-950 border border-neutral-800 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    className="flex-1 bg-neutral-950 border border-neutral-800 text-white rounded-xl p-2.5 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-400 font-bold uppercase block mb-1">Background Lore & Design Notes</label>
                <textarea
                  rows={3}
                  placeholder="Eye color, outfit details, backstory..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-2.5 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={createCharacterMutation.isPending || updateCharacterMutation.isPending}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-2xl transition-all shadow-xs cursor-pointer mt-2"
              >
                {editingCharId ? 'Update OC Profile' : 'Save Character Profile'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
