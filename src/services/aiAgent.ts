import { Invoice, InvoiceStatus, AgentLog } from '../types';
import { createAgentLog, getAgentLogsByOrg, clearAgentLogs as clearAgentLogsByOrg, getInvoices, updateInvoiceStatus } from './storage';

// Mock "Smart" Email Generation
const generateReminderEmail = (invoice: Invoice, daysOverdue: number): string => {
    const tone = daysOverdue > 7 ? 'Urgent' : 'Polite';

    if (tone === 'Polite') {
        return `Subject: Friendly Reminder: Invoice #${invoice.invoiceNumber}\n\nHi ${invoice.clientName},\n\nHope you're doing well! Just a quick note that Invoice #${invoice.invoiceNumber} for $${invoice.total} was due on ${new Date(invoice.dueDate).toLocaleDateString()}. \n\nPlease let us know if there are any questions.\n\nBest,\nYour Business`;
    } else {
        return `Subject: OVERDUE: Invoice #${invoice.invoiceNumber}\n\nHi ${invoice.clientName},\n\nThis is a reminder that Invoice #${invoice.invoiceNumber} for $${invoice.total} is now ${daysOverdue} days overdue. Please arrange payment as soon as possible to avoid service interruption.\n\nThank you,\nYour Business`;
    }
};

export const runInvoiceAgent = async (orgId: string): Promise<AgentLog[]> => {
    console.log('AI Agent: Starting analysis...');
    const invoices = await getInvoices(orgId);
    const now = new Date();
    const newLogs: AgentLog[] = [];

    for (const inv of invoices) {
        if (inv.status === InvoiceStatus.SENT) {
            const dueDate = new Date(inv.dueDate);
            // Check if overdue (compare dates without time for simplicity, or just raw timestamp)
            if (now.getTime() > dueDate.getTime() + (24 * 60 * 60 * 1000)) { // 1 day grace
                console.log(`AI Agent: Invoice ${inv.invoiceNumber} is overdue.`);

                // 1. Update Status
                await updateInvoiceStatus(inv.id, InvoiceStatus.OVERDUE);

                // 2. Log Action
                const log = await createAgentLog({
                    organizationId: orgId,
                    action: 'Marked Overdue',
                    details: `Invoice #${inv.invoiceNumber} passed due date ${inv.dueDate}`,
                    relatedId: inv.id,
                    type: 'WARNING'
                });
                newLogs.push(log);

                // 3. Generate "Notification" / Email Draft
                const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                const emailBody = generateReminderEmail(inv, daysOverdue);

                await createAgentLog({
                    organizationId: orgId,
                    action: 'Drafted Reminder',
                    details: `Created ${daysOverdue > 7 ? 'urgent' : 'polite'} reminder for ${inv.clientName}`,
                    relatedId: inv.id,
                    type: 'INFO'
                });

                // Simulate sending (in real app, this would be an email service)
                // For now, we'll just log it as "Sent" for the user to see the "Agent" working
                await createAgentLog({
                    organizationId: orgId,
                    action: 'Sent Reminder',
                    details: `Emailed ${inv.clientEmail}. Preview: ${emailBody.substring(0, 30)}...`,
                    relatedId: inv.id,
                    type: 'SUCCESS'
                });
            }
        }
    }

    if (newLogs.length === 0) {
        console.log('AI Agent: No actions needed.');
    }

    return newLogs;
};

export const getAgentLogs = async (orgId: string): Promise<AgentLog[]> => {
    return getAgentLogsByOrg(orgId);
};

export const clearAgentLogs = async (orgId: string) => {
    await clearAgentLogsByOrg(orgId);
};
