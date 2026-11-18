import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Loader2,
  Send,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { broadcastScore, BroadcastRecipientResult } from '../utils/api';

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  level: number;
  userEmail: string;
  sessionToken: string;
}

const DEFAULT_PRESET_EMAILS = [
  'abhaychavan346@gmail.com',
  'abhaychavan005@gmail.com',
  'abhay.chavan@cicdsys.com',
];

const STORAGE_KEY = 'pulse_broadcast_recipients';

export const BroadcastModal: React.FC<BroadcastModalProps> = ({
  isOpen,
  onClose,
  score,
  level,
  userEmail,
  sessionToken,
}) => {
  const [recipients, setRecipients] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        // Fallback to defaults
      }
    }
    return DEFAULT_PRESET_EMAILS;
  });

  const [inputEmail, setInputEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [results, setResults] = useState<BroadcastRecipientResult[] | null>(null);

  // Sync recipients to localStorage whenever updated
  useEffect(() => {
    if (typeof window !== 'undefined' && recipients.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(recipients));
      } catch {
        // Ignore quota errors
      }
    }
  }, [recipients]);

  // Reset results when modal opens
  useEffect(() => {
    if (isOpen) {
      setResults(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddEmail = (emailToAdd?: string) => {
    const target = (emailToAdd || inputEmail).trim().toLowerCase();
    if (!target) return;

    if (!target.includes('@') || !target.includes('.')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    if (recipients.includes(target)) {
      setErrorMessage('This email is already in the recipient list');
      return;
    }

    if (recipients.length >= 10) {
      setErrorMessage('Maximum of 10 recipients allowed per broadcast');
      return;
    }

    setRecipients((prev) => [...prev, target]);
    setInputEmail('');
    setErrorMessage(null);
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setRecipients((prev) => prev.filter((e) => e !== emailToRemove));
    setErrorMessage(null);
  };

  const handleSendBroadcast = async () => {
    if (recipients.length === 0) {
      setErrorMessage('Please add at least one recipient email');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await broadcastScore({
        score,
        level,
        playerName: userEmail.split('@')[0],
        sessionToken,
        recipients,
      });

      setResults(res.results);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Broadcast failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0d121f] border border-cyan-500/40 rounded-2xl p-6 shadow-2xl shadow-cyan-500/10 overflow-hidden">
        {/* Glow corner decorations */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-pink-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-cyan-950/80 border border-cyan-500/30 rounded-xl">
              <Send className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="font-display font-black text-sm tracking-widest text-cyan-400 uppercase">
                Broadcast Score
              </h2>
              <p className="text-[11px] text-gray-400 font-mono">
                Private 1-to-1 dispatch to players
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score & Level badge */}
        <div className="mt-4 p-3 bg-[#090d16] border border-gray-800 rounded-xl flex items-center justify-between font-mono text-xs">
          <div>
            <span className="text-gray-400">SCORE: </span>
            <span className="text-cyan-300 font-bold">{score.toLocaleString()} PTS</span>
          </div>
          <div>
            <span className="text-gray-400">LEVEL: </span>
            <span className="text-pink-400 font-bold">{level}</span>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="mt-3 p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-xl flex items-start gap-2.5 text-[11px] text-cyan-200 font-mono">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>
            <strong>100% Private 1-to-1 Delivery:</strong> Each player receives their own email. No
            recipient can see who else received this score.
          </span>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mt-3 p-3 bg-red-950/40 border border-red-500/40 rounded-xl flex items-center gap-2 text-xs text-red-200 font-mono">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {!results ? (
          /* Recipient Configuration Mode */
          <div className="mt-4 flex flex-col gap-3">
            {/* Add email input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddEmail();
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  placeholder="Add player email..."
                  className="w-full pl-9 pr-3 py-2 bg-gray-900/90 border border-gray-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl text-xs font-mono text-white placeholder-gray-500 transition outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!inputEmail.trim()}
                className="px-4 py-2 bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/40 disabled:opacity-50 text-cyan-300 font-mono text-xs font-bold rounded-xl transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>

            {/* Quick Presets */}
            <div>
              <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1.5">
                Quick Presets (Click to add)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_PRESET_EMAILS.map((preset) => {
                  const isAdded = recipients.includes(preset);
                  return (
                    <button
                      key={preset}
                      type="button"
                      disabled={isAdded}
                      onClick={() => handleAddEmail(preset)}
                      className={`text-[11px] font-mono px-2 py-1 rounded-lg border transition flex items-center gap-1 ${
                        isAdded
                          ? 'bg-gray-900/40 text-gray-600 border-gray-800 cursor-not-allowed'
                          : 'bg-gray-900/80 hover:bg-gray-800 text-gray-300 hover:text-cyan-300 border-gray-700 hover:border-cyan-500/50'
                      }`}
                    >
                      <span>{isAdded ? '✓' : '+'}</span>
                      <span>{preset}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recipient Chips List */}
            <div className="mt-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 mb-1.5">
                <span>RECIPIENTS ({recipients.length}/10):</span>
                {recipients.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRecipients([])}
                    className="text-gray-500 hover:text-red-400 underline text-[10px]"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {recipients.length === 0 ? (
                <div className="p-3 bg-gray-900/40 border border-dashed border-gray-800 rounded-xl text-center text-xs text-gray-500 font-mono">
                  No recipients added yet. Type an email or click a preset above.
                </div>
              ) : (
                <div className="max-h-36 overflow-y-auto flex flex-col gap-1.5 pr-1">
                  {recipients.map((email) => (
                    <div
                      key={email}
                      className="flex items-center justify-between p-2 bg-gray-900/90 border border-gray-800 rounded-xl text-xs font-mono text-gray-200"
                    >
                      <span className="truncate mr-2">{email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(email)}
                        className="text-gray-500 hover:text-red-400 p-0.5 rounded transition"
                        title="Remove recipient"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl font-display font-bold text-xs tracking-wider text-gray-400 hover:text-white bg-gray-900/80 hover:bg-gray-800 border border-gray-800 transition"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={isLoading || recipients.length === 0}
                onClick={handleSendBroadcast}
                className="flex-2 py-3 rounded-xl font-display font-black text-xs tracking-widest text-black bg-gradient-to-r from-cyan-400 to-pink-500 hover:opacity-95 disabled:opacity-50 active:scale-[0.99] transition shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>DISPATCHING...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 fill-current" />
                    <span>BROADCAST TO {recipients.length} PLAYER(S)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Results View */
          <div className="mt-4 flex flex-col gap-3">
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-xs text-emerald-300 font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Dispatched to {results.filter((r) => r.sent).length} of {results.length} player(s)
                successfully!
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5">
              {results.map((item) => (
                <div
                  key={item.email}
                  className="flex items-center justify-between p-2.5 bg-gray-900/80 border border-gray-800 rounded-xl text-xs font-mono"
                >
                  <span className="text-gray-200 truncate mr-2">{item.email}</span>
                  {item.sent ? (
                    <span className="text-emerald-400 font-bold shrink-0 flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Sent
                    </span>
                  ) : (
                    <span className="text-red-400 font-bold shrink-0 text-[11px]">Failed</span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setResults(null)}
                className="flex-1 py-3 rounded-xl font-display font-bold text-xs tracking-wider text-cyan-300 hover:text-white bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/40 transition flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>SEND AGAIN</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl font-display font-black text-xs tracking-widest text-black bg-cyan-400 hover:bg-cyan-300 transition"
              >
                DONE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
