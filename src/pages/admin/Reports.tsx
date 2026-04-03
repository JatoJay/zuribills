import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Select } from '@/components/ui';
import { getCashFlowReportBySlug } from '@/services/reports';
import { getExpenses } from '@/services/storage';
import { CashFlowReport, Expense, ReportPeriod } from '@/types';
import { useAdminContext } from './AdminLayout';
import { Download, FileText, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

const monthOptions = [
  { label: 'January', value: '1' },
  { label: 'February', value: '2' },
  { label: 'March', value: '3' },
  { label: 'April', value: '4' },
  { label: 'May', value: '5' },
  { label: 'June', value: '6' },
  { label: 'July', value: '7' },
  { label: 'August', value: '8' },
  { label: 'September', value: '9' },
  { label: 'October', value: '10' },
  { label: 'November', value: '11' },
  { label: 'December', value: '12' },
];

const Reports: React.FC = () => {
  const { org, formatMoney } = useAdminContext();
  const translationStrings = useMemo(() => ([
    'Cash Flow Reports',
    'Track inflow (paid invoices) and outflow (paid expenses) for tax filing.',
    'Refresh',
    'Export PDF',
    'Export CSV',
    'Report Period',
    'Monthly',
    'Yearly',
    'Year',
    'Month',
    'Showing yearly totals.',
    'Vendor',
    'Category',
    'All vendors',
    'All categories',
    'Uncategorized',
    'Total Inflow',
    'Total Outflow',
    'Net Cash Flow',
    'Breakdown',
    'invoices',
    'expenses',
    'Period',
    'Inflow',
    'Outflow',
    'Net',
    'No report generated yet.',
    'Generating report...',
    'Expense Categories',
    'No expenses match the selected filters.',
    'Preparing category totals...',
    'Cash Flow Report',
    'Authorized Signatory',
    'Failed to load report.',
    'Filters',
    'Totals',
    'Label',
    'Count',
    'Currency',
    'Filters:',
    'Tax ID:',
    'Generated',
    'CASH FLOW',
    'Cash Flow Breakdown',
    'No expenses match the selected filters.',
    'Prepared for tax filing. Totals reflect PAID invoices and PAID expenses within the selected period and filters.',
    'Unable to open report preview. Please allow popups.',
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
    'All',
    'Category',
  ]), []);
  const { t } = useTranslation(translationStrings);
  const now = new Date();
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [report, setReport] = useState<CashFlowReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vendorFilter, setVendorFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const yearOptions = useMemo(() => {
    const currentYear = now.getFullYear();
    return Array.from({ length: 5 }, (_, idx) => {
      const value = String(currentYear - idx);
      return { label: value, value };
    });
  }, [now]);

  const vendorOptions = useMemo(() => {
    const vendors = Array.from(new Set(expenses.map(expense => expense.vendorName.trim()).filter(Boolean)));
    return [{ label: t('All vendors'), value: '' }, ...vendors.map(vendor => ({ label: vendor, value: vendor }))];
  }, [expenses, t]);

  const categoryOptions = useMemo(() => {
    const categories = Array.from(new Set(expenses.map(expense => (expense.category?.trim() || 'Uncategorized'))));
    return [
      { label: t('All categories'), value: '' },
      ...categories.map(category => ({
        label: category === 'Uncategorized' ? t('Uncategorized') : category,
        value: category,
      })),
    ];
  }, [expenses, t]);

  const localizedMonthOptions = useMemo(() => (
    monthOptions.map(option => ({
      ...option,
      label: t(option.label),
    }))
  ), [t]);

  const loadReport = async () => {
    setLoading(true);
    setError('');
    try {
      const reportData = await getCashFlowReportBySlug(org.slug, {
        period,
        year: Number(year),
        month: period === 'monthly' ? Number(month) : undefined,
        expenseVendor: vendorFilter || undefined,
        expenseCategory: categoryFilter || undefined,
      });
      setReport(reportData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || t('Failed to load report.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (org) {
      loadReport();
    }
  }, [org, period, year, month, vendorFilter, categoryFilter]);

  useEffect(() => {
    if (org) {
      getExpenses(org.id).then(setExpenses);
    }
  }, [org]);

  const downloadCsv = () => {
    if (!report) return;
    const rows: string[][] = [
      [t('Label'), t('Inflow'), t('Outflow'), t('Net')],
      [
        t('Filters'),
        vendorFilter ? `${t('Vendor')}: ${vendorFilter}` : `${t('Vendor')}: ${t('All')}`,
        categoryFilter ? `${t('Category')}: ${categoryFilter}` : `${t('Category')}: ${t('All')}`,
        '',
      ],
      ...report.breakdown.map(row => [
        row.label,
        row.inflow.toFixed(2),
        row.outflow.toFixed(2),
        row.net.toFixed(2),
      ]),
      [t('Totals'), report.totals.inflow.toFixed(2), report.totals.outflow.toFixed(2), report.totals.net.toFixed(2)],
    ];

    if (report.expenseCategories?.length) {
      rows.push(['', '', '', '']);
      rows.push([t('Expense Categories'), '', '', '']);
      rows.push([t('Category'), t('Total Outflow'), t('Count'), '']);
      rows.push(...report.expenseCategories.map(category => [
        category.category,
        category.total.toFixed(2),
        String(category.count),
        '',
      ]));
    }

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const label = period === 'monthly' ? `${year}-${month}` : year;
    anchor.download = `cashflow-${label}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const openPdfReport = () => {
    if (!report) return;
    const reportTitle = t('Cash Flow Report');
    const periodLabel = report.period === 'monthly'
      ? `${new Date(report.year, (report.month || 1) - 1, 1).toLocaleString('default', { month: 'long' })} ${report.year}`
      : `${report.year}`;
    const brandColor = org.primaryColor || '#0EA5A4';
    const taxId = org.taxId?.trim() || 'N/A';
    const signatoryName = org.signatoryName?.trim() || org.name;
    const signatoryTitle = org.signatoryTitle?.trim() || t('Authorized Signatory');
    const initials = org.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('') || 'IF';
    const logoMarkup = org.logoUrl
      ? `<img src="${org.logoUrl}" alt="${org.name} logo" />`
      : `<div class="logo-fallback">${initials}</div>`;
    const addressParts = org.address
      ? [
        org.address.street,
        [org.address.city, org.address.state, org.address.zip].filter(Boolean).join(', '),
        org.address.country,
      ].filter(Boolean)
      : [];
    const addressHtml = addressParts.length ? `<div class="brand-meta">${addressParts.join('<br />')}</div>` : '';
    const contactLine = [org.contactEmail, org.contactPhone].filter(Boolean).join(' · ');
    const rowsHtml = report.breakdown.map((row) => (
      `<tr>
        <td>${row.label}</td>
        <td>${formatMoney(row.inflow, report.currency)}</td>
        <td>${formatMoney(row.outflow, report.currency)}</td>
        <td>${formatMoney(row.net, report.currency)}</td>
      </tr>`
    )).join('');
    const categoryRowsHtml = report.expenseCategories?.map((category) => (
      `<tr>
        <td>${category.category}</td>
        <td>${formatMoney(category.total, report.currency)}</td>
        <td>${category.count}</td>
      </tr>`
    )).join('');
    const categoryTableHtml = report.expenseCategories?.length ? `
      <div class="section-title">${t('Expense Categories')}</div>
      <table>
        <thead>
          <tr>
            <th>${t('Category')}</th>
            <th>${t('Total Outflow')}</th>
            <th>${t('Count')}</th>
          </tr>
        </thead>
        <tbody>
          ${categoryRowsHtml}
        </tbody>
      </table>
    ` : `
      <div class="section-title">${t('Expense Categories')}</div>
      <div class="empty-state">${t('No expenses match the selected filters.')}</div>
    `;

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${reportTitle}</title>
          <style>
            :root { --brand: ${brandColor}; }
            body { font-family: 'Manrope', Arial, sans-serif; color: #0b0b0b; margin: 40px; }
            .header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; }
            .brand { display: flex; gap: 12px; align-items: center; }
            .logo { width: 56px; height: 56px; border-radius: 14px; border: 1px solid #e2e8f0; background: #f8fafc; overflow: hidden; display: flex; align-items: center; justify-content: center; }
            .logo img { width: 100%; height: 100%; object-fit: cover; }
            .logo-fallback { font-weight: 700; color: var(--brand); font-size: 18px; }
            .brand-name { font-size: 18px; font-weight: 700; margin-bottom: 2px; }
            .brand-meta { font-size: 12px; color: #64748b; line-height: 1.4; }
            .report-block { text-align: right; }
            .report-title { font-size: 22px; font-weight: 700; margin: 0; }
            .report-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
            .pill { display: inline-block; margin-top: 10px; padding: 6px 12px; border-radius: 999px; background: #e2f7f6; color: #0f766e; font-size: 11px; font-weight: 600; }
            .meta { margin-top: 20px; display: flex; justify-content: space-between; gap: 12px; font-size: 12px; color: #64748b; }
            .meta strong { color: #0b0b0b; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 24px; }
            .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #ffffff; }
            .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; }
            .value { font-size: 18px; font-weight: 700; margin-top: 6px; }
            .section-title { margin-top: 28px; font-size: 14px; font-weight: 700; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
            th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
            th { background: #f8fafc; font-weight: 600; color: #475569; }
            .empty-state { font-size: 12px; color: #64748b; margin-top: 10px; }
            .signature { margin-top: 36px; display: flex; justify-content: flex-end; }
            .signature-block { width: 220px; text-align: left; }
            .signature-line { border-top: 1px solid #94a3b8; margin-bottom: 6px; }
            .signature-name { font-weight: 600; font-size: 13px; }
            .signature-title { font-size: 12px; color: #64748b; }
            .footer { margin-top: 28px; font-size: 11px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">
              <div class="logo">${logoMarkup}</div>
              <div>
              <div class="brand-name">${org.name}</div>
              <div class="brand-meta">${t('Tax ID:')} ${taxId}</div>
              ${addressHtml}
              ${contactLine ? `<div class="brand-meta">${contactLine}</div>` : ''}
            </div>
          </div>
          <div class="report-block">
            <h1 class="report-title">${reportTitle}</h1>
            <div class="report-sub">${periodLabel} · ${t('Generated')} ${new Date().toLocaleDateString()}</div>
            <div class="pill">${report.period.toUpperCase()} ${t('CASH FLOW')}</div>
          </div>
        </div>

        <div class="meta">
          <div><strong>${t('Filters:')}</strong> ${t('Vendor')} ${vendorFilter || t('All')} · ${t('Category')} ${categoryFilter || t('All')}</div>
          <div><strong>${t('Currency')}:</strong> ${report.currency}</div>
        </div>

        <div class="summary">
          <div class="card">
            <div class="label">${t('Total Inflow')}</div>
            <div class="value">${formatMoney(report.totals.inflow, report.currency)}</div>
          </div>
          <div class="card">
            <div class="label">${t('Total Outflow')}</div>
            <div class="value">${formatMoney(report.totals.outflow, report.currency)}</div>
          </div>
          <div class="card">
            <div class="label">${t('Net Cash Flow')}</div>
            <div class="value">${formatMoney(report.totals.net, report.currency)}</div>
          </div>
        </div>

        <div class="section-title">${t('Cash Flow Breakdown')}</div>
        <table>
          <thead>
            <tr>
              <th>${t('Period')}</th>
              <th>${t('Inflow')}</th>
              <th>${t('Outflow')}</th>
              <th>${t('Net')}</th>
            </tr>
          </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          ${categoryTableHtml}

          <div class="signature">
            <div class="signature-block">
              <div class="signature-line"></div>
              <div class="signature-name">${signatoryName}</div>
              <div class="signature-title">${signatoryTitle}</div>
            </div>
        </div>

        <div class="footer">
          ${t('Prepared for tax filing. Totals reflect PAID invoices and PAID expenses within the selected period and filters.')}
        </div>
      </body>
    </html>
  `;

    const printWindow = window.open('', 'cashflow-report');
    if (!printWindow) {
      alert(t('Unable to open report preview. Please allow popups.'));
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (!org.id) return <div className="p-8">Loading...</div>;
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('Cash Flow Reports')}</h2>
          <p className="text-sm text-muted">{t('Track inflow (paid invoices) and outflow (paid expenses) for tax filing.')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadReport} isLoading={loading}>
            <RefreshCw className="w-4 h-4 mr-2" /> {t('Refresh')}
          </Button>
          <Button variant="outline" onClick={openPdfReport} disabled={!report}>
            <FileText className="w-4 h-4 mr-2" /> {t('Export PDF')}
          </Button>
          <Button onClick={downloadCsv} disabled={!report}>
            <Download className="w-4 h-4 mr-2" /> {t('Export CSV')}
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <Select
            label={t('Report Period')}
            options={[
              { label: t('Monthly'), value: 'monthly' },
              { label: t('Yearly'), value: 'yearly' },
            ]}
            value={period}
            onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
          />
          <Select
            label={t('Year')}
            options={yearOptions}
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
          {period === 'monthly' ? (
            <Select
              label={t('Month')}
              options={localizedMonthOptions}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          ) : (
            <div className="flex items-end">
              <div className="text-xs text-muted">{t('Showing yearly totals.')}</div>
            </div>
          )}
          <Select
            label={t('Vendor')}
            options={vendorOptions}
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
          />
          <Select
            label={t('Category')}
            options={categoryOptions}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          />
        </div>
      </Card>

      {error && (
        <Card className="p-4 border border-red-200 bg-red-50 text-red-700">
          {error}
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="text-sm text-muted">{t('Total Inflow')}</div>
          <div className="text-2xl font-semibold text-foreground mt-2">{report ? formatMoney(report.totals.inflow, report.currency) : '--'}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted">{t('Total Outflow')}</div>
          <div className="text-2xl font-semibold text-foreground mt-2">{report ? formatMoney(report.totals.outflow, report.currency) : '--'}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted">{t('Net Cash Flow')}</div>
          <div className={`text-2xl font-semibold mt-2 ${report && report.totals.net < 0 ? 'text-red-600' : 'text-foreground'}`}>
            {report ? formatMoney(report.totals.net, report.currency) : '--'}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-surface/60 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-foreground">{t('Breakdown')}</div>
            {report && (
              <div className="text-xs text-muted">
                {new Date(report.startDate).toLocaleDateString()} - {new Date(report.endDate).toLocaleDateString()}
              </div>
            )}
          </div>
          {report && (
            <div className="text-xs text-muted">
              {report.counts.invoices} {t('invoices')} • {report.counts.expenses} {t('expenses')}
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface/40 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-muted font-medium">{t('Period')}</th>
                <th className="px-6 py-3 text-muted font-medium">{t('Inflow')}</th>
                <th className="px-6 py-3 text-muted font-medium">{t('Outflow')}</th>
                <th className="px-6 py-3 text-muted font-medium">{t('Net')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {report?.breakdown.map(row => (
                <tr key={row.label}>
                  <td className="px-6 py-3 text-foreground font-medium">{row.label}</td>
                  <td className="px-6 py-3 text-foreground">{formatMoney(row.inflow, report.currency)}</td>
                  <td className="px-6 py-3 text-foreground">{formatMoney(row.outflow, report.currency)}</td>
                  <td className={`px-6 py-3 font-semibold ${row.net < 0 ? 'text-red-600' : 'text-foreground'}`}>
                    {formatMoney(row.net, report.currency)}
                  </td>
                </tr>
              ))}
              {!report && !loading && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted">{t('No report generated yet.')}</td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted">{t('Generating report...')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-surface/60 flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground">{t('Expense Categories')}</div>
          {report && (
            <div className="text-xs text-muted">
              {vendorFilter ? `${t('Vendor')}: ${vendorFilter}` : t('All vendors')} · {categoryFilter ? `${t('Category')}: ${categoryFilter}` : t('All categories')}
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface/40 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-muted font-medium">{t('Category')}</th>
                <th className="px-6 py-3 text-muted font-medium">{t('Total Outflow')}</th>
                <th className="px-6 py-3 text-muted font-medium">{t('Count')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {report?.expenseCategories.map(category => (
                <tr key={category.category}>
                  <td className="px-6 py-3 text-foreground font-medium">{category.category}</td>
                  <td className="px-6 py-3 text-foreground">{formatMoney(category.total, report.currency)}</td>
                  <td className="px-6 py-3 text-foreground">{category.count}</td>
                </tr>
              ))}
              {report && report.expenseCategories.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-muted">{t('No expenses match the selected filters.')}</td>
                </tr>
              )}
              {!report && !loading && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-muted">{t('No report generated yet.')}</td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-muted">{t('Preparing category totals...')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Reports;
