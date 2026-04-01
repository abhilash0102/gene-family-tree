import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, Trash2, ArrowLeft, Shield, AlertCircle } from 'lucide-react';

interface ViewerUser {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

const getViewerCreationErrorMessage = async (error: unknown) => {
  let message = 'Failed to create viewer';

  if (error instanceof FunctionsHttpError) {
    try {
      const errorBody = await error.context.json();
      if (typeof errorBody?.error === 'string' && errorBody.error.length > 0) {
        message = errorBody.error;
      }
    } catch {
      message = error.message;
    }
  } else if (error instanceof Error && error.message) {
    message = error.message;
  }

  if (message.includes('already been registered')) {
    return 'This email is already registered. Use a different email for the viewer account.';
  }

  return message;
};

export default function AdminPanel() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [viewers, setViewers] = useState<ViewerUser[]>([]);
  const [newViewerEmail, setNewViewerEmail] = useState('');
  const [newViewerPassword, setNewViewerPassword] = useState('');
  const [newViewerName, setNewViewerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && isAdmin) {
      loadViewers();
    }
  }, [user, isAdmin]);

  const loadViewers = async () => {
    if (!user) return;
    const { data: viewerLinks } = await supabase
      .from('admin_viewers')
      .select('viewer_id, created_at')
      .eq('admin_id', user.id);

    if (!viewerLinks || viewerLinks.length === 0) {
      setViewers([]);
      return;
    }

    const viewerIds = viewerLinks.map(v => v.viewer_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name, created_at')
      .in('id', viewerIds);

    setViewers(profiles || []);
  };

  const createViewer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in.');
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke('create-viewer', {
        body: { email: newViewerEmail, password: newViewerPassword, full_name: newViewerName },
      });

      if (fnError) {
        setError(await getViewerCreationErrorMessage(fnError));
        return;
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      toast({ title: 'Viewer created', description: `${newViewerEmail} can now view your tree.` });
      setNewViewerEmail('');
      setNewViewerPassword('');
      setNewViewerName('');
      await loadViewers();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <header className="h-14 bg-card shadow-node flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-heading font-bold text-foreground">Admin Panel</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <Button variant="outline" size="sm" onClick={signOut}>
            Log Out
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Create Viewer */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              <CardTitle>Create Viewer Account</CardTitle>
            </div>
            <CardDescription>
              Create accounts for people who can view your family tree
            </CardDescription>
          </CardHeader>
          <form onSubmit={createViewer}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="viewerName">Full Name</Label>
                  <Input
                    id="viewerName"
                    value={newViewerName}
                    onChange={e => setNewViewerName(e.target.value)}
                    placeholder="Viewer's name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="viewerEmail">Email</Label>
                  <Input
                    id="viewerEmail"
                    type="email"
                    value={newViewerEmail}
                    onChange={e => setNewViewerEmail(e.target.value)}
                    placeholder="viewer@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="viewerPassword">Password</Label>
                  <Input
                    id="viewerPassword"
                    type="password"
                    value={newViewerPassword}
                    onChange={e => setNewViewerPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    minLength={6}
                    required
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Viewer'}
              </Button>
            </CardContent>
          </form>
        </Card>

        {/* Viewer List */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <CardTitle>Your Viewers</CardTitle>
            </div>
            <CardDescription>
              {viewers.length === 0
                ? 'No viewers yet. Create one above.'
                : `${viewers.length} viewer${viewers.length > 1 ? 's' : ''} with access to your tree`}
            </CardDescription>
          </CardHeader>
          {viewers.length > 0 && (
            <CardContent>
              <div className="space-y-3">
                {viewers.map(viewer => (
                  <div
                    key={viewer.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-foreground">{viewer.full_name || 'Unnamed'}</p>
                      <p className="text-sm text-muted-foreground">{viewer.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={async () => {
                        await supabase
                          .from('admin_viewers')
                          .delete()
                          .eq('admin_id', user!.id)
                          .eq('viewer_id', viewer.id);
                        toast({ title: 'Viewer removed' });
                        loadViewers();
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
