import React, { useMemo } from 'react';
import { Shield, AlertTriangle, CheckCircle, X, Info } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { ComplianceResult, ComplianceIssue } from '@/services/geminiService';
import { useTranslation } from '@/hooks/useTranslation';

interface ComplianceModalProps {
    result: ComplianceResult | null;
    isOpen: boolean;
    onClose: () => void;
    isLoading: boolean;
}

const ComplianceModal: React.FC<ComplianceModalProps> = ({ result, isOpen, onClose, isLoading }) => {
    const translationStrings = useMemo(() => ([
        'Compliance Audit',
        'AI-Powered Risk Assessment',
        'Analyzing invoice against compliance rules...',
        'Compliance Score',
        'Detected Issues',
        'No Issues Found',
        'This invoice looks compliant!',
        'Suggestion:',
        'No results to display.',
        'Close Report',
    ]), []);
    const { t } = useTranslation(translationStrings);
    if (!isOpen) return null;

    // Helper for severity styles
    const getSeverityStyles = (severity: ComplianceIssue['severity']) => {
        switch (severity) {
            case 'high': return 'bg-red-50 text-red-900 border-red-200';
            case 'medium': return 'bg-amber-50 text-amber-900 border-amber-200';
            case 'low': return 'bg-blue-50 text-blue-900 border-blue-200';
        }
    };

    const getSeverityIcon = (severity: ComplianceIssue['severity']) => {
        switch (severity) {
            case 'high': return <X className="w-5 h-5 text-red-500" />;
            case 'medium': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
            case 'low': return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <Card className="w-full max-w-lg bg-white dark:bg-slate-900 relative shadow-2xl animate-fade-in-up max-h-[80vh] flex flex-col">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                            <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold dark:text-white">{t('Compliance Audit')}</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{t('AI-Powered Risk Assessment')}</p>
                        </div>
                    </div>

                <div className="p-6 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
                            <p className="text-sm text-slate-500 animate-pulse">{t('Analyzing invoice against compliance rules...')}</p>
                        </div>
                    ) : result ? (
                        <div className="space-y-6">
                            {/* Score Section */}
                            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                <span className="font-medium text-slate-700 dark:text-slate-300">{t('Compliance Score')}</span>
                                <div className={`px-4 py-1.5 rounded-full font-bold text-lg flex items-center gap-2 ${result.score >= 90 ? 'bg-green-100 text-green-700' :
                                        result.score >= 70 ? 'bg-amber-100 text-amber-700' :
                                            'bg-red-100 text-red-700'
                                    }`}>
                                    {result.score >= 90 && <CheckCircle className="w-5 h-5" />}
                                    {result.score}/100
                                </div>
                            </div>

                            {/* Issues List */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                    {result.issues.length > 0 ? t('Detected Issues') : t('No Issues Found')}
                                </h3>

                                {result.issues.length === 0 && (
                                    <div className="text-center py-8 text-slate-500">
                                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2 opacity-50" />
                                        <p>{t('This invoice looks compliant!')}</p>
                                    </div>
                                )}

                                {result.issues.map((issue, idx) => (
                                    <div key={idx} className={`p-4 rounded-lg border flex gap-3 ${getSeverityStyles(issue.severity)}`}>
                                        <div className="shrink-0 mt-0.5">
                                            {getSeverityIcon(issue.severity)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm">{issue.message}</div>
                                            <div className="text-xs mt-1 opacity-90">{t('Suggestion:')} {issue.suggestion}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-slate-500">{t('No results to display.')}</div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <Button onClick={onClose} variant="outline">{t('Close Report')}</Button>
                </div>
            </Card>
        </div>
    );
};

export default ComplianceModal;
