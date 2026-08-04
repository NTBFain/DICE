'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { updateArtistProfile, uploadProfileImage } from '@/lib/api';
import { getArtistByHandle, ArtistProfile } from '@/lib/marketplaceApi';
import { 
  UserCircle, 
  Save, 
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  Globe,
  MessageCircle,
  Link as LinkIcon
} from 'lucide-react';

export default function ProfileSetupPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    display_name: '',
    tagline: '',
    bio: '',
    styles: '',
    starting_price: 500,
    social_twitter: '',
    social_pixiv: '',
    social_discord: ''
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      // Admin account is seeded with 'main_artist' handle
      const data = await getArtistByHandle('main_artist');
      if (data) {
        setProfile(data);
        setFormData({
          display_name: data.display_name || '',
          tagline: data.tagline || '',
          bio: data.bio || '',
          styles: data.styles?.join(', ') || '',
          starting_price: data.starting_price || 500,
          social_twitter: data.social_twitter || '',
          social_pixiv: data.social_pixiv || '',
          social_discord: data.social_discord || ''
        });
        setAvatarPreview(data.avatar_url || null);
        setBannerPreview(data.banner_url || null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (type === 'avatar') {
        setAvatarFile(file);
        setAvatarPreview(url);
      } else {
        setBannerFile(file);
        setBannerPreview(url);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    
    try {
      // 1. Upload images if selected
      if (avatarFile) {
        await uploadProfileImage('avatar', avatarFile);
      }
      if (bannerFile) {
        await uploadProfileImage('banner', bannerFile);
      }

      // 2. Update text fields
      const stylesArray = formData.styles.split(',').map(s => s.trim()).filter(Boolean);
      await updateArtistProfile({
        display_name: formData.display_name,
        tagline: formData.tagline,
        bio: formData.bio,
        styles: stylesArray,
        starting_price: formData.starting_price,
        social_twitter: formData.social_twitter,
        social_pixiv: formData.social_pixiv,
        social_discord: formData.social_discord,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
      // Refresh to get updated URLs
      fetchProfile();
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold flex items-center gap-2">
          <UserCircle className="w-6 h-6 text-blue-500" />
          Profile Setup
        </h2>
        <p className="text-neutral-400 text-xs sm:text-sm mt-1">
          ปรับแต่งข้อมูลส่วนตัว รูปโปรไฟล์ และช่องทางการติดต่อของคุณที่จะแสดงในหน้าสาธารณะ
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
        
        {/* Images Section */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-purple-400" />
            Cover & Avatar
          </h3>

          <div className="space-y-4">
            {/* Banner */}
            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-2">Banner Image (หน้าปก)</label>
              <div className="relative h-48 sm:h-64 rounded-2xl border-2 border-dashed border-neutral-700 bg-neutral-950 overflow-hidden group flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors">
                {bannerPreview ? (
                  <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <ImageIcon className="w-8 h-8 mx-auto text-neutral-600 mb-2" />
                    <span className="text-xs text-neutral-500">Click to upload banner (1200x400px)</span>
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleFileChange(e, 'banner')}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Avatar */}
            <div className="relative -mt-16 sm:-mt-20 ml-6 flex items-end gap-4">
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-3xl border-4 border-neutral-900 bg-neutral-800 overflow-hidden group cursor-pointer shadow-xl">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UserCircle className="w-12 h-12 text-neutral-600" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-[10px] font-bold text-white">Change</span>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleFileChange(e, 'avatar')}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <div className="pb-2">
                <h4 className="text-sm font-bold text-white">Avatar</h4>
                <p className="text-[10px] text-neutral-400">Square image (e.g. 400x400px)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Info Section */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-6">
          <h3 className="text-sm font-bold text-white">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400">Display Name (ชื่อศิลปิน)</label>
              <input
                type="text"
                required
                value={formData.display_name}
                onChange={e => setFormData({...formData, display_name: e.target.value})}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Studio Name or Your Name"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400">Tagline (คำโปรย)</label>
              <input
                type="text"
                required
                value={formData.tagline}
                onChange={e => setFormData({...formData, tagline: e.target.value})}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. 2D Anime Illustrator"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-neutral-400">Bio / About (ประวัติ-แนะนำตัว)</label>
              <textarea
                required
                rows={4}
                value={formData.bio}
                onChange={e => setFormData({...formData, bio: e.target.value})}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                placeholder="Tell your clients about yourself and your art journey..."
              />
            </div>
          </div>
        </div>

        {/* Art Info Section */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-6">
          <h3 className="text-sm font-bold text-white">Art & Services</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400">Styles (สไตล์งานที่รับ - คั่นด้วยลูกน้ำ)</label>
              <input
                type="text"
                value={formData.styles}
                onChange={e => setFormData({...formData, styles: e.target.value})}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. Anime, Chibi, VTuber 2D"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400">Starting Price (฿)</label>
              <input
                type="number"
                min="0"
                required
                value={formData.starting_price}
                onChange={e => setFormData({...formData, starting_price: Number(e.target.value)})}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Social Links Section */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-6">
          <h3 className="text-sm font-bold text-white">Social Media Links</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Twitter (X)
              </label>
              <input
                type="text"
                value={formData.social_twitter}
                onChange={e => setFormData({...formData, social_twitter: e.target.value})}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="@username"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5" /> Pixiv
              </label>
              <input
                type="text"
                value={formData.social_pixiv}
                onChange={e => setFormData({...formData, social_pixiv: e.target.value})}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="Pixiv ID or link"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" /> Discord
              </label>
              <input
                type="text"
                value={formData.social_discord}
                onChange={e => setFormData({...formData, social_discord: e.target.value})}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="Discord username"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-4 pt-4">
          {success && (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Profile Updated!
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm rounded-xl transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>

      </form>
    </div>
  );
}
