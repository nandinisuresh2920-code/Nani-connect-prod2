import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer'); // Default role
  const { signInWithEmail, signUpWithEmail, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSigningUp) {
      const { user, error } = await signUpWithEmail(email, password, role);
      if (user && !error) {
        // Redirect based on role after successful signup
        if (role === 'seller') {
          navigate('/seller-dashboard');
        } else {
          navigate('/buyer-dashboard');
        }
      }
    } else {
      const { user, error } = await signInWithEmail(email, password);
      if (user && !error) {
        // Redirect based on role after successful signin
        const userRole = user.user_metadata?.role;
        if (userRole === 'seller') {
          navigate('/seller-dashboard');
        } else {
          navigate('/buyer-dashboard');
        }
      }
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Nani Connect</CardTitle>
          <p className="text-center text-muted-foreground">{isSigningUp ? 'Create your account' : 'Log in to your account'}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {isSigningUp && (
              <div>
                <Label>I am a:</Label>
                <RadioGroup defaultValue="buyer" onValueChange={(value: 'buyer' | 'seller') => setRole(value)} className="flex space-x-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="buyer" id="buyer" />
                    <Label htmlFor="buyer">Buyer</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="seller" id="seller" />
                    <Label htmlFor="seller">Seller</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
            <Button type="submit" className="w-full">
              {isSigningUp ? 'Sign Up' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {isSigningUp ? (
              <>
                Already have an account?{' '}
                <Button variant="link" onClick={() => setIsSigningUp(false)} className="p-0 h-auto">
                  Sign In
                </Button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <Button variant="link" onClick={() => setIsSigningUp(true)} className="p-0 h-auto">
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;