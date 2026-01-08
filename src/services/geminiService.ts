import { Service } from "../types";

export const AI_DISABLED_MESSAGE = 'AI generation disbaled';

const generateContent = async (prompt: string, schema?: any) => {
    try {
        const response = await fetch('/api/ai/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, schema })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || AI_DISABLED_MESSAGE);
        }

        const data = await response.json();
        const text = data?.text;

        if (!text) throw new Error(AI_DISABLED_MESSAGE);

        return text;
    } catch (error: any) {
        console.error("Gemini Request Failed:", error);
        throw new Error(AI_DISABLED_MESSAGE);
    }
};

// --- Shared Translation Helper ---
export const translateBatch = async (
    texts: string[],
    targetLanguage: string,
    sourceLanguage: string = 'English'
): Promise<string[]> => {
    if (!texts.length) return [];

    const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts, targetLanguage, sourceLanguage })
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Translation request failed.');
    }

    const data = await response.json() as { translations?: string[] };

    if (!data.translations || !Array.isArray(data.translations)) {
        throw new Error('Translation response missing translations array.');
    }

    if (data.translations.length !== texts.length) {
        const merged = texts.map((text, index) => data.translations?.[index] || text);
        return merged;
    }

    return data.translations;
};

// --- Feature 1: Service Description Generator ---
export const generateServiceDescription = async (serviceName: string, category: string): Promise<string> => {
    const prompt = `Write a professional, concise (max 20 words) service description for a B2B offering named "${serviceName}" in the category "${category}".`;
    try {
        const text = await generateContent(prompt);
        return text.trim();
    } catch (e) {
        return AI_DISABLED_MESSAGE;
    }
};

// --- Feature 2: Natural Language to Invoice Parser ---
export interface ParsedInvoiceData {
    clientName?: string;
    clientEmail?: string;
    clientCompany?: string;
    items: {
        description: string;
        quantity: number;
        price: number;
        serviceId?: string;
    }[];
}

export const parseInvoicePrompt = async (prompt: string, availableServices: Service[]): Promise<{ success: boolean; data?: ParsedInvoiceData; error?: string }> => {
    const serviceList = availableServices.map(s => `${s.name} (ID: ${s.id}, Price: ${s.price})`).join(', ');

    const fullPrompt = `
        You are an invoice assistant. Extract invoice details from this user prompt: "${prompt}".
        
        Match items to this list of existing services if possible: [${serviceList}].
        If a service matches, include its ID and standard price (unless the user specifies a different price).
        If no match, create a custom item.
        
        Return JSON only.
    `;

    const schema = {
        type: "OBJECT",
        properties: {
            clientName: { type: "STRING", nullable: true },
            clientEmail: { type: "STRING", nullable: true },
            clientCompany: { type: "STRING", nullable: true },
            items: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        description: { type: "STRING" },
                        quantity: { type: "NUMBER" },
                        price: { type: "NUMBER" },
                        serviceId: { type: "STRING", nullable: true }
                    }
                }
            }
        }
    };

    try {
        const text = await generateContent(fullPrompt, schema); // Now throws on error
        const data = JSON.parse(text) as ParsedInvoiceData;
        return { success: true, data };
    } catch (e: any) {
        console.error("AI Parse failed:", e);
        return { success: false, error: AI_DISABLED_MESSAGE };
    }
};

// --- Feature 3: Smart Email Composer ---
export const generateInvoiceEmailBody = async (clientName: string, invoiceNumber: string, total: string, dueDate: string): Promise<string> => {
    const prompt = `Write a polite, professional, short email body to ${clientName} regarding Invoice ${invoiceNumber} for ${total} due on ${dueDate}. 
    Tone: Professional and friendly. Do not include subject line. Do not include placeholders like [Your Name].`;

    try {
        const text = await generateContent(prompt);
        return text.trim();
    } catch (e) {
        return AI_DISABLED_MESSAGE;
    }
};

// --- Feature 4: Business Analyst Chat ---
export const askBusinessAnalyst = async (
    query: string,
    context: {
        invoices: any[],
        clients: any[],
        services: any[],
        orgName: string,
        currency: string
    }
): Promise<string> => {

    // Simplification for Context Window efficiency
    const invoiceSummary = context.invoices.map(i => ({
        id: i.invoiceNumber,
        client: i.clientName,
        total: i.total,
        status: i.status,
        date: i.date,
        dueDate: i.dueDate
    }));

    const fullPrompt = `
        You are an expert Business Analyst for ${context.orgName}. 
        Your goal is to answer questions about the business performance based on the data provided.
        Currency: ${context.currency}

        DATA CONTEXT:
        Invoices: ${JSON.stringify(invoiceSummary)}
        Clients: ${JSON.stringify(context.clients.map(c => ({ name: c.name, company: c.company })))}
        Services: ${JSON.stringify(context.services.map(s => ({ name: s.name, price: s.price })))}

        USER QUESTION: "${query}"

        INSTRUCTIONS:
        - Answer concisely and professionally.
        - Use the provided data to calculate totals, counts, or identify trends.
        - If the answer is not in the data, state that you don't have enough information.
        - Format clear numbers (e.g., $1,200.00).
    `;

    try {
        const text = await generateContent(fullPrompt);
        return text.trim();
    } catch (e) {
        return AI_DISABLED_MESSAGE;
    }
};

// --- Feature 5: Compliance Validator ---
export interface ComplianceIssue {
    severity: 'high' | 'medium' | 'low';
    message: string;
    suggestion: string;
}

export interface ComplianceResult {
    score: number; // 0-100
    issues: ComplianceIssue[];
}

export const validateInvoiceCompliance = async (invoiceData: any): Promise<ComplianceResult> => {
    const prompt = `
        Act as a strict financial compliance auditor. Review this invoice draft for potential issues, missing legal fields, or vague information that could lead to payment delays or tax audits.

        INVOICE DATA:
        ${JSON.stringify(invoiceData, null, 2)}

        CHECKLIST:
        1. Is the client name and contact info complete?
        2. Are line items descriptive enough (e.g., "Services" is bad, "Web Design for Q3" is good)?
        3. Are the dates (Invoice Date, Due Date) logical?
        4. Is there a Tax ID or specialized business number if applicable? (If not present, flag as potential warning but not critical if not strictly required by data).
        5. Are amounts logical?

        OUTPUT FORMAT (JSON ONLY):
        {
            "score": number (0-100),
            "issues": [
                { "severity": "high"|"medium"|"low", "message": "Short description of issue", "suggestion": "How to fix it" }
            ]
        }
        
        If perfect, issues should be empty and score 100.
    `;

    try {
        const text = await generateContent(prompt);
        // Clean markdown code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Compliance check failed", e);
        return {
            score: 0,
            issues: [{ severity: 'high', message: AI_DISABLED_MESSAGE, suggestion: "Use manual review for now." }]
        };
    }
};
