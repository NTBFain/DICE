'use client';

import { StudioOverlay } from '@/components/StudioDialog';

import StudioDialog from '@/components/StudioDialog';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { getErrorMessage } from '@/lib/errorMessage';
import { WORK_TYPES } from '@/lib/workTypes';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPortfolioAdmin, createArtwork, updateArtwork, deleteArtwork, getAdminCharacters } from '@/lib/api';
import { Loader2, Plus, Eye, EyeOff, Trash2, Edit3, Image as ImageIcon, Sparkles, X } from 'lucide-react';

export default function PortfolioAdminModule() {
  const queryClient = useQueryClient();
  const locale = useLocale();
  const c = useTranslations('StudioCatalogue');
  const workTypeText = useTranslations('Portfolio.workTypes');
  const [actionError, setActionError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingArtworkId, setEditingArtworkId] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [characterId, setCharacterId] = useState<string>('');
  const [workType, setWorkType] = useState<string>('ILLUSTRATION');
  const [isPublic, setIsPublic] = useState(true);

  const { data: artworks = [], isLoading: loadingArtworks, isError: artworksFailed, isFetching: fetchingArtworks, refetch: reloadArtworks } = useQuery({
    queryKey: ['admin-portfolio'],
    queryFn: getPortfolioAdmin,
  });

  const { data: characters = [], isLoading: loadingCharacters, isError: charactersFailed, isFetching: fetchingCharacters, refetch: reloadCharacters } = useQuery({
    queryKey: ['characters'],
    queryFn: getAdminCharacters,
  });

  const createArtworkMutation = useMutation({
    mutationFn: (data: Parameters<typeof createArtwork>[0]) => createArtwork(data),
    onSuccess: () => {
      setActionError('');
      queryClient.invalidateQueries({ queryKey: ['admin-portfolio'] });
      resetForm();
    },
    onError: (error: unknown) => {
      setActionError(getErrorMessage(error, locale === 'th' ? "อัปโหลดผลงานไม่สำเร็จ กรุณาตรวจสอบรูปภาพแล้วลองอีกครั้ง" : "Unable to upload artwork. Check the image and try again."));
    },
  });

  const updateArtworkMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateArtwork>[1] }) => updateArtwork(id, data),
    onSuccess: () => {
      setActionError('');
      queryClient.invalidateQueries({ queryKey: ['admin-portfolio'] });
      resetForm();
    },
    onError: (error: unknown) => {
      setActionError(getErrorMessage(error, locale === 'th' ? "บันทึกผลงานไม่สำเร็จ กรุณาลองอีกครั้ง" : "Unable to save artwork. Please try again."));
    },
  });

  const deleteArtworkMutation = useMutation({
    mutationFn: (id: number) => deleteArtwork(id),
    onSuccess: () => {
      setActionError('');
      queryClient.invalidateQueries({ queryKey: ['admin-portfolio'] });
    },
    onError: (error: unknown) => {
      setActionError(getErrorMessage(error, locale === 'th' ? "ลบผลงานไม่สำเร็จ กรุณาลองอีกครั้ง" : "Unable to delete artwork. Please try again."));
    },
  });

  const resetForm = () => {
    setActionError('');
    setShowModal(false);
    setEditingArtworkId(null);
    setTitle('');
    setDescription('');
    setImageFile(null);
    setCharacterId('');
    setWorkType('ILLUSTRATION');
    setIsPublic(true);
  };

  const handleEdit = (art: (typeof artworks)[0]) => {
    setActionError('');
    setEditingArtworkId(art.id);
    setTitle(art.title);
    setDescription(art.description || '');
    setImageFile(null);
    setCharacterId(art.character_id ? String(art.character_id) : '');
    setWorkType(art.work_type || 'ILLUSTRATION');
    setIsPublic(art.visibility_status === 'PUBLIC');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (createArtworkMutation.isPending || updateArtworkMutation.isPending) return;
    setActionError('');
    const visibilityStatus = isPublic ? 'PUBLIC' : 'PRIVATE';
    
    if (editingArtworkId) {
      updateArtworkMutation.mutate({
        id: editingArtworkId,
        data: {
          title,
          description,
          visibility_status: visibilityStatus,
          work_type: workType,
          character_id: characterId ? parseInt(characterId, 10) : null,
        },
      });
    } else {
      if (!imageFile) {
        setActionError(locale === 'th' ? 'กรุณาเลือกรูปภาพเพื่ออัปโหลด' : 'Please select an image file to upload.');
        return;
      }
      createArtworkMutation.mutate({
        title,
        description,
        visibility_status: visibilityStatus,
        work_type: workType,
        character_id: characterId ? parseInt(characterId, 10) : null,
        image: imageFile,
      });
    }
  };

  if (loadingArtworks) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-neutral-900 border border-neutral-800 rounded-3xl">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
        <span className="text-xs text-neutral-400 font-bold uppercase tracking-widest">{c('loadingGallery')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {artworksFailed && <div role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
        <p>{c('galleryLoadError')}</p>
        <button type="button" disabled={fetchingArtworks} onClick={() => { void reloadArtworks(); }} className="mt-2 rounded-lg border border-amber-500/40 px-3 py-1 font-bold disabled:opacity-50">{c('retryLoad')}</button>
      </div>}
      {charactersFailed && <div role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
        <p>{c('charactersLoadError')}</p>
        <button type="button" disabled={fetchingCharacters} onClick={() => { void reloadCharacters(); }} className="mt-2 rounded-lg border border-amber-500/40 px-3 py-1 font-bold disabled:opacity-50">{c('retryLoad')}</button>
      </div>}
      {actionError && !showModal && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{actionError}</p>}
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-6 rounded-3xl shadow-xs">
        <div>
          <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest">{c('galleryBadge')}</span>
          <h2 className="text-2xl font-extrabold text-white">{c('galleryTitle')}</h2>
          <p className="text-xs text-neutral-400 mt-1">{c('galleryIntro')}</p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 text-white" /> {' '}{c('addArtwork')}{' '}</button>
      </div>

      {/* Artworks Exhibition Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {artworks.map((art) => (
          <div key={art.id} className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-xs flex flex-col justify-between">
            <div className="aspect-square bg-neutral-950 relative border-b border-neutral-800 overflow-hidden group">
              <img
                src={art.image_url.startsWith('http') ? art.image_url : (art.image_url.startsWith('/') ? art.image_url : `/${art.image_url}`)}
                alt={art.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span className={`absolute top-3 left-3 text-[9px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                art.visibility_status === 'PUBLIC' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
              }`}>
                {art.visibility_status === 'PUBLIC' ? c('public') : c('private')}
              </span>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <span className="text-[9px] font-mono font-bold text-blue-400 uppercase">{workTypeText.has(art.work_type) ? workTypeText(art.work_type) : art.work_type}</span>
                <h3 className="text-sm font-extrabold text-white truncate">{art.title}</h3>
                {art.character && (
                  <span className="text-[10px] text-neutral-400 block font-semibold">{c('oc')}{' '}{art.character.name}</span>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
                <button
                  onClick={() => updateArtworkMutation.mutate({ id: art.id, data: { visibility_status: art.visibility_status === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC' } })}
                  className="text-xs font-bold text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {art.visibility_status === 'PUBLIC' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {art.visibility_status === 'PUBLIC' ? c('hide') : c('publish')}
                </button>

                <div className="flex items-center gap-2">
                  <button aria-label={c('edit')}
                    onClick={() => handleEdit(art)}
                    className="p-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button aria-label={c('delete')}
                    onClick={() => deleteArtworkMutation.mutate(art.id)}
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

      {/* Create / Edit Artwork Modal */}
      {showModal && (
        <StudioOverlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <StudioDialog label={c('artworkEditor')} onClose={() => resetForm()} className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-white">
            <button aria-label={c('close')}
              onClick={resetForm}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-white">
              {editingArtworkId ? c('editArtwork') : c('uploadArtwork')}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              {charactersFailed && <div role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
        <p>{c('charactersLoadError')}</p>
        <button type="button" disabled={fetchingCharacters} onClick={() => { void reloadCharacters(); }} className="mt-2 rounded-lg border border-amber-500/40 px-3 py-1 font-bold disabled:opacity-50">{c('retryLoad')}</button>
      </div>}
              {actionError && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{actionError}</p>}
              <div>
                <label className="text-neutral-400 font-bold uppercase block mb-1">{c('artworkTitle')}</label>
                <input
                  type="text"
                  required
                  placeholder={c('artworkPlaceholder')}
                  aria-label={c('artworkTitle')} value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-2.5 focus:outline-none focus:border-blue-500"
                />
              </div>

              {!editingArtworkId && (
                <div>
                  <label className="text-neutral-400 font-bold uppercase block mb-1">{c('uploadImage')}</label>
                  <input
                    type="file" aria-label={c('uploadImage')}
                    accept="image/jpeg, image/png, image/webp, image/gif"
                    required
                    onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-2.5 focus:outline-none focus:border-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-neutral-400 font-bold uppercase block mb-1">{c('workType')}</label>
                  <select
                    aria-label={c('workType')} value={workType}
                    onChange={(e) => setWorkType(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-2.5 focus:outline-none"
                  >
                    {WORK_TYPES.map(value => <option key={value} value={value}>{workTypeText(value)}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-neutral-400 font-bold uppercase block mb-1">{c('linkCharacter')}</label>
                  <select
                    aria-label={c('linkCharacter')} value={characterId}
                    disabled={loadingCharacters || charactersFailed}
                    onChange={(e) => setCharacterId(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-2.5 focus:outline-none"
                  >
                    <option value="">{c('independent')}</option>
                    {characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-neutral-400 font-bold uppercase block mb-1">{c('notes')}</label>
                <textarea
                  rows={3}
                  placeholder={c('notesPlaceholder')}
                  aria-label={c('notes')} value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-2.5 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={createArtworkMutation.isPending || updateArtworkMutation.isPending}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-2xl transition-all shadow-xs cursor-pointer mt-2"
              >
                {editingArtworkId ? c('updateArtwork') : c('publishArtwork')}
              </button>
            </form>
          </StudioDialog>
        </StudioOverlay>
      )}
    </div>
  );
}
