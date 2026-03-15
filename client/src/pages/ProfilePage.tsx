import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { User, Shield, CheckCircle2, Loader2, AlertCircle, Mail, Lock } from 'lucide-react';
import { PageHeading } from '../components/ui/PageHeading';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';

export function ProfilePage() {
    const { user } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            setStatus('error');
            setMessage('New passwords do not match');
            return;
        }

        setStatus('loading');
        try {
            await api.put('/api/users/me/password', { currentPassword, newPassword });
            setStatus('success');
            setMessage('Password updated successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setStatus('idle'), 3000);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setStatus('error');
            setMessage(err.response?.data?.error || 'Failed to update password');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            <PageHeading 
                title="Profile" 
                description="Manage your account settings and security preferences"
            />

            <div className="grid gap-8 lg:grid-cols-3">
                {/* User Info */}
                <Card className="lg:col-span-1 border-none shadow-md shadow-slate-200/50 rounded-3xl overflow-hidden">
                    <CardHeader className="bg-slate-800 text-white p-8">
                        <div className="bg-blue-500/20 p-3 rounded-2xl w-fit mb-4">
                            <User className="h-6 w-6 text-blue-400" />
                        </div>
                        <CardTitle className="text-2xl font-black tracking-tight text-white">Account Details</CardTitle>
                        <CardDescription className="text-slate-400 font-medium">Your current identity and role</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6 bg-white">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Email Address</Label>
                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-slate-700 overflow-hidden">
                                <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                <span className="truncate">{user?.email}</span>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-black text-slate-400 uppercase tracking-widest block">System Role</Label>
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                <div className="flex items-center gap-3 font-bold text-slate-700">
                                    <Shield className={`h-4 w-4 ${user?.role === 'admin' ? 'text-blue-600' : 'text-slate-400'}`} />
                                    <span className="capitalize">{user?.role}</span>
                                </div>
                                {user?.role === 'admin' && (
                                    <span className="text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                        Superuser
                                    </span>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Change Password */}
                <Card className="lg:col-span-2 border-none shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden">
                    <CardHeader className="p-8 border-b border-slate-50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
                                <Lock className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-black tracking-tight text-slate-800">Change Password</CardTitle>
                                <CardDescription className="font-medium">Update your local login credentials</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        <form onSubmit={handleSubmit} className="max-w-md space-y-6">
                            {status === 'error' && (
                                <div className="flex items-center gap-3 text-sm font-bold text-rose-600 bg-rose-50 p-4 rounded-2xl border border-rose-100 animate-in slide-in-from-top-2">
                                    <AlertCircle className="h-5 w-5" />
                                    {message}
                                </div>
                            )}
                            {status === 'success' && (
                                <div className="flex items-center gap-3 text-sm font-bold text-emerald-600 bg-emerald-50 p-4 rounded-2xl border border-emerald-100 animate-in slide-in-from-top-2">
                                    <CheckCircle2 className="h-5 w-5" />
                                    {message}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="currentPassword" title="Current password is required to authorize changes">Current Password</Label>
                                    <Input
                                        id="currentPassword"
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        required
                                        className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold focus:ring-blue-500/20"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="newPassword">New Password</Label>
                                        <Input
                                            id="newPassword"
                                            type="password"
                                            minLength={6}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold focus:ring-blue-500/20"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            minLength={6}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold focus:ring-blue-500/20"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <Button 
                                type="submit" 
                                disabled={status === 'loading'}
                                className="w-full h-12 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold shadow-lg shadow-slate-200"
                            >
                                {status === 'loading' ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    'Update Password'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
