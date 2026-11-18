import React, { useState } from 'react';
import {
  X,
  Mail,
  KeyRound,
  Loader2,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Gamepad2,
} from 'lucide-react';
import { sendOtp, verifyOtp } from '../utils/api';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { email: string }, sessionToken: string) => void;
  onPlayAsGuest?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onPlayAsGuest,
}) => {
  const [step, setStep] = useState<'EMAIL' | 'OTP'>('EMAIL');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setStatusNotice(null);

    try {
      const res = await sendOtp(cleanEmail);
      if (res.otpToken) {
        setOtpToken(res.otpToken);
        setStep('OTP');
        setStatusNotice(`Verification code dispatched to ${cleanEmail}`);
      } else {
        setErrorMessage(res.message || 'Failed to dispatch verification code');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Connection failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setErrorMessage('Please enter the full 6-digit code');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await verifyOtp(email.trim(), cleanOtp, otpToken);
      if (res.sessionToken && res.user) {
        onLoginSuccess(res.user, res.sessionToken);
        onClose();
      } else {
        setErrorMessage(res.message || 'Verification failed');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('EMAIL');
    setOtp('');
    setErrorMessage(null);
    setStatusNotice(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#0d121f] border border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-500/10 text-gray-100 overflow-hidden">
        {/* Neon top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-pink-400 to-amber-400" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-3 shadow-glow-cyan">
            <KeyRound className="w-7 h-7" />
          </div>
          <h2 className="font-display font-black text-2xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-pink-300 to-amber-300">
            {step === 'EMAIL' ? 'PLAYER ACCESS' : 'VERIFY CODE'}
          </h2>
          <p className="text-xs text-gray-400 font-mono mt-1">
            {step === 'EMAIL'
              ? 'Log in with your email to receive verified score reports.'
              : `Enter the 6-digit code sent to ${email}`}
          </p>
        </div>

        {/* Status notice */}
        {statusNotice && (
          <div className="mb-4 p-3 bg-emerald-950/60 border border-emerald-500/60 rounded-xl flex items-center gap-2 text-xs text-emerald-200 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusNotice}</span>
          </div>
        )}

        {/* Error notification */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-500/80 rounded-xl flex items-center gap-2 text-xs text-red-200 font-mono">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Step 1: Email Form */}
        {step === 'EMAIL' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label
                htmlFor="email-input"
                className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2"
              >
                Your Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 bg-black/60 border border-gray-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl text-sm text-gray-100 placeholder-gray-500 outline-none transition font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl font-display font-black text-sm tracking-widest text-black bg-gradient-to-r from-cyan-400 via-pink-400 to-amber-400 hover:opacity-90 active:scale-[0.99] transition shadow-glow-cyan flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>DISPATCHING CODE...</span>
                </>
              ) : (
                <>
                  <span>SEND ACCESS CODE</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="relative my-4 flex items-center justify-center">
              <div className="border-t border-gray-800 w-full" />
              <span className="bg-[#0d121f] px-3 text-[10px] uppercase tracking-widest text-gray-500 font-mono">
                OR
              </span>
              <div className="border-t border-gray-800 w-full" />
            </div>

            <button
              type="button"
              onClick={onPlayAsGuest || onClose}
              className="w-full py-3.5 rounded-xl font-display font-bold text-xs tracking-widest text-cyan-300 hover:text-white bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/40 hover:border-cyan-400 active:scale-[0.99] transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Gamepad2 className="w-4 h-4 text-cyan-400" />
              <span>PLAY AS GUEST (NO EMAIL / NO OTP)</span>
            </button>
          </form>
        ) : (
          /* Step 2: OTP Form */
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="otp-input"
                  className="block text-xs font-mono text-gray-400 uppercase tracking-wider"
                >
                  6-Digit Verification Code
                </label>
                <button
                  type="button"
                  onClick={handleBackToEmail}
                  className="text-xs text-cyan-400 hover:underline font-mono"
                >
                  Change Email
                </button>
              </div>

              <div className="relative">
                <input
                  id="otp-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  required
                  autoFocus
                  className="w-full py-3 px-4 text-center text-2xl font-mono tracking-[0.5em] bg-black/60 border border-cyan-500/50 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl text-cyan-300 placeholder-gray-600 outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full py-3.5 rounded-xl font-display font-black text-sm tracking-widest text-black bg-gradient-to-r from-cyan-400 via-lime-400 to-amber-400 hover:opacity-90 active:scale-[0.99] transition shadow-glow-cyan flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>VERIFYING CODE...</span>
                </>
              ) : (
                <>
                  <span>VERIFY &amp; ACCESS</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => handleSendOtp()}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-cyan-400 font-mono transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resend Code</span>
              </button>
            </div>
          </form>
        )}

        {/* Security footnote */}
        <div className="mt-6 pt-4 border-t border-gray-800/80 text-center text-[10px] text-gray-500 font-mono">
          Powered by Amazon SES • No passwords stored • Cryptographic HMAC-SHA256
        </div>
      </div>
    </div>
  );
};
