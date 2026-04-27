import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface LoginScreenProps {
  signIn: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
  authError: string | null;
}

type AuthMode = 'main' | 'login' | 'register';

export const LoginScreen: React.FC<LoginScreenProps> = ({
  signIn, signInWithApple, signInWithEmail, signUpWithEmail, signInAsGuest, authError
}) => {
  const [mode, setMode] = useState<AuthMode>('main');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsSubmitting(true);
    await signInWithEmail(email, password);
    setIsSubmitting(false);
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsSubmitting(true);
    await signUpWithEmail(email, password, displayName || undefined);
    setIsSubmitting(false);
  };

  const handleGuestLogin = async () => {
    setIsSubmitting(true);
    await signInAsGuest();
    setIsSubmitting(false);
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setShowPassword(false);
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#050505] text-white p-6">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter italic uppercase text-[#D4AF37] drop-shadow-[0_0_15px_rgba(212,175,55,0.8)]">
            TRUCKERS NAV BY TUE
          </h1>
          <p className="text-[#D4AF37] text-sm uppercase tracking-widest">
            THE HOME OF THE TRUCKERS NEXT-GEN LOGISTICS PLATFORM
          </p>
        </div>

        <div className="bg-zinc-900/50 border border-[#D4AF37]/20 p-8 rounded-3xl space-y-5 backdrop-blur-xl">
          {mode === 'main' && (
            <>
              <div className="space-y-3">
                <h2 data-testid="login-heading" className="text-xl font-bold text-[#D4AF37]">Welcome, Driver</h2>
                <p className="text-zinc-400 text-sm">Sign in to access your logs, routes, and earnings.</p>
              </div>

              {/* Google Sign In */}
              <button
                data-testid="google-signin-btn"
                onClick={signIn}
                disabled={isSubmitting}
                className="w-full py-3.5 bg-[#D4AF37] text-black font-bold rounded-2xl transition-all flex items-center justify-center gap-3 hover:bg-[#D4AF37]/90 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign In with Google
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-zinc-700" />
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">or</span>
                <div className="flex-1 h-px bg-zinc-700" />
              </div>

              {/* Email Sign In */}
              <button
                data-testid="email-signin-btn"
                onClick={() => { resetForm(); setMode('login'); }}
                className="w-full py-3.5 bg-zinc-800 border border-zinc-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-3 hover:bg-zinc-700 hover:border-zinc-600"
              >
                <Mail className="w-4 h-4" />
                Sign In with Email
              </button>

              {/* Register */}
              <button
                data-testid="email-register-btn"
                onClick={() => { resetForm(); setMode('register'); }}
                className="w-full py-3.5 bg-transparent border border-[#D4AF37]/30 text-[#D4AF37] font-bold rounded-2xl transition-all flex items-center justify-center gap-3 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/50"
              >
                <User className="w-4 h-4" />
                Create Account
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-zinc-700" />
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">or</span>
                <div className="flex-1 h-px bg-zinc-700" />
              </div>

              {/* Guest */}
              <button
                data-testid="guest-signin-btn"
                onClick={handleGuestLogin}
                disabled={isSubmitting}
                className="w-full py-3 text-zinc-400 text-sm font-bold rounded-2xl transition-all flex items-center justify-center gap-2 hover:text-white hover:bg-zinc-800/50"
              >
                Continue as Guest
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <p className="text-[9px] text-zinc-600 text-center">Guest sessions are limited to 2 hours</p>
            </>
          )}

          {mode === 'login' && (
            <>
              <div className="space-y-2">
                <h2 data-testid="login-email-heading" className="text-xl font-bold text-[#D4AF37]">Sign In</h2>
                <p className="text-zinc-400 text-sm">Enter your email and password.</p>
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    data-testid="email-input"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Email address"
                    required
                    className="w-full pl-11 pr-4 py-3.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/30 transition-all"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    data-testid="password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    minLength={6}
                    className="w-full pl-11 pr-11 py-3.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  data-testid="login-submit-btn"
                  type="submit"
                  disabled={isSubmitting || !email || !password}
                  className="w-full py-3.5 bg-[#D4AF37] text-black font-bold rounded-2xl transition-all hover:bg-[#D4AF37]/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <button
                data-testid="back-to-main-btn"
                onClick={() => { resetForm(); setMode('main'); }}
                className="text-zinc-500 text-sm hover:text-zinc-300 transition-colors"
              >
                Back to all options
              </button>
            </>
          )}

          {mode === 'register' && (
            <>
              <div className="space-y-2">
                <h2 data-testid="register-heading" className="text-xl font-bold text-[#D4AF37]">Create Account</h2>
                <p className="text-zinc-400 text-sm">Register to start tracking your routes.</p>
              </div>

              <form onSubmit={handleEmailRegister} className="space-y-4">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    data-testid="register-name-input"
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Driver name (optional)"
                    className="w-full pl-11 pr-4 py-3.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/30 transition-all"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    data-testid="register-email-input"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Email address"
                    required
                    className="w-full pl-11 pr-4 py-3.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/30 transition-all"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    data-testid="register-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password (min 6 characters)"
                    required
                    minLength={6}
                    className="w-full pl-11 pr-11 py-3.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  data-testid="register-submit-btn"
                  type="submit"
                  disabled={isSubmitting || !email || !password}
                  className="w-full py-3.5 bg-[#D4AF37] text-black font-bold rounded-2xl transition-all hover:bg-[#D4AF37]/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Creating account...' : 'Create Account'}
                </button>
              </form>

              <button
                data-testid="back-to-main-btn-register"
                onClick={() => { resetForm(); setMode('main'); }}
                className="text-zinc-500 text-sm hover:text-zinc-300 transition-colors"
              >
                Back to all options
              </button>
            </>
          )}

          {authError && (
            <p data-testid="auth-error" className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
              {authError}
            </p>
          )}
        </div>

        <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};
