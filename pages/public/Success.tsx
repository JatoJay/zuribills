import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button, Card } from '../../components/ui';
import { CheckCircle, FileText } from 'lucide-react';

const Success: React.FC = () => {
  const { slug, invoiceId } = useParams<{ slug: string, invoiceId: string }>();

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="bg-green-100 p-4 rounded-full text-green-600 mb-6">
            <CheckCircle className="w-12 h-12" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
        <p className="text-slate-500 mb-8 max-w-md">
            Your invoice has been generated successfully. A copy has been sent to your email address.
        </p>

        <div className="flex gap-4">
            <Link to={`/catalog/${slug}/invoice/${invoiceId}`}>
                <Button variant="outline">
                    <FileText className="w-4 h-4 mr-2" /> View Invoice
                </Button>
            </Link>
            <Link to={`/catalog/${slug}`}>
                <Button>Return to Store</Button>
            </Link>
        </div>
    </div>
  );
};

export default Success;
