import { CashFlowReport, ReportPeriod, InvoiceStatus, ExpenseStatus } from '../types';
import { getInvoices, getExpenses, getOrganizationBySlug } from './storage';

export interface CashFlowReportOptions {
  period: ReportPeriod;
  year: number;
  month?: number; // 1-12 for monthly reports
  orgSlug?: string;
  expenseVendor?: string;
  expenseCategory?: string;
}

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getPeriodRange = (options: CashFlowReportOptions) => {
  const { period, year, month } = options;

  if (period === 'monthly') {
    if (!month || month < 1 || month > 12) {
      throw new Error('Month is required for monthly reports (1-12).');
    }
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    return { start, end, length: end.getDate() };
  }

  const start = new Date(year, 0, 1, 0, 0, 0, 0);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  return { start, end, length: 12 };
};

export const getCashFlowReport = async (
  organizationId: string,
  options: CashFlowReportOptions
): Promise<CashFlowReport> => {
  const { period, year, month } = options;
  const { start, end, length } = getPeriodRange(options);
  const normalizedVendor = options.expenseVendor?.trim() || '';
  const normalizedCategory = options.expenseCategory?.trim() || '';

  const [invoices, expenses] = await Promise.all([
    getInvoices(organizationId),
    getExpenses(organizationId),
  ]);

  const inflowInvoices = invoices.filter((invoice) => {
    const date = new Date(invoice.date);
    return invoice.status === InvoiceStatus.PAID && date >= start && date <= end;
  });

  const outflowExpenses = expenses.filter((expense) => {
    const date = new Date(expense.date);
    return expense.status === ExpenseStatus.PAID && date >= start && date <= end;
  }).filter((expense) => {
    if (!normalizedVendor && !normalizedCategory) return true;
    const vendorName = expense.vendorName.trim();
    const vendorMatch = !normalizedVendor || vendorName.toLowerCase() === normalizedVendor.toLowerCase();
    const categoryLabel = expense.category?.trim() || 'Uncategorized';
    const categoryMatch = !normalizedCategory || categoryLabel.toLowerCase() === normalizedCategory.toLowerCase();
    return vendorMatch && categoryMatch;
  });

  const inflowByIndex = new Array<number>(length).fill(0);
  const outflowByIndex = new Array<number>(length).fill(0);

  inflowInvoices.forEach((invoice) => {
    const date = new Date(invoice.date);
    const index = period === 'monthly' ? date.getDate() - 1 : date.getMonth();
    inflowByIndex[index] += invoice.total;
  });

  outflowExpenses.forEach((expense) => {
    const date = new Date(expense.date);
    const index = period === 'monthly' ? date.getDate() - 1 : date.getMonth();
    outflowByIndex[index] += expense.total;
  });

  const categoryTotals = new Map<string, { total: number; count: number }>();
  outflowExpenses.forEach((expense) => {
    const category = expense.category?.trim() || 'Uncategorized';
    const entry = categoryTotals.get(category) || { total: 0, count: 0 };
    entry.total += expense.total;
    entry.count += 1;
    categoryTotals.set(category, entry);
  });

  const expenseCategories = Array.from(categoryTotals.entries())
    .map(([category, values]) => ({ category, total: values.total, count: values.count }))
    .sort((a, b) => b.total - a.total);

  const breakdown = Array.from({ length }, (_, idx) => {
    const label = period === 'monthly' ? String(idx + 1) : monthLabels[idx];
    const inflow = inflowByIndex[idx] || 0;
    const outflow = outflowByIndex[idx] || 0;
    return {
      label,
      inflow,
      outflow,
      net: inflow - outflow,
    };
  });

  const inflowTotal = inflowInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const outflowTotal = outflowExpenses.reduce((sum, expense) => sum + expense.total, 0);

  return {
    period,
    year,
    month,
    currency: 'USD',
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    expenseCategories,
    filters: {
      expenseVendor: normalizedVendor || undefined,
      expenseCategory: normalizedCategory || undefined,
    },
    totals: {
      inflow: inflowTotal,
      outflow: outflowTotal,
      net: inflowTotal - outflowTotal,
    },
    counts: {
      invoices: inflowInvoices.length,
      expenses: outflowExpenses.length,
    },
    breakdown,
  };
};

export const getCashFlowReportBySlug = async (
  orgSlug: string,
  options: CashFlowReportOptions
): Promise<CashFlowReport> => {
  const org = await getOrganizationBySlug(orgSlug);
  if (!org) {
    throw new Error('Organization not found');
  }

  const report = await getCashFlowReport(org.id, options);
  return { ...report, currency: org.currency };
};
