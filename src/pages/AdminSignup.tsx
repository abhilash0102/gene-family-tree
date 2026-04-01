import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Copy, CheckCircle, AlertCircle, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function generateRecoveryCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function AdminSignup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const code = generateRecoveryCode();

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: 'admin' },
        emailRedirectTo: window.location.origin,
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    // Store recovery code in profile
    if (data.user) {
      await supabase
        .from('profiles')
        .update({ recovery_code: code })
        .eq('id', data.user.id);
    }

    setRecoveryCode(code);
    setEmailSent(true);
    setLoading(false);
  };

  const copyCode = () => {
    if (recoveryCode) {
      navigator.clipboard.writeText(recoveryCode);
      setCopied(true);
      toast({ title: 'Recovery code copied!' });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (emailSent && recoveryCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <KeyRound className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Save Your Recovery Code</CardTitle>
            <CardDescription>
              A verification email has been sent to <strong>{email}</strong>. 
              Please also save this recovery code — you'll need it if you forget your password.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                This code is shown only once. Store it somewhere safe. You cannot retrieve it later.
              </AlertDescription>
            </Alert>
            <div className="bg-muted rounded-lg p-4 text-center">
              <code className="text-lg font-mono font-bold tracking-widest text-foreground">
                {recoveryCode}
              </code>
            </div>
            <Button onClick={copyCode} variant="outline" className="w-full gap-2">
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Recovery Code'}
            </Button>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <p className="text-sm text-muted-foreground text-center">
              Check your email and verify your account, then you can log in.
            </p>
            <Link to="/login" className="text-sm text-primary hover:underline">
              Go to Login
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-heading">Create Admin Account</CardTitle>
          <CardDescription>Sign up to manage your family tree</CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                minLength={6}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Admin Account'}
            </Button>
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Log in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
