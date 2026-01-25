import {
    IsString,
    IsEmail,
    IsOptional,
    IsNotEmpty,
    IsArray,
    IsNumber,
    IsIn,
    MinLength,
    MaxLength,
    Matches,
    ValidateNested,
    IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SendInvoiceEmailDto {
    @IsEmail({}, { message: 'Recipient email must be a valid email address' })
    @IsNotEmpty({ message: 'Recipient email is required' })
    to: string;

    @IsString()
    @IsOptional()
    subject?: string;

    @IsString()
    @IsOptional()
    body?: string;

    @IsString()
    @IsOptional()
    invoiceNumber?: string;

    @IsString()
    @IsOptional()
    clientName?: string;
}

export class ProvisionTeamMemberDto {
    @IsEmail({}, { message: 'Email must be a valid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;

    @IsString()
    @IsNotEmpty({ message: 'Name is required' })
    @MinLength(1)
    @MaxLength(100)
    name: string;

    @IsString()
    @IsNotEmpty({ message: 'Organization ID is required' })
    organizationId: string;

    @IsString()
    @IsOptional()
    @IsIn(['OWNER', 'ADMIN', 'ASSISTANT'], { message: 'Role must be OWNER, ADMIN, or ASSISTANT' })
    role?: string;

    @IsArray()
    @IsOptional()
    permissions?: string[];

    @IsString()
    @IsOptional()
    @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
    pin?: string;
}

export class SendAuthEmailDto {
    @IsEmail({}, { message: 'Email must be a valid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    to: string;

    @IsString()
    @IsNotEmpty({ message: 'Type is required' })
    @IsIn(['welcome', 'login_alert', 'password_reset', 'team_invite'], { message: 'Invalid email type' })
    type: string;

    @IsObject()
    @IsOptional()
    data?: Record<string, any>;
}

export class TranslateDto {
    @IsArray({ message: 'Texts must be an array of strings' })
    @IsNotEmpty({ message: 'Texts array is required' })
    texts: string[];

    @IsString()
    @IsNotEmpty({ message: 'Target language is required' })
    targetLanguage: string;

    @IsString()
    @IsOptional()
    sourceLanguage?: string;
}

export class AiGenerateDto {
    @IsString()
    @IsNotEmpty({ message: 'Prompt is required' })
    prompt: string;

    @IsObject()
    @IsOptional()
    schema?: Record<string, any>;
}

export class AfnexChargeDto {
    @IsString()
    @IsNotEmpty({ message: 'Invoice ID is required' })
    invoiceId: string;

    @IsString()
    @IsOptional()
    provider?: string;

    @IsString()
    @IsOptional()
    payerPhone?: string;

    @IsEmail({}, { message: 'Customer email must be valid' })
    @IsOptional()
    customerEmail?: string;

    @IsString()
    @IsOptional()
    customerName?: string;
}

export class AfnexVerifyDto {
    @IsString()
    @IsNotEmpty({ message: 'Reference is required' })
    reference: string;

    @IsString()
    @IsNotEmpty({ message: 'Provider is required' })
    provider: string;

    @IsString()
    @IsNotEmpty({ message: 'Invoice ID is required' })
    invoiceId: string;
}

export class FlutterwavePayoutDto {
    @IsString()
    @IsNotEmpty({ message: 'Organization ID is required' })
    orgId: string;

    @IsString()
    @IsNotEmpty({ message: 'Bank code is required' })
    bankCode: string;

    @IsString()
    @IsOptional()
    bankName?: string;

    @IsString()
    @IsNotEmpty({ message: 'Account number is required' })
    @Matches(/^\d+$/, { message: 'Account number must be numeric' })
    accountNumber: string;

    @IsString()
    @IsNotEmpty({ message: 'Account name is required' })
    @MinLength(2, { message: 'Account name must be at least 2 characters' })
    accountName: string;

    @IsString()
    @IsNotEmpty({ message: 'Bank country is required' })
    @MinLength(2, { message: 'Bank country must be a valid country code' })
    @MaxLength(3)
    bankCountry: string;
}

export class BillingInitializeDto {
    @IsString()
    @IsNotEmpty({ message: 'Organization ID is required' })
    orgId: string;

    @IsString()
    @IsOptional()
    @IsIn(['monthly', 'yearly'], { message: 'Billing cycle must be monthly or yearly' })
    billingCycle?: string;
}

export class MomoInitializeDto {
    @IsString()
    @IsNotEmpty({ message: 'Invoice ID is required' })
    invoiceId: string;

    @IsString()
    @IsNotEmpty({ message: 'Payer phone is required' })
    payerPhone: string;

    @IsString()
    @IsOptional()
    payerNetwork?: string;
}

export class MomoPayoutDto {
    @IsString()
    @IsNotEmpty({ message: 'Organization ID is required' })
    orgId: string;

    @IsString()
    @IsNotEmpty({ message: 'Phone number is required' })
    @Matches(/^\+?\d{10,15}$/, { message: 'Phone must be a valid phone number' })
    phone: string;

    @IsString()
    @IsNotEmpty({ message: 'Account name is required' })
    accountName: string;
}

export class SubscriptionStartDto {
    @IsString()
    @IsNotEmpty({ message: 'Organization ID is required' })
    orgId: string;

    @IsString()
    @IsIn(['monthly', 'yearly'], { message: 'Billing cycle must be monthly or yearly' })
    billingCycle: string;

    @IsString()
    @IsOptional()
    @IsIn(['flutterwave', 'stripe'], { message: 'Provider must be flutterwave or stripe' })
    provider?: string;
}

export class RatesQueryDto {
    @IsString()
    @IsNotEmpty({ message: 'From currency is required' })
    from: string;

    @IsString()
    @IsNotEmpty({ message: 'To currency is required' })
    to: string;

    @IsString()
    @IsOptional()
    provider?: string;

    @IsOptional()
    amount?: string;
}
