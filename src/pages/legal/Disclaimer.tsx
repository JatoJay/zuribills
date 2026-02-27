import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Zap } from 'lucide-react';

const Disclaimer: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white">
            <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate({ to: '/' })}>
                        <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                            <Zap className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-display text-lg font-semibold">
                            <span className="text-black">Zuri</span><span className="text-primary">Bills</span>
                        </span>
                    </div>
                    <button
                        onClick={() => navigate({ to: '/' })}
                        className="flex items-center gap-2 text-sm text-slate-600 hover:text-black transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-16">
                <h1 className="text-4xl font-display font-bold text-slate-900 mb-4">Disclaimer</h1>
                <p className="text-slate-500 mb-12">Last updated: February 2026</p>

                <div className="prose prose-slate max-w-none">
                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">General Information</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            The information provided by ZuriBills ("we," "us," or "our") on zuribills.com and through our application is for general informational purposes only. All information on the Service is provided in good faith; however, we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any information on the Service.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Not Financial Advice</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            ZuriBills is a business management tool that provides invoicing, expense tracking, and financial reporting features. The Service is NOT intended to provide:
                        </p>
                        <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
                            <li>Professional financial advice</li>
                            <li>Tax advice or tax preparation services</li>
                            <li>Legal advice</li>
                            <li>Investment recommendations</li>
                            <li>Accounting services</li>
                        </ul>
                        <p className="text-slate-600 leading-relaxed">
                            You should consult with qualified professionals (accountants, tax advisors, lawyers) for advice specific to your situation. Any reliance you place on information from ZuriBills is strictly at your own risk.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">AI-Generated Content</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            ZuriBills uses artificial intelligence to provide features such as:
                        </p>
                        <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
                            <li>Payment reminder drafts</li>
                            <li>Business insights and analytics</li>
                            <li>Content suggestions</li>
                            <li>Language translations</li>
                        </ul>
                        <p className="text-slate-600 leading-relaxed">
                            AI-generated content is provided as suggestions only and should be reviewed before use. We do not guarantee the accuracy, appropriateness, or effectiveness of AI-generated content for your specific needs.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Payment Processing</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            ZuriBills integrates with third-party payment processors (including Flutterwave and others) to facilitate payment collection. We are not responsible for:
                        </p>
                        <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
                            <li>Payment processing errors by third-party providers</li>
                            <li>Currency conversion rates or fees charged by payment processors</li>
                            <li>Delays in fund settlement</li>
                            <li>Disputes between you and your clients regarding payments</li>
                        </ul>
                        <p className="text-slate-600 leading-relaxed">
                            Payment processing is subject to the terms and conditions of the respective payment providers.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Third-Party Links</h2>
                        <p className="text-slate-600 leading-relaxed">
                            The Service may contain links to third-party websites or services that are not owned or controlled by ZuriBills. We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third-party websites or services.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">No Guarantees</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            While we strive to provide a reliable service, we do not guarantee:
                        </p>
                        <ul className="list-disc pl-6 text-slate-600 space-y-2">
                            <li>That your clients will pay invoices sent through our Service</li>
                            <li>Any specific business outcomes or revenue increases</li>
                            <li>Uninterrupted or error-free service availability</li>
                            <li>That the Service will meet all your specific requirements</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Limitation of Liability</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Under no circumstance shall we have any liability to you for any loss or damage of any kind incurred as a result of the use of the Service or reliance on any information provided on the Service. Your use of the Service and your reliance on any information on the Service is solely at your own risk.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Changes to This Disclaimer</h2>
                        <p className="text-slate-600 leading-relaxed">
                            We reserve the right to update this disclaimer at any time. We will notify you of any changes by posting the new disclaimer on this page and updating the "Last updated" date.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Contact Us</h2>
                        <p className="text-slate-600 leading-relaxed">
                            If you have any questions about this Disclaimer, please contact us at:
                        </p>
                        <p className="text-slate-600 mt-4">
                            <strong>Email:</strong> support@zuribills.com<br />
                            <strong>Address:</strong> X-Labs, Kigali, Rwanda
                        </p>
                    </section>
                </div>
            </main>

            <footer className="border-t border-slate-200 py-8">
                <div className="max-w-4xl mx-auto px-6 text-center text-sm text-slate-500">
                    © 2026 ZuriBills. All rights reserved.
                </div>
            </footer>
        </div>
    );
};

export default Disclaimer;
