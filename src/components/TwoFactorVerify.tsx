import React, { useState, useEffect, useRef } from 'react';
import { Button, Card } from '@/components/ui';
import { ShieldCheck, AlertCircle, X } from 'lucide-react';
import { createMFAChallenge, verifyMFACode } from '@/services/mfaService';

interface TwoFactorVerifyProps {
  factorId: string;
  onSuccess: () => void;
  onCancel: () => void;
  translations: {
    title: string;
    description: string;
    verificationCode: string;
    verify: string;
    cancel: string;
    error: string;
    invalidCode: string;
  };
}

const TwoFactorVerify: React.FC<TwoFactorVerifyProps> = ({
  factorId,
  onSuccess,
  onCancel,
  translations: t,
}) => {
  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    createChallenge();
    inputRef.current?.focus();
  }, []);

  const createChallenge = async () => {
    try {
      const challenge = await createMFAChallenge(factorId);
      setChallengeId(challenge.id);
    } catch (err: any) {
      setError(err?.message || t.error);
    }
  };

  const handleVerify = async () => {
    if (!challengeId || code.length !== 6) return;

    setError(null);
    setLoading(true);
    try {
      await verifyMFACode(factorId, challengeId, code);
      onSuccess();
    } catch (err: any) {
      setError(t.invalidCode);
      setCode('');
      await createChallenge();
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6) {
      handleVerify();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md p-8 bg-background border-border shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">{t.title}</h2>
              <p className="text-sm text-muted">{t.description}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t.verificationCode}
            </label>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={handleKeyDown}
              placeholder="000000"
              className="w-full h-14 text-center text-2xl font-mono tracking-[0.5em] rounded-xl border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              autoComplete="one-time-code"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
              {t.cancel}
            </Button>
            <Button
              className="flex-1"
              onClick={handleVerify}
              isLoading={loading}
              disabled={code.length !== 6 || !challengeId}
            >
              {t.verify}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TwoFactorVerify;
