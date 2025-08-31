import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { useAuth } from '../App';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight } from 'lucide-react';

export const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      return;
    }
    
    setLoading(true);
    
    const result = await register(name, email, password);
    if (result.success) {
      navigate('/');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen hero-background flex items-center justify-center p-4">
      <div className="w-full max-width-md relative z-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img 
              src="https://customer-assets.emergentagent.com/job_b432ac39-e954-4a9f-affa-6f7c24334e04/artifacts/hv3qu3ev_Birdieo-logo.png" 
              alt="Birdieo" 
              className="birdieo-logo"
            />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Join Birdieo</h1>
          <p className="text-emerald-100 text-lg">Start capturing your golf shots automatically</p>
        </div>

        <Card className="glass-card border-0 shadow-2xl max-w-md mx-auto">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold text-emerald-800">Create Account</CardTitle>
            <CardDescription className="text-emerald-600">
              Sign up to begin your automated golf experience
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-emerald-800 font-medium">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-600 h-5 w-5" />
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="golf-input pl-12"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-emerald-800 font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-600 h-5 w-5" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="golf-input pl-12"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-emerald-800 font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-600 h-5 w-5" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="golf-input pl-12 pr-12"
                    placeholder="Create a password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-emerald-600 hover:text-emerald-800 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-emerald-800 font-medium">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-600 h-5 w-5" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="golf-input pl-12"
                    placeholder="Confirm your password"
                    required
                  />
                </div>
                {password && confirmPassword && password !== confirmPassword && (
                  <p className="text-red-600 text-sm">Passwords do not match</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || (password && confirmPassword && password !== confirmPassword)}
                className="w-full btn-golf-primary group relative overflow-hidden"
              >
                {loading ? (
                  <div className="loading-golf"></div>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-emerald-700">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-emerald-800 hover:text-emerald-900 underline">
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-emerald-100">
          <p className="text-sm">
            Join thousands of golfers capturing their best shots
          </p>
        </div>
      </div>
    </div>
  );
};