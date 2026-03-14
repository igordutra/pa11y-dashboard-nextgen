import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { User, Shield, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

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
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
                <p className="text-muted-foreground mt-1">Manage your account settings</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* User Info */}
                <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <User className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-semibold">Account Details</h2>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <Label className="text-muted-foreground">Email</Label>
                            <div className="font-medium mt-1">{user?.email}</div>
                        </div>
                        <div>
                            <Label className="text-muted-foreground">Role</Label>
                            <div className="mt-1 flex items-center gap-2">
                                <span className="uppercase tracking-wider text-xs font-bold bg-slate-100 px-2 py-1 rounded-md">
                                    {user?.role}
                                </span>
                                {user?.role === 'admin' && <Shield className="h-4 w-4 text-blue-600" />}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Change Password */}
                <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Shield className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-semibold">Change Password</h2>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {status === 'error' && (
                            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                                <AlertCircle className="h-4 w-4" />
                                {message}
                            </div>
                        )}
                        {status === 'success' && (
                            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-100">
                                <CheckCircle2 className="h-4 w-4" />
                                {message}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <Input
                                id="currentPassword"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                minLength={6}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
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
                            />
                        </div>
                        <Button 
                            type="submit" 
                            disabled={status === 'loading'}
                            className="w-full"
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
                </div>
            </div>
        </div>
    );
}
