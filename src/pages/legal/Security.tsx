import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Zap, Shield, Lock, Server, Eye, CheckCircle } from 'lucide-react';

const Security: React.FC = () => {
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
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Shield className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-display font-bold text-slate-900">Security</h1>
                        <p className="text-slate-500">Your data protection is our priority</p>
                    </div>
                </div>
                <p className="text-slate-500 mb-12">Last updated: February 2026</p>

                <div className="grid md:grid-cols-3 gap-6 mb-16">
                    <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50">
                        <Lock className="w-8 h-8 text-primary mb-4" />
                        <h3 className="font-semibold text-slate-900 mb-2">256-bit Encryption</h3>
                        <p className="text-sm text-slate-600">All data is encrypted in transit and at rest using industry-standard AES-256 encryption.</p>
                    </div>
                    <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50">
                        <Server className="w-8 h-8 text-primary mb-4" />
                        <h3 className="font-semibold text-slate-900 mb-2">Secure Infrastructure</h3>
                        <p className="text-sm text-slate-600">Hosted on enterprise-grade cloud infrastructure with automatic backups and redundancy.</p>
                    </div>
                    <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50">
                        <Eye className="w-8 h-8 text-primary mb-4" />
                        <h3 className="font-semibold text-slate-900 mb-2">Privacy by Design</h3>
                        <p className="text-sm text-slate-600">Your business data is never sold or shared with third parties for marketing.</p>
                    </div>
                </div>

                <div className="prose prose-slate max-w-none">
                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Our Security Commitment</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            At ZuriBills, we understand that you trust us with sensitive business and financial data. We take this responsibility seriously and have implemented comprehensive security measures to protect your information.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Data Encryption</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            We use multiple layers of encryption to protect your data:
                        </p>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-slate-600"><strong>TLS 1.3:</strong> All data transmitted between your browser and our servers is encrypted using the latest TLS protocol.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-slate-600"><strong>AES-256 at rest:</strong> Your stored data is encrypted using Advanced Encryption Standard with 256-bit keys.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-slate-600"><strong>Hashed passwords:</strong> We never store passwords in plain text. All passwords are hashed using bcrypt with salt.</span>
                            </li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Authentication & Access Control</h2>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-slate-600"><strong>Two-Factor Authentication (2FA):</strong> Optional additional security layer for your account.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-slate-600"><strong>OAuth 2.0:</strong> Secure sign-in with Google using industry-standard protocols.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-slate-600"><strong>Role-based access:</strong> Control team member permissions with granular access controls.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-slate-600"><strong>Session management:</strong> Automatic session expiration and secure logout functionality.</span>
                            </li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Infrastructure Security</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            Our infrastructure is built on trusted, enterprise-grade platforms:
                        </p>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-slate-600"><strong>Supabase:</strong> SOC 2 Type II certified database and authentication provider.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-slate-600"><strong>Vercel:</strong> Enterprise-grade hosting with automatic DDoS protection and edge network.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-slate-600"><strong>Daily backups:</strong> Automated database backups with point-in-time recovery.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-slate-600"><strong>Geographic redundancy:</strong> Data replicated across multiple availability zones.</span>
                            </li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Payment Security</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            We take payment security seriously:
                        </p>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-slate-600"><strong>PCI DSS Compliance:</strong> Our payment processors (Flutterwave) are PCI DSS Level 1 certified.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-slate-600"><strong>No card storage:</strong> We never store full credit card numbers on our servers.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-slate-600"><strong>Secure payment links:</strong> All payment pages use HTTPS with valid SSL certificates.</span>
                            </li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Data Privacy</h2>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-slate-600"><strong>Data ownership:</strong> You own your data. We act only as a data processor on your behalf.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-slate-600"><strong>No data selling:</strong> We never sell your data to third parties.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-slate-600"><strong>Data export:</strong> Export your data at any time in standard formats.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-slate-600"><strong>Account deletion:</strong> Request complete deletion of your account and data.</span>
                            </li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Security Monitoring</h2>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-slate-600"><strong>24/7 monitoring:</strong> Continuous monitoring for suspicious activity and potential threats.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-slate-600"><strong>Automated alerts:</strong> Real-time alerts for unusual account activity.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-slate-600"><strong>Regular audits:</strong> Periodic security assessments and penetration testing.</span>
                            </li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Reporting Security Issues</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            If you discover a security vulnerability, please report it responsibly:
                        </p>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                            <p className="text-slate-600 mb-4">
                                <strong>Email:</strong> security@zuribills.com
                            </p>
                            <p className="text-slate-600 text-sm">
                                Please include a detailed description of the vulnerability and steps to reproduce it. We appreciate your help in keeping ZuriBills secure and will acknowledge your report within 48 hours.
                            </p>
                        </div>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Contact Us</h2>
                        <p className="text-slate-600 leading-relaxed">
                            For security-related questions or concerns:
                        </p>
                        <p className="text-slate-600 mt-4">
                            <strong>Email:</strong> security@zuribills.com<br />
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

export default Security;
