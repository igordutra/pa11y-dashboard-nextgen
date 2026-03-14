import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Activity, Github } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      login(data.token, data.user);
      navigate('/');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubLogin = () => {
    window.location.href = '/api/auth/github/login';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto bg-slate-800 p-3 rounded-2xl w-fit shadow-lg shadow-slate-200 mb-2">
            <Activity className="h-8 w-8 text-white" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl font-black tracking-tighter">
            Pa11y<span className="text-blue-600">Dash</span>
          </CardTitle>
          <CardDescription className="text-slate-500 font-medium">
            Sign in to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold text-center border border-red-100" role="alert">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-xl bg-slate-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 rounded-xl bg-slate-50"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl font-bold text-base"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-200"></div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Or continue with</div>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>
          
          <div className="mt-6">
            <Button 
              type="button" 
              variant="outline" 
              className="w-full h-12 rounded-xl font-bold border-2 hover:bg-slate-50 gap-2"
              onClick={handleGithubLogin}
            >
              <Github className="h-5 w-5" />
              GitHub
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}