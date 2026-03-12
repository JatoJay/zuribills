import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Card, Input, Select } from '@/components/ui';
import { useAdminContext } from './AdminLayout';
import {
  createOrganization,
  getOrganizationsForUser,
  getOrganizationBySlug,
  getCurrentUserId,
  getBranchesOfOrganization,
} from '@/services/storage';
import { Organization } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { Building2, Plus, GitBranch, ChevronDown, ChevronRight } from 'lucide-react';
import { resolveDefaultCurrency, resolvePayoutProvider } from '@/services/paymentRouting';
import { SUPPORTED_LANGUAGES } from '@/constants/languages';
import { usePrompt } from '@/context/PromptContext';

type CountryOption = {
  code: string;
  name: string;
  currencyCode: string;
  currencyName: string;
};

const fallbackCountries: CountryOption[] = [
  { code: 'NG', name: 'Nigeria', currencyCode: 'NGN', currencyName: 'Nigerian Naira' },
  { code: 'GH', name: 'Ghana', currencyCode: 'GHS', currencyName: 'Ghanaian Cedi' },
  { code: 'KE', name: 'Kenya', currencyCode: 'KES', currencyName: 'Kenyan Shilling' },
  { code: 'RW', name: 'Rwanda', currencyCode: 'RWF', currencyName: 'Rwandan Franc' },
  { code: 'ZA', name: 'South Africa', currencyCode: 'ZAR', currencyName: 'South African Rand' },
  { code: 'EG', name: 'Egypt', currencyCode: 'EGP', currencyName: 'Egyptian Pound' },
  { code: 'US', name: 'United States', currencyCode: 'USD', currencyName: 'US Dollar' },
  { code: 'GB', name: 'United Kingdom', currencyCode: 'GBP', currencyName: 'British Pound' },
  { code: 'CA', name: 'Canada', currencyCode: 'CAD', currencyName: 'Canadian Dollar' },
  { code: 'FR', name: 'France', currencyCode: 'EUR', currencyName: 'Euro' },
  { code: 'DE', name: 'Germany', currencyCode: 'EUR', currencyName: 'Euro' },
  { code: 'IN', name: 'India', currencyCode: 'INR', currencyName: 'Indian Rupee' },
  { code: 'AE', name: 'United Arab Emirates', currencyCode: 'AED', currencyName: 'UAE Dirham' },
  { code: 'AU', name: 'Australia', currencyCode: 'AUD', currencyName: 'Australian Dollar' },
];

const Businesses: React.FC = () => {
  const { org, account } = useAdminContext();
  const navigate = useNavigate();
  const prompt = usePrompt();
  const translationStrings = useMemo(() => ([

    'Businesses',
    'Manage multiple businesses under one account.',
    'Create Business',
    'Current',
    'Open Dashboard',
    'Business Name',
    'Contact Email',
    'Country',
    'Preferred Language',
    'Currency',
    'Select your country',
    'We will set your currency automatically.',
    'Cancel',
    'Create & Launch Dashboard',
    'Loading businesses...',
    'No businesses found yet.',
    'Create another business and keep everything organized.',
    'Create a new business',
    'Loading countries...',
    'Please select a country.',
    'Please enter your business name and contact email.',
    'Please sign in again to continue.',
    'Slug might already exist or invalid data.',
    'Create Branch',
    'Branch of',
    'Branch Code',
    'e.g. LAG-001, HQ',
    'Share clients with headquarters',
    'Share services with headquarters',
    'Headquarters',
    'Branch',
    'branches',
  ]), []);
  const { t } = useTranslation(translationStrings);

  const [businesses, setBusinesses] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    contactEmail: account?.contactEmail || org.contactEmail,
    preferredLanguage: org.preferredLanguage || 'English',
    branchCode: '',
    shareClientsWithParent: true,
    shareServicesWithParent: true,
  });
  const [parentOrgId, setParentOrgId] = useState<string | null>(null);
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [branchCounts, setBranchCounts] = useState<Record<string, number>>({});
  const [countries, setCountries] = useState<CountryOption[]>(fallbackCountries);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [countryCode, setCountryCode] = useState('');
  const [currencyInfo, setCurrencyInfo] = useState({
    code: org.currency || 'USD',
    name: 'US Dollar',
  });

  const loadBusinesses = async () => {
    setLoading(true);
    const accountId = org.accountId;
    const currentUserId = getCurrentUserId();
    if (accountId && currentUserId) {
      const orgs = await getOrganizationsForUser(currentUserId, accountId);
      setBusinesses(orgs);
      const counts: Record<string, number> = {};
      for (const business of orgs) {
        if (!business.parentOrganizationId) {
          const branches = await getBranchesOfOrganization(business.id);
          counts[business.id] = branches.length;
        }
      }
      setBranchCounts(counts);
    } else {
      setBusinesses([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadBusinesses();
  }, [org.accountId]);

  useEffect(() => {
    let isActive = true;
    const loadCountries = async () => {
      setCountriesLoading(true);
      try {
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,currencies');
        if (!response.ok) throw new Error('Failed to fetch countries');
        const data = await response.json();
        const parsed: CountryOption[] = data
          .map((country: any) => {
            const currencyEntries = country.currencies ? Object.entries(country.currencies) : [];
            const currencyCode = currencyEntries[0]?.[0];
            const currencyData = currencyEntries[0]?.[1] as { name?: string } | undefined;
            return {
              code: country.cca2,
              name: country.name?.common,
              currencyCode: currencyCode || 'USD',
              currencyName: currencyData?.name || 'US Dollar',
            };
          })
          .filter((country: CountryOption) => country.code && country.name)
          .sort((a: CountryOption, b: CountryOption) => a.name.localeCompare(b.name));

        if (isActive) {
          setCountries(parsed);
        }
      } catch (error) {
        console.error('Failed to load countries, using fallback list.', error);
        if (isActive) {
          setCountries(fallbackCountries);
        }
      } finally {
        if (isActive) {
          setCountriesLoading(false);
        }
      }
    };

    loadCountries();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const selected = countries.find((country) => country.code === countryCode);
    if (selected) {
      const resolvedCode = resolveDefaultCurrency(selected.code, selected.currencyCode);
      const currencyNames: Record<string, string> = {
        USD: 'US Dollar',
        NGN: 'Nigerian Naira',
        GHS: 'Ghanaian Cedi',
        KES: 'Kenyan Shilling',
        ZAR: 'South African Rand',
        RWF: 'Rwandan Franc',
        CAD: 'Canadian Dollar',
      };
      setCurrencyInfo({
        code: resolvedCode,
        name: currencyNames[resolvedCode] || selected.currencyName,
      });
    }
  }, [countryCode, countries]);

  const countryOptions = useMemo(() => {
    if (countriesLoading) {
      return [{ label: t('Loading countries...'), value: '' }];
    }
    return [
      { label: t('Select your country'), value: '' },
      ...countries.map(country => ({ label: country.name, value: country.code })),
    ];
  }, [countries, countriesLoading, t]);

  const generateUniqueSlug = async (name: string) => {
    const base = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'business';
    const existing = await getOrganizationBySlug(base);
    if (!existing) return base;
    let count = 2;
    let candidate = `${base}-${count}`;
    while (await getOrganizationBySlug(candidate)) {
      count += 1;
      candidate = `${base}-${count}`;
    }
    return candidate;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contactEmail: account?.contactEmail || org.contactEmail,
      preferredLanguage: org.preferredLanguage || 'English',
      branchCode: '',
      shareClientsWithParent: true,
      shareServicesWithParent: true,
    });
    setCountryCode('');
    setCurrencyInfo({ code: org.currency || 'USD', name: 'US Dollar' });
    setParentOrgId(null);
  };

  const toggleExpanded = (orgId: string) => {
    setExpandedOrgs(prev => {
      const next = new Set(prev);
      if (next.has(orgId)) {
        next.delete(orgId);
      } else {
        next.add(orgId);
      }
      return next;
    });
  };

  const openCreateBranchModal = (parentId: string) => {
    const parent = businesses.find(b => b.id === parentId);
    if (!parent) return;
    setFormData({
      name: '',
      contactEmail: parent.contactEmail,
      preferredLanguage: parent.preferredLanguage || 'English',
      branchCode: '',
      shareClientsWithParent: true,
      shareServicesWithParent: true,
    });
    setCountryCode(parent.address?.country ? countries.find(c => c.name === parent.address?.country)?.code || '' : '');
    setCurrencyInfo({ code: parent.currency, name: '' });
    setParentOrgId(parentId);
    setIsModalOpen(true);
  };

  const parentOrganizations = businesses.filter(b => !b.parentOrganizationId);
  const branchOrganizations = businesses.filter(b => b.parentOrganizationId);

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.contactEmail.trim()) {
      prompt.alert(t('Please enter your business name and contact email.'));
      return;
    }
    const selectedCountry = countries.find((country) => country.code === countryCode);
    if (!selectedCountry) {
      prompt.alert(t('Please select a country.'));
      return;
    }

    setSaving(true);
    try {
      const slug = await generateUniqueSlug(formData.name);
      const resolvedCurrency = resolveDefaultCurrency(selectedCountry.code, selectedCountry.currencyCode);
      const payoutProvider = resolvePayoutProvider(selectedCountry.code);
      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        prompt.alert(t('Please sign in again to continue.'));
        setSaving(false);
        return;
      }

      const parentBusiness = parentOrgId ? businesses.find(b => b.id === parentOrgId) : null;

      const newOrg = await createOrganization({
        accountId: org.accountId,
        ownerId: currentUserId,
        name: formData.name.trim(),
        slug,
        contactEmail: formData.contactEmail.trim(),
        currency: parentBusiness?.currency || resolvedCurrency,
        primaryColor: parentBusiness?.primaryColor || org.primaryColor || '#0EA5A4',
        catalogEnabled: true,
        preferredLanguage: formData.preferredLanguage.trim() || 'English',
        parentOrganizationId: parentOrgId || undefined,
        branchCode: formData.branchCode.trim() || undefined,
        shareClientsWithParent: parentOrgId ? formData.shareClientsWithParent : undefined,
        shareServicesWithParent: parentOrgId ? formData.shareServicesWithParent : undefined,
        paymentConfig: parentBusiness?.paymentConfig || {
          enabled: false,
          provider: payoutProvider,
          platformFeePercent: 0.7,
          bankCountry: selectedCountry.code,
        },
        address: parentBusiness?.address || {
          street: '',
          city: '',
          state: '',
          zip: '',
          country: selectedCountry.name,
        },
      });
      await loadBusinesses();
      setIsModalOpen(false);
      resetForm();
      navigate({ to: '/org/$slug', params: { slug: newOrg.slug } });
    } catch (error) {
      console.error(error);
      prompt.alert({ message: t('Slug might already exist or invalid data.'), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!org.id) return <div className="p-8">Loading...</div>;
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('Businesses')}</h2>
          <p className="text-sm text-muted">{t('Manage multiple businesses under one account.')}</p>
        </div>
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> {t('Create Business')}
        </Button>
      </div>

      {loading ? (
        <Card className="p-6 text-sm text-muted">{t('Loading businesses...')}</Card>
      ) : businesses.length === 0 ? (
        <Card className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">{t('No businesses found yet.')}</h3>
          <p className="text-sm text-muted mt-2">{t('Create another business and keep everything organized.')}</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {parentOrganizations.map((business) => {
            const branches = branchOrganizations.filter(b => b.parentOrganizationId === business.id);
            const isExpanded = expandedOrgs.has(business.id);
            const hasBranches = branches.length > 0 || branchCounts[business.id] > 0;

            return (
              <div key={business.id} className="space-y-3">
                <Card className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {hasBranches && (
                        <button
                          onClick={() => toggleExpanded(business.id)}
                          className="p-1 hover:bg-surface-variant rounded transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-muted" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted" />
                          )}
                        </button>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-foreground">{business.name}</h3>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {t('Headquarters')}
                          </span>
                        </div>
                        <p className="text-xs text-muted">/{business.slug}</p>
                        {(branches.length > 0 || branchCounts[business.id] > 0) && (
                          <p className="text-xs text-muted mt-1">
                            {branches.length || branchCounts[business.id]} {t('branches')}
                          </p>
                        )}
                      </div>
                    </div>
                    {business.id === org.id && (
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">
                        {t('Current')}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted">
                    <div>{business.contactEmail}</div>
                    <div className="mt-1">{business.currency}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate({ to: '/org/$slug', params: { slug: business.slug } })}
                    >
                      {t('Open Dashboard')}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => openCreateBranchModal(business.id)}
                      title={t('Create Branch')}
                    >
                      <GitBranch className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>

                {isExpanded && branches.length > 0 && (
                  <div className="ml-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {branches.map((branch) => (
                      <Card key={branch.id} className="p-4 space-y-3 border-l-4 border-l-primary/30">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <GitBranch className="w-3.5 h-3.5 text-muted" />
                              <h4 className="font-semibold text-foreground">{branch.name}</h4>
                              {branch.branchCode && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                  {branch.branchCode}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted">/{branch.slug}</p>
                          </div>
                          {branch.id === org.id && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              {t('Current')}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted">
                          {branch.contactEmail}
                        </div>
                        <Button
                          variant="outline"
                          className="w-full text-sm py-2"
                          onClick={() => navigate({ to: '/org/$slug', params: { slug: branch.slug } })}
                        >
                          {t('Open Dashboard')}
                        </Button>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <Card className="w-full max-w-lg p-6 relative">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {parentOrgId ? t('Create Branch') : t('Create a new business')}
            </h3>
            <form onSubmit={handleCreateBusiness} className="space-y-5">
              {parentOrgId && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                  <div className="text-xs text-primary font-medium">{t('Branch of')}</div>
                  <div className="text-sm font-semibold text-foreground mt-1">
                    {businesses.find(b => b.id === parentOrgId)?.name}
                  </div>
                </div>
              )}
              <Input
                label={parentOrgId ? t('Branch Name') : t('Business Name')}
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
              {parentOrgId && (
                <Input
                  label={t('Branch Code')}
                  placeholder={t('e.g. LAG-001, HQ')}
                  value={formData.branchCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, branchCode: e.target.value }))}
                />
              )}
              <Input
                label={t('Contact Email')}
                type="email"
                required
                value={formData.contactEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
              />
              {!parentOrgId && (
                <Select
                  label={t('Country')}
                  options={countryOptions}
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  disabled={countriesLoading}
                />
              )}
              <div className="rounded-lg border border-border bg-surface px-4 py-3">
                <div className="text-xs uppercase tracking-wider text-muted">{t('Currency')}</div>
                <div className="text-sm font-semibold text-foreground mt-1">
                  {currencyInfo.code} • {currencyInfo.name}
                </div>
                <p className="text-xs text-muted mt-1">{t('We will set your currency automatically.')}</p>
              </div>
              <div>
                <Input
                  label={t('Preferred Language')}
                  list="language-options-business"
                  value={formData.preferredLanguage}
                  onChange={(e) => setFormData(prev => ({ ...prev, preferredLanguage: e.target.value }))}
                />
                <datalist id="language-options-business">
                  {SUPPORTED_LANGUAGES.map(option => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </div>
              {parentOrgId && (
                <div className="space-y-3 rounded-lg border border-border bg-surface-variant/50 p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.shareClientsWithParent}
                      onChange={(e) => setFormData(prev => ({ ...prev, shareClientsWithParent: e.target.checked }))}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                    />
                    <span className="text-sm text-foreground">{t('Share clients with headquarters')}</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.shareServicesWithParent}
                      onChange={(e) => setFormData(prev => ({ ...prev, shareServicesWithParent: e.target.checked }))}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                    />
                    <span className="text-sm text-foreground">{t('Share services with headquarters')}</span>
                  </label>
                </div>
              )}
              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  {t('Cancel')}
                </Button>
                <Button type="submit" isLoading={saving}>
                  {t('Create & Launch Dashboard')}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Businesses;
