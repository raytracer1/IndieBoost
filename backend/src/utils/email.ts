import { Resend } from 'resend';

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(apiKey: string, params: EmailParams): Promise<boolean> {
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: 'IndieBoost <onboarding@resend.dev>',
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      console.error('Resend error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Resend send error:', err);
    return false;
  }
}

export function generateOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit code
}

export function otpEmailHTML(code: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <h1 style="color: #4F46E5; font-size: 24px; margin-bottom: 16px;">IndieBoost</h1>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Thanks for signing up! Use the code below to verify your email address.
      </p>
      <div style="background: #F3F4F6; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #111827;">${code}</span>
      </div>
      <p style="color: #9CA3AF; font-size: 14px;">
        This code expires in 10 minutes. If you didn't create an account, you can ignore this email.
      </p>
    </div>
  `;
}
