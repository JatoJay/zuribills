import { Invoice, InvoiceStatus, AgentLog } from '../types';
import { createAgentLog, getAgentLogsByOrg, clearAgentLogs as clearAgentLogsByOrg, getInvoices, updateInvoiceStatus } from './storage';
import { apiFetch } from './apiClient';

// Mock "Smart" Email Generation
const generateReminderEmail = (invoice: Invoice, daysOverdue: number, orgName: string): string => {
    const tone = daysOverdue > 7 ? 'Urgent' : 'Polite';

    if (tone === 'Polite') {
        return `Hi ${invoice.clientName},\n\nHope you're doing well! Just a quick note that Invoice #${invoice.invoiceNumber} for ${invoice.total} was due on ${new Date(invoice.dueDate).toLocaleDateString()}. \n\nPlease let us know if there are any questions.\n\nBest,\n${orgName}`;
    } else {
        return `Hi ${invoice.clientName},\n\nThis is a reminder that Invoice #${invoice.invoiceNumber} for ${invoice.total} is now ${daysOverdue} days overdue. Please arrange payment as soon as possible to avoid service interruption.\n\nThank you,\n${orgName}`;
    }
};

export const runInvoiceAgent = async (orgId: string): Promise<AgentLog[]> => {
    console.log('AI Agent: Starting analysis...');
    const invoices = await getInvoices(orgId);

    if (invoices.length === 0) return [];

    const orgName = "Your Business";

    const now = new Date();
    const newLogs: AgentLog[] = [];

    for (const inv of invoices) {
        if (inv.status === InvoiceStatus.SENT) {
            const dueDate = new Date(inv.dueDate);
            // Check if overdue (1 day grace)
            if (now.getTime() > dueDate.getTime() + (24 * 60 * 60 * 1000)) {
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

                // 3. Generate Email Body
                const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                const emailBody = generateReminderEmail(inv, daysOverdue, orgName);

                // 4. Send Real Email via Resend Backend
                try {
                    const response = await apiFetch('/api/email/send-invoice', {
                        method: 'POST',
                        body: JSON.stringify({
                            to: inv.clientEmail,
                            subject: `Reminder: Invoice #${inv.invoiceNumber}`,
                            body: emailBody,
                            invoiceNumber: inv.invoiceNumber,
                            clientName: inv.clientName
                        }),
                    });

                    if (response.ok) {
                        await createAgentLog({
                            organizationId: orgId,
                            action: 'Sent Reminder',
                            details: `Automated email sent to ${inv.clientEmail} for Invoice #${inv.invoiceNumber}`,
                            relatedId: inv.id,
                            type: 'SUCCESS'
                        });
                    } else {
                        throw new Error('Email delivery failed');
                    }
                } catch (error) {
                    console.error('AI Agent Email Error:', error);
                    await createAgentLog({
                        organizationId: orgId,
                        action: 'Email Failed',
                        details: `Could not send automated reminder to ${inv.clientEmail}`,
                        relatedId: inv.id,
                        type: 'WARNING'
                    });
                }
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
