import React, { useState, useEffect } from 'react';
import { Button, Input, Card } from '@/components/ui';
import { Shield, ShieldCheck, ShieldOff, Copy, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  getMFAFactors,
  enrollMFA,
  verifyMFAEnrollment,
  unenrollMFA,
  MFAFactor,
  MFAEnrollResult,
} from '@/services/mfaService';

interface TwoFactorSetupProps {
  onStatusChange?: (enabled: boolean) => void;
  translations: {
    title: string;
    description: string;
    enabled: string;
    disabled: string;
    enable: string;
    disable: string;
    scanQrCode: string;
    orEnterManually: string;
    secretKey: string;
    copied: string;
    enterCode: string;
    verificationCode: string;
    verify: string;
    cancel: string;
    confirmDisable: string;
    confirmDisableDesc: string;
    success: string;
    error: string;
  };
}

type SetupStep = 'idle' | 'enrolling' | 'verifying' | 'disabling';

const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ onStatusChange, translations: t }) => {
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<SetupStep>('idle');
  const [factor, setFactor] = useState<MFAFactor | null>(null);
  const [enrollData, setEnrollData] = useState<MFAEnrollResult | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadMFAStatus();
  }, []);

  const loadMFAStatus = async () => {
    setLoading(true);
    try {
      const factors = await getMFAFactors();
      const verifiedFactor = factors.find((f) => f.status === 'verified');
      setFactor(verifiedFactor || null);
    } catch (err) {
      console.error('Failed to load MFA status', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    setMessage(null);
    setStep('enrolling');
    setProcessing(true);
    try {
      const data = await enrollMFA('ZuriBills Authenticator');
      setEnrollData(data);
      setStep('verifying');
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || t.error });
      setStep('idle');
    } finally {
      setProcessing(false);
    }
  };

  const handleVerify = async () => {
    if (!enrollData || !verificationCode.trim()) return;
    setMessage(null);
    setProcessing(true);
    try {
      await verifyMFAEnrollment(enrollData.factorId, verificationCode.trim());
      setMessage({ type: 'success', text: t.success });
      setStep('idle');
      setEnrollData(null);
      setVerificationCode('');
      await loadMFAStatus();
      onStatusChange?.(true);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || t.error });
    } finally {
      setProcessing(false);
    }
  };

  const handleDisable = async () => {
    if (!factor) return;
    setMessage(null);
    setProcessing(true);
    try {
      await unenrollMFA(factor.id);
      setMessage({ type: 'success', text: t.success });
      setStep('idle');
      setFactor(null);
      onStatusChange?.(false);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || t.error });
    } finally {
      setProcessing(false);
    }
  };

  const copySecret = () => {
    if (enrollData?.secret) {
      navigator.clipboard.writeText(enrollData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCancel = () => {
    setStep('idle');
    setEnrollData(null);
    setVerificationCode('');
    setMessage(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted" />
      </div>
    );
  }

  const isEnabled = !!factor;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isEnabled ? 'bg-emerald-100' : 'bg-slate-100'}`}>
            {isEnabled ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            ) : (
              <Shield className="w-5 h-5 text-slate-500" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium text-foreground">{t.title}</h4>
            <p className="text-xs text-muted">{t.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${isEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
            {isEnabled ? t.enabled : t.disabled}
          </span>
          {step === 'idle' && (
            <Button
              variant={isEnabled ? 'outline' : 'primary'}
              onClick={isEnabled ? () => setStep('disabling') : handleEnroll}
              className={`text-sm px-3 py-1.5 ${isEnabled ? 'text-red-600 border-red-200 hover:bg-red-50' : ''}`}
            >
              {isEnabled ? t.disable : t.enable}
            </Button>
          )}
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
          {message.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {step === 'verifying' && enrollData && (
        <Card className="p-6 space-y-4 border-primary/20 bg-primary/5">
          <div className="text-center">
            <h4 className="font-medium text-foreground mb-2">{t.scanQrCode}</h4>
            <div className="inline-block p-4 bg-white rounded-xl border border-slate-200">
              <QRCodeSVG value={enrollData.uri} size={180} level="M" />
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted mb-2">{t.orEnterManually}</p>
            <div className="flex items-center justify-center gap-2">
              <code className="text-sm font-mono bg-slate-100 px-3 py-1.5 rounded-lg text-slate-700">
                {enrollData.secret}
              </code>
              <button
                onClick={copySecret}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                title={t.secretKey}
              >
                {copied ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-500" />
                )}
              </button>
            </div>
            {copied && <p className="text-xs text-emerald-600 mt-1">{t.copied}</p>}
          </div>

          <div className="space-y-3">
            <p className="text-sm text-center text-muted">{t.enterCode}</p>
            <Input
              label={t.verificationCode}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="text-center text-lg font-mono tracking-widest"
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleCancel} disabled={processing}>
                {t.cancel}
              </Button>
              <Button
                className="flex-1"
                onClick={handleVerify}
                isLoading={processing}
                disabled={verificationCode.length !== 6}
              >
                {t.verify}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {step === 'disabling' && (
        <Card className="p-6 space-y-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-3">
            <ShieldOff className="w-6 h-6 text-red-600" />
            <div>
              <h4 className="font-medium text-red-900">{t.confirmDisable}</h4>
              <p className="text-sm text-red-700">{t.confirmDisableDesc}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleCancel} disabled={processing}>
              {t.cancel}
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={handleDisable}
              isLoading={processing}
            >
              {t.disable}
            </Button>
          </div>
        </Card>
      )}

      {step === 'enrolling' && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
};

export default TwoFactorSetup;
