import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Zap } from 'lucide-react';

const Cookies: React.FC = () => {
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
                <h1 className="text-4xl font-display font-bold text-slate-900 mb-4">Cookie Policy</h1>
                <p className="text-slate-500 mb-12">Last updated: February 2026</p>

                <div className="prose prose-slate max-w-none">
                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">What Are Cookies?</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and provide information to website owners.
                        </p>
                        <p className="text-slate-600 leading-relaxed">
                            ZuriBills uses cookies and similar technologies to enhance your experience, analyze usage, and assist in our marketing efforts.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Types of Cookies We Use</h2>

                        <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">Essential Cookies</h3>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            These cookies are necessary for the website to function properly. They enable core functionality such as:
                        </p>
                        <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
                            <li>User authentication and session management</li>
                            <li>Security features and fraud prevention</li>
                            <li>Remembering your preferences and settings</li>
                            <li>Shopping cart and checkout functionality</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">Analytics Cookies</h3>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously:
                        </p>
                        <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
                            <li>Pages visited and time spent on each page</li>
                            <li>Error messages and loading times</li>
                            <li>How you arrived at our website</li>
                            <li>Device and browser information</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">Functional Cookies</h3>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            These cookies enable enhanced functionality and personalization:
                        </p>
                        <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
                            <li>Language and region preferences</li>
                            <li>Currency display settings</li>
                            <li>Theme preferences (light/dark mode)</li>
                            <li>Recently viewed items</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">Marketing Cookies</h3>
                        <p className="text-slate-600 leading-relaxed">
                            These cookies may be set by our advertising partners to build a profile of your interests and show you relevant advertisements on other sites. They do not directly store personal information but uniquely identify your browser and device.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Third-Party Cookies</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            Some cookies are placed by third-party services that appear on our pages. We use the following third-party services:
                        </p>
                        <ul className="list-disc pl-6 text-slate-600 space-y-2">
                            <li><strong>Google Analytics:</strong> For website analytics and performance monitoring</li>
                            <li><strong>Supabase:</strong> For authentication and database services</li>
                            <li><strong>Flutterwave:</strong> For payment processing</li>
                            <li><strong>Vercel:</strong> For website hosting and analytics</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Local Storage</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            In addition to cookies, we use local storage to store:
                        </p>
                        <ul className="list-disc pl-6 text-slate-600 space-y-2">
                            <li>Your language preference</li>
                            <li>Translation cache for faster page loads</li>
                            <li>Theme settings</li>
                            <li>Session information</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Managing Cookies</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            You can control and manage cookies in several ways:
                        </p>

                        <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">Browser Settings</h3>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            Most browsers allow you to manage cookie preferences through their settings. You can:
                        </p>
                        <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
                            <li>View and delete cookies</li>
                            <li>Block all cookies</li>
                            <li>Block third-party cookies only</li>
                            <li>Clear cookies when you close your browser</li>
                        </ul>

                        <p className="text-slate-600 leading-relaxed">
                            Please note that blocking essential cookies may impact the functionality of ZuriBills and prevent you from using certain features.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Cookie Retention</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Different cookies have different retention periods:
                        </p>
                        <ul className="list-disc pl-6 text-slate-600 space-y-2 mt-4">
                            <li><strong>Session cookies:</strong> Deleted when you close your browser</li>
                            <li><strong>Persistent cookies:</strong> Remain until they expire or you delete them (typically 30 days to 1 year)</li>
                            <li><strong>Authentication cookies:</strong> Expire after your session ends or after 30 days of inactivity</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Updates to This Policy</h2>
                        <p className="text-slate-600 leading-relaxed">
                            We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by updating the date at the top of this policy.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Contact Us</h2>
                        <p className="text-slate-600 leading-relaxed">
                            If you have questions about our use of cookies, please contact us at:
                        </p>
                        <p className="text-slate-600 mt-4">
                            <strong>Email:</strong> privacy@zuribills.com<br />
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

export default Cookies;
