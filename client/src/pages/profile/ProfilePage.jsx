import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { profileApi } from '../../api/profileApi';
import { useAuth } from '../../context/AuthContext';
import { formatPhone } from '../../utils/formatCurrency';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);


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

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gray-50 pb-20">

      <Header title="Profile" />

      <div className="mx-auto max-w-md px-4 py-4">
        {/* Profile Header */}
        <div className="mb-4 rounded-2xl bg-white p-5 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-primary-100">
            <span className="text-2xl font-bold text-primary-600">
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <h2 className="text-lg font-bold text-gray-900">{profile?.full_name}</h2>
          <p className="text-sm text-gray-500">{formatPhone(profile?.phone_number)}</p>
          <span className="mt-2 inline-block rounded-full bg-primary-100 px-3 py-0.5 text-xs font-medium text-primary-700">
            {profile?.type_name}
          </span>
          {profile?.is_phone_verified && (
            <span className="ml-2 inline-block rounded-full bg-green-100 px-3 py-0.5 text-xs font-medium text-green-700">
              Verified
            </span>
          )}
        </div>

        {/* Profile Details */}
        <div className="mb-4 rounded-2xl bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-3">
            <p className="text-xs text-gray-400">Email</p>
            <p className="text-sm font-medium text-gray-800">{profile?.email || 'Not set'}</p>
          </div>
          <div className="border-b border-gray-100 px-5 py-3">
            <p className="text-xs text-gray-400">NID Number</p>
            <p className="text-sm font-medium text-gray-800">{profile?.nid_number || 'Not set'}</p>
          </div>
          <div className="border-b border-gray-100 px-5 py-3">
            <p className="text-xs text-gray-400">Account Status</p>
            <p className="text-sm font-medium text-gray-800">{profile?.subtypeData?.status || 'ACTIVE'}</p>
          </div>
          <div className="px-5 py-3">
            <p className="text-xs text-gray-400">Member Since</p>
            <p className="text-sm font-medium text-gray-800">
              {profile?.registration_date ? new Date(profile.registration_date).toLocaleDateString('en-BD', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={() => navigate('/profile/edit', { state: { profile } })}
            className="flex w-full items-center justify-between rounded-xl bg-white px-5 py-3.5 shadow-sm hover:bg-gray-50"
          >
            <span className="text-sm font-medium text-gray-800">Edit Profile</span>
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>

          <button
            onClick={() => navigate('/change-pin')}
            className="flex w-full items-center justify-between rounded-xl bg-white px-5 py-3.5 shadow-sm hover:bg-gray-50"
          >
            <span className="text-sm font-medium text-gray-800">Change PIN</span>
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>

          <button
            onClick={logout}
            className="flex w-full items-center justify-center rounded-xl bg-red-50 px-5 py-3.5 text-sm font-medium text-red-600 hover:bg-red-100"
          >
            Logout
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
