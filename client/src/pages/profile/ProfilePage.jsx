import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  CameraIcon, 
  ChevronRightIcon 
} from '@heroicons/react/24/outline';
import { profileApi } from '../../api/profileApi';
import { useAuth } from '../../context/AuthContext';
import { formatPhone } from '../../utils/formatCurrency';
import BottomNav from '../../components/layout/BottomNav';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AvatarCropModal from '../../components/profile/AvatarCropModal';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';

export default function ProfilePage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCropModal, setShowCropModal] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await profileApi.getProfile();
      setProfile(data.data);
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (file) => {
    try {
      const { data } = await profileApi.uploadAvatar(file);
      setProfile((prev) => ({
        ...prev,
        profile_picture_url: data.data.profilePictureUrl,
      }));
      toast.success('Profile picture updated!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed');
      throw error; // re-throw so modal knows it failed
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const avatarUrl = profile?.profile_picture_url
    ? `${API_BASE}${profile.profile_picture_url}`
    : null;

  return (
    <div className="flex min-h-dvh flex-col bg-white overflow-x-hidden pb-10 animate-in fade-in duration-500">
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 md:py-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">

          {/* Left Column: Profile Summary */}
          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm animate-in slide-in-from-left-4 duration-700">
              {/* Clickable Avatar */}
              <button
                type="button"
                onClick={() => setShowCropModal(true)}
                className="group relative mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-primary-50 to-primary-100 ring-4 ring-primary-50/50 shadow-inner overflow-hidden cursor-pointer transition-all hover:ring-primary-100"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={profile?.full_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-black text-primary-600 drop-shadow-sm">
                    {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <CameraIcon className="h-6 w-6 text-white mb-1" strokeWidth={2} />
                  <span className="text-[10px] font-bold text-white tracking-wide">Change photo</span>
                </div>
              </button>

              <h2 className="text-2xl font-semibold tracking-tight text-gray-900">{profile?.full_name}</h2>
              <p className="mt-2 text-[15px] font-medium text-gray-400">{formatPhone(profile?.phone_number)}</p>

              <div className="mt-6 flex items-center justify-center gap-2">
                <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-sky-600 border border-sky-100">
                  {profile?.type_name}
                </span>
                {profile?.is_phone_verified && (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600 border border-emerald-100">
                    Verified
                  </span>
                )}
              </div>
            </div>

            {/* Logout Action (Moved here) */}
            <div className="flex justify-center mt-6">
              <button
                onClick={logout}
                className="flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold 
             text-red-600 bg-red-50 
             transition-all duration-150 
             hover:bg-red-100 hover:text-red-700 
             active:scale-[0.98] border border-red-100 hover:border-red-200"
              >
                Log out
              </button>
            </div>
          </div>

          {/* Right Column: Main Content */}
          <div className="lg:col-span-8 space-y-10 animate-in slide-in-from-right-4 duration-700">

            {/* Account Information Section */}
            <section className="space-y-4">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-1000 px-1 opacity-70">Account Information</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="group rounded-xl border border-gray-100 bg-white p-5 transition-all hover:border-primary-100 hover:shadow-sm">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-1">Email Address</p>
                  <p className="text-[15px] font-medium text-gray-800">{profile?.email || 'Not verified'}</p>
                </div>
                <div className="group rounded-xl border border-gray-100 bg-white p-5 transition-all hover:border-primary-100 hover:shadow-sm">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-1">NID Number</p>
                  <p className="text-[15px] font-medium text-gray-800">{profile?.nid_number || 'Not provided'}</p>
                </div>
                <div className="group rounded-xl border border-gray-100 bg-white p-5 transition-all hover:border-primary-100 hover:shadow-sm md:col-span-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-1">Member Since</p>
                  <p className="text-[15px] font-medium text-gray-800">
                    {profile?.registration_date ? new Date(profile.registration_date).toLocaleDateString('en-BD', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                  </p>
                </div>
              </div>
            </section>

            {/* Settings & Security Section */}
            <section className="space-y-4">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-1000 px-1 opacity-70">Settings & Security</label>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => navigate('/profile/edit', { state: { profile } })}
                  className="group flex w-full items-center justify-between rounded-xl border border-gray-100 bg-white p-5 text-left transition-all duration-200 hover:border-primary-100 hover:bg-primary-50/30 active:scale-[0.99]"
                >
                  <div>
                    <p className="text-[15px] font-semibold text-gray-900">Edit Profile</p>
                    <p className="text-[13px] font-regular text-gray-400 mt-1">Update your basic information</p>
                  </div>
                  <div className="rounded-full bg-gray-50 p-2 group-hover:bg-primary-100 group-hover:text-primary-600 transition-all text-gray-300">
                    <ChevronRightIcon className="h-4 w-4" strokeWidth={3} />
                  </div>
                </button>

                <button
                  onClick={() => navigate('/change-pin')}
                  className="group flex w-full items-center justify-between rounded-xl border border-gray-100 bg-white p-5 text-left transition-all duration-200 hover:border-primary-100 hover:bg-primary-50/30 active:scale-[0.99]"
                >
                  <div>
                    <p className="text-[15px] font-semibold text-gray-900">Security PIN</p>
                    <p className="text-[13px] font-regular text-gray-400 mt-1">Change your secret PIN number</p>
                  </div>
                  <div className="rounded-full bg-gray-50 p-2 group-hover:bg-primary-100 group-hover:text-primary-600 transition-all text-gray-300">
                    <ChevronRightIcon className="h-4 w-4" strokeWidth={3} />
                  </div>
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>

      <BottomNav />

      {/* Avatar Crop Modal */}
      <AvatarCropModal
        isOpen={showCropModal}
        onClose={() => setShowCropModal(false)}
        onUpload={handleAvatarUpload}
      />
    </div>
  );
}
