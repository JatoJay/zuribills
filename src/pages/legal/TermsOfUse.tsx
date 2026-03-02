import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Zap } from 'lucide-react';

const TermsOfUse: React.FC = () => {
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
                <h1 className="text-4xl font-display font-bold text-slate-900 mb-4">Terms of Use</h1>
                <p className="text-slate-500 mb-12">Last updated: February 2026</p>

                <div className="prose prose-slate max-w-none">
                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">1. Acceptance of Terms</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            By accessing or using ZuriBills ("the Service"), you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use our Service.
                        </p>
                        <p className="text-slate-600 leading-relaxed">
                            These terms apply to all users of the Service, including business owners, team members, and clients who access invoices or catalogs.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">2. Description of Service</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            ZuriBills is a business management platform that provides:
                        </p>
                        <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
                            <li>Invoice creation, management, and payment processing</li>
                            <li>Client catalog and service showcasing</li>
                            <li>Expense tracking and financial reporting</li>
                            <li>AI-powered payment reminders and business insights</li>
                            <li>Team collaboration and multi-user access</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">3. Account Registration</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            To use ZuriBills, you must create an account and provide accurate, complete information. You are responsible for:
                        </p>
                        <ul className="list-disc pl-6 text-slate-600 space-y-2">
                            <li>Maintaining the confidentiality of your account credentials</li>
                            <li>All activities that occur under your account</li>
                            <li>Notifying us immediately of any unauthorized use</li>
                            <li>Ensuring your contact information remains current</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">4. Subscription and Payments</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            ZuriBills offers subscription-based pricing with a free trial period. By subscribing, you agree to:
                        </p>
                        <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
                            <li>Pay all applicable fees according to your chosen plan</li>
                            <li>Automatic renewal unless cancelled before the billing cycle</li>
                            <li>Provide valid payment information</li>
                        </ul>
                        <p className="text-slate-600 leading-relaxed">
                            Refunds are provided at our discretion and in accordance with our refund policy.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">5. Acceptable Use</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            You agree NOT to use ZuriBills to:
                        </p>
                        <ul className="list-disc pl-6 text-slate-600 space-y-2">
                            <li>Violate any applicable laws or regulations</li>
                            <li>Infringe on intellectual property rights</li>
                            <li>Transmit malicious code or interfere with the Service</li>
                            <li>Engage in fraudulent activities or misrepresent your identity</li>
                            <li>Send spam or unauthorized marketing communications</li>
                            <li>Collect data from other users without consent</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">6. Intellectual Property</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            ZuriBills and its original content, features, and functionality are owned by X-Labs and are protected by international copyright, trademark, and other intellectual property laws.
                        </p>
                        <p className="text-slate-600 leading-relaxed">
                            You retain ownership of all data and content you upload to the Service. By using ZuriBills, you grant us a limited license to process and display your content as necessary to provide the Service.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">7. Data and Privacy</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Your use of ZuriBills is also governed by our Privacy Policy. We are committed to protecting your data and maintaining confidentiality of your business information.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">8. Service Availability</h2>
                        <p className="text-slate-600 leading-relaxed">
                            We strive to maintain 99.9% uptime but do not guarantee uninterrupted access. We may temporarily suspend the Service for maintenance, updates, or circumstances beyond our control.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">9. Limitation of Liability</h2>
                        <p className="text-slate-600 leading-relaxed">
                            To the maximum extent permitted by law, ZuriBills and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">10. Termination</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users or the Service.
                        </p>
                        <p className="text-slate-600 leading-relaxed">
                            Upon termination, your right to use the Service will cease immediately. You may export your data before termination.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">11. Changes to Terms</h2>
                        <p className="text-slate-600 leading-relaxed">
                            We reserve the right to modify these terms at any time. We will notify users of significant changes via email or in-app notification. Continued use after changes constitutes acceptance of the new terms.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">12. Contact Us</h2>
                        <p className="text-slate-600 leading-relaxed">
                            If you have questions about these Terms of Use, please contact us at:
                        </p>
                        <p className="text-slate-600 mt-4">
                            <strong>Email:</strong> legal@zuribills.com<br />
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

export default TermsOfUse;
