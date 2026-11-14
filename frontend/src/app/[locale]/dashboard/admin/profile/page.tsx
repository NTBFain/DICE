'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { getErrorMessage } from '@/lib/errorMessage';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { updateArtistProfile, uploadProfileImage, getMyArtistProfile, ArtistProfile } from '@/lib/api';
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
  const copy = useTranslations('RolePageCopy');
  const { user } = useAuth();
  const locale = useLocale();
  const [loadError, setLoadError] = useState('');
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
    if (!user) return;
    if (user.is_admin && !user.is_artist) { setLoading(false); return; }
    fetchProfile();
  }, [user?.id, user?.is_artist, user?.is_admin]);

  const fetchProfile = async () => {
    try {
      setLoadError('');
      const data = await getMyArtistProfile();
      if (data) {
        setProfile(data);
        setFormData({
          display_name: data.display_name || '',
          tagline: data.tagline || '',
          bio: data.bio || '',
          styles: data.styles?.join(', ') || '',
          starting_price: data.starting_price ?? 500,
          social_twitter: data.social_twitter || '',
          social_pixiv: data.social_pixiv || '',
          social_discord: data.social_discord || ''
        });
        setAvatarPreview(data.avatar_url || null);
        setBannerPreview(data.banner_url || null);
      }
    } catch (error) {
      setLoadError(getErrorMessage(error, locale === 'th' ? 'ไม่สามารถโหลดโปรไฟล์ได้' : 'Unable to load the artist profile.'));
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
      alert(copy('profileCopy26'));
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

  if (!profile) return <section className="space-y-3 rounded-2xl border border-neutral-800 p-6">
    <h2 className="text-xl font-bold">{locale === 'th' ? 'โปรไฟล์ศิลปิน' : 'Artist profile'}</h2>
    <p role={loadError ? 'alert' : undefined}>{loadError || (locale === 'th' ? 'บัญชีผู้ดูแลนี้ยังไม่มีสตูดิโอศิลปิน ลงทะเบียนสตูดิโอเพื่อใช้หน้าตั้งค่าโปรไฟล์' : 'This administrator account has no artist studio. Register a studio to use artist profile settings.')}</p>
    <Link href="/artists/register" className="inline-block rounded-xl bg-blue-600 px-4 py-2">{locale === 'th' ? 'ลงทะเบียนสตูดิโอ' : 'Register an artist studio'}</Link>
    {loadError && <button type="button" onClick={fetchProfile} className="ml-3 underline">{locale === 'th' ? 'ลองใหม่' : 'Try again'}</button>}
  </section>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold flex items-center gap-2">
          <UserCircle className="w-6 h-6 text-blue-500" />
          {' '}{copy('profileCopy0')}{' '}</h2>
        <p className="text-neutral-400 text-xs sm:text-sm mt-1">
          {' '}{copy('profileCopy1')}{' '}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
        
        {/* Images Section */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-purple-400" />
            {' '}{copy('profileCopy2')}{' '}</h3>

          <div className="space-y-4">
            {/* Banner */}
            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-2">{copy('profileCopy3')}</label>
              <div className="relative h-48 sm:h-64 rounded-2xl border-2 border-dashed border-neutral-700 bg-neutral-950 overflow-hidden group flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors">
                {bannerPreview ? (
                  <img src={bannerPreview} alt={copy('profileCopy5')} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <ImageIcon className="w-8 h-8 mx-auto text-neutral-600 mb-2" />
                    <span className="text-xs text-neutral-500">{copy('profileCopy4')}</span>
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  aria-label={copy('profileCopy3')}
                  onChange={(e) => handleFileChange(e, 'banner')}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Avatar */}
            <div className="relative -mt-16 sm:-mt-20 ml-6 flex items-end gap-4">
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-3xl border-4 border-neutral-900 bg-neutral-800 overflow-hidden group cursor-pointer shadow-xl">
                {avatarPreview ? (
                  <img src={avatarPreview} alt={copy('profileCopy6')} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UserCircle className="w-12 h-12 text-neutral-600" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-[10px] font-bold text-white">{copy('profileCopy7')}</span>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  aria-label={copy('profileCopy6')}
                  onChange={(e) => handleFileChange(e, 'avatar')}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <div className="pb-2">
                <h4 className="text-sm font-bold text-white">{copy('profileCopy6')}</h4>
                <p className="text-[10px] text-neutral-400">{copy('profileCopy8')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Info Section */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-6">
          <h3 className="text-sm font-bold text-white">{copy('profileCopy9')}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label htmlFor="artist-profile-display_name" className="text-xs font-bold text-neutral-400">{copy('profileCopy10')}</label>
              <input
                type="text"
                required
                id="artist-profile-display_name"
                value={formData.display_name}
                onChange={e => setFormData({...formData, display_name: e.target.value})}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder={copy('profileCopy11')}
              />
            </div>
            
            <div className="space-y-1.5">
              <label htmlFor="artist-profile-tagline" className="text-xs font-bold text-neutral-400">{copy('profileCopy12')}</label>
              <input
                type="text"
                required
                id="artist-profile-tagline"
                value={formData.tagline}
                onChange={e => setFormData({...formData, tagline: e.target.value})}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder={copy('profileCopy13')}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="artist-profile-bio" className="text-xs font-bold text-neutral-400">{copy('profileCopy14')}</label>
              <textarea
                required
                rows={4}
                id="artist-profile-bio"
                value={formData.bio}
                onChange={e => setFormData({...formData, bio: e.target.value})}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                placeholder={copy('profileCopy15')}
              />
            </div>
          </div>
        </div>

        {/* Art Info Section */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-6">
          <h3 className="text-sm font-bold text-white">{copy('profileCopy16')}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label htmlFor="artist-profile-styles" className="text-xs font-bold text-neutral-400">{copy('profileCopy17')}</label>
              <input
                type="text"
                id="artist-profile-styles"
                value={formData.styles}
                onChange={e => setFormData({...formData, styles: e.target.value})}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder={copy('profileCopy18')}
              />
            </div>
            
            <div className="space-y-1.5">
              <label htmlFor="artist-profile-starting_price" className="text-xs font-bold text-neutral-400">{copy('profileCopy19')}</label>
              <input
                type="number" step="0.01"
                min="0"
                required
                id="artist-profile-starting_price"
                value={formData.starting_price}
                onChange={e => setFormData({...formData, starting_price: Number(e.target.value)})}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Social Links Section */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-6">
          <h3 className="text-sm font-bold text-white">{copy('profileCopy20')}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Twitter (X)
              </label>
              <input
                type="text"
                aria-label="Twitter (X)"
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
                aria-label="Pixiv"
                value={formData.social_pixiv}
                onChange={e => setFormData({...formData, social_pixiv: e.target.value})}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder={copy('profileCopy21')}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" /> Discord
              </label>
              <input
                type="text"
                aria-label="Discord"
                value={formData.social_discord}
                onChange={e => setFormData({...formData, social_discord: e.target.value})}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder={copy('profileCopy22')}
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-4 pt-4">
          {success && (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> {' '}{copy('profileCopy23')}{' '}</span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm rounded-xl transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? copy('profileCopy24') : copy('profileCopy25')}
          </button>
        </div>

      </form>
    </div>
  );
}
