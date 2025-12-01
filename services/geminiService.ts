import { GoogleGenAI, SchemaType } from "@google/genai";
import { Service } from "../types";

const getClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.warn("No API_KEY found in environment. Gemini features will fail.");
        return null;
    }
    return new GoogleGenAI({ apiKey });
};

// --- Feature 1: Service Description Generator ---
export const generateServiceDescription = async (serviceName: string, category: string): Promise<string> => {
    const ai = getClient();
    if (!ai) return "AI unavailable - please set API_KEY.";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Write a professional, concise (max 20 words) service description for a B2B offering named "${serviceName}" in the category "${category}".`,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Failed to generate description.";
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
        serviceId?: string; // If it matches an existing service
    }[];
}

export const parseInvoicePrompt = async (prompt: string, availableServices: Service[]): Promise<ParsedInvoiceData | null> => {
    const ai = getClient();
    if (!ai) return null;

    const serviceList = availableServices.map(s => `${s.name} (ID: ${s.id}, Price: ${s.price})`).join(', ');

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `
                You are an invoice assistant. Extract invoice details from this user prompt: "${prompt}".
                
                Match items to this list of existing services if possible: [${serviceList}].
                If a service matches, include its ID and standard price (unless the user specifies a different price).
                If no match, create a custom item.
                
                Return JSON only.
            `,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        clientName: { type: SchemaType.STRING, nullable: true },
                        clientEmail: { type: SchemaType.STRING, nullable: true },
                        clientCompany: { type: SchemaType.STRING, nullable: true },
                        items: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    description: { type: SchemaType.STRING },
                                    quantity: { type: SchemaType.NUMBER },
                                    price: { type: SchemaType.NUMBER },
                                    serviceId: { type: SchemaType.STRING, nullable: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text) as ParsedInvoiceData;
        }
        return null;
    } catch (error) {
        console.error("Gemini Parse Error:", error);
        return null;
    }
};

// --- Feature 3: Smart Email Composer ---
export const generateInvoiceEmailBody = async (clientName: string, invoiceNumber: string, total: string, dueDate: string): Promise<string> => {
    const ai = getClient();
    if (!ai) return "Please find attached your invoice.";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Write a polite, professional, short email body to ${clientName} regarding Invoice ${invoiceNumber} for ${total} due on ${dueDate}. 
            Tone: Professional and friendly. Do not include subject line. Do not include placeholders like [Your Name].`,
        });
        return response.text.trim();
    } catch (error) {
        return "Please find attached your invoice details.";
    }
};