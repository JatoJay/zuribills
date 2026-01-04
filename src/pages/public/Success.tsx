import React, { useMemo } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui';
import { CheckCircle, FileText } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

const Success: React.FC = () => {
    const params = useParams({ strict: false });
    const slug = (params as any).slug;
    const invoiceId = (params as any).invoiceId;
    const translationStrings = useMemo(() => ([
        'Order Confirmed!',
        'Your invoice has been generated successfully. A copy has been sent to your email address.',
        'View Invoice',
        'Return to Store',
    ]), []);
    const { t } = useTranslation(translationStrings);

    return (
        <div className="flex min-h-[calc(100vh-8rem)] w-full flex-col items-center justify-center px-4 text-center">
            <div className="w-full max-w-xl">
                <div className="bg-green-500/10 p-4 rounded-full text-green-500 mb-6 inline-flex">
                    <CheckCircle className="w-12 h-12" />
                </div>
                <h1 className="text-3xl font-bold mb-2 text-foreground">{t('Order Confirmed!')}</h1>
                <p className="text-muted mb-8 max-w-md mx-auto">
                    {t('Your invoice has been generated successfully. A copy has been sent to your email address.')}
                </p>

                <div className="flex w-full flex-wrap items-center justify-center gap-4">
                    <Link to="/catalog/$slug/invoice/$invoiceId" params={{ slug, invoiceId }}>
                        <Button variant="outline">
                            <FileText className="w-4 h-4 mr-2" /> {t('View Invoice')}
                        </Button>
                    </Link>
                    <Link to="/catalog/$slug" params={{ slug }}>
                        <Button>{t('Return to Store')}</Button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Success;
