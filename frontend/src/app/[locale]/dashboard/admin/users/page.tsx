'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllUsers, updateUserRole, deleteUser, SystemUser } from '@/lib/api';
import { useAuth } from '@/components/AuthContext';
import {
  Shield,
  Palette,
  UserCheck,
  UserX,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Crown,
  Sparkles,
} from 'lucide-react';

export default function UsersManagementPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionError, setActionError] = useState('');

  const { data: users, isLoading } = useQuery<SystemUser[]>({
    queryKey: ['system-users'],
    queryFn: getAllUsers,
  });

  const toggleRoleMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: { is_admin?: boolean; is_artist?: boolean } }) =>
      updateUserRole(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
      setActionError('');
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.detail || 'Failed to update user role');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
      setActionError('');
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.detail || 'Failed to delete user');
    },
  });

  const filteredUsers = users?.filter(
    (u) =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.artist_handle && u.artist_handle.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900/40 via-neutral-900 to-blue-900/40 border border-purple-800/40 p-6 rounded-2xl relative overflow-hidden shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
                System Administration
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">User Management Control</h1>
            <p className="text-neutral-400 text-xs sm:text-sm mt-1">
              จัดการสิทธิ์ บัญชีผู้ใช้ สิทธิ์แอดมิน และบทบาทศิลปินบนแพลตฟอร์ม DICE
            </p>
          </div>
          <div className="flex items-center gap-3 bg-neutral-950/80 px-4 py-2.5 rounded-xl border border-neutral-800 shrink-0">
            <Shield className="w-5 h-5 text-purple-400" />
            <div>
              <div className="text-[10px] text-neutral-400 uppercase font-bold">Total Accounts</div>
              <div className="text-lg font-black text-white">{users?.length || 0} Users</div>
            </div>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} className="text-red-400 hover:text-white font-bold">✕</button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input
          type="text"
          placeholder="ค้นหาตามชื่อ, อีเมล หรือแฮนเดิลศิลปิน..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm placeholder-neutral-500 focus:outline-none focus:border-purple-500 transition-colors"
        />
      </div>

      {/* Users Table */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Loading System Users...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-neutral-950/80 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800">
                <tr>
                  <th className="py-3.5 px-4 font-bold">User</th>
                  <th className="py-3.5 px-4 font-bold">Email</th>
                  <th className="py-3.5 px-4 font-bold text-center">Admin Access</th>
                  <th className="py-3.5 px-4 font-bold text-center">Artist Status</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {filteredUsers?.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-neutral-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-white text-xs shrink-0 overflow-hidden">
                            {u.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              u.full_name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              {u.full_name}
                              {u.is_admin && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                              {isSelf && (
                                <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            {u.artist_handle && (
                              <div className="text-[10px] text-blue-400 font-mono">@{u.artist_handle}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-neutral-300 text-xs">{u.email}</td>
                      
                      {/* Admin Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          disabled={isSelf || toggleRoleMutation.isPending}
                          onClick={() => toggleRoleMutation.mutate({ userId: u.id, data: { is_admin: !u.is_admin } })}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            u.is_admin
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                              : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:bg-neutral-700'
                          } ${isSelf ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          {u.is_admin ? <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> : <XCircle className="w-3.5 h-3.5" />}
                          {u.is_admin ? 'Admin' : 'User'}
                        </button>
                      </td>

                      {/* Artist Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          disabled={toggleRoleMutation.isPending}
                          onClick={() => toggleRoleMutation.mutate({ userId: u.id, data: { is_artist: !u.is_artist } })}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            u.is_artist
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30'
                              : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:bg-neutral-700'
                          }`}
                        >
                          {u.is_artist ? <Palette className="w-3.5 h-3.5 text-blue-400" /> : <UserX className="w-3.5 h-3.5" />}
                          {u.is_artist ? 'Artist' : 'Client'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {!isSelf && (
                          <button
                            onClick={() => {
                              if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบบัญชี ${u.email} ?`)) {
                                deleteUserMutation.mutate(u.id);
                              }
                            }}
                            disabled={deleteUserMutation.isPending}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition-colors cursor-pointer"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
