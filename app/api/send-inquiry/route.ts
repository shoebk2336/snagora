import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Simple in-memory rate limiter for serverless instance
const ipRateLimitMap = new Map<string, { count: number; expiresAt: number }>();
const MAX_REQUESTS_PER_WINDOW = 3;
const WINDOW_MS = 60 * 1000; // 1 minute

function sanitizeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function POST(request: Request) {
  try {
    // 1. IP Rate Limiting
    const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const now = Date.now();
    const rateData = ipRateLimitMap.get(clientIp);

    if (rateData && now < rateData.expiresAt) {
      if (rateData.count >= MAX_REQUESTS_PER_WINDOW) {
        return NextResponse.json({ error: 'Too many requests. Please try again in a minute.' }, { status: 429 });
      }
      rateData.count += 1;
    } else {
      ipRateLimitMap.set(clientIp, { count: 1, expiresAt: now + WINDOW_MS });
    }

    const { name, email, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    const resend = new Resend(RESEND_API_KEY);

    // XSS Sanitization for inputs injected into HTML template
    const cleanName = sanitizeHtml(name);
    const cleanEmail = sanitizeHtml(email);
    const cleanMessage = sanitizeHtml(message);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e293b; border-bottom: 2px solid #f59e0b; padding-bottom: 10px;">
          📩 New License Inquiry
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #64748b; width: 100px;">Name</td>
            <td style="padding: 8px 12px; color: #1e293b;">${cleanName}</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 8px 12px; font-weight: bold; color: #64748b;">Email</td>
            <td style="padding: 8px 12px; color: #1e293b;">${cleanEmail}</td>
          </tr>
        </table>
        <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <p style="margin: 0 0 5px 0; font-weight: bold; color: #64748b;">Message:</p>
          <p style="margin: 0; color: #1e293b; white-space: pre-wrap;">${cleanMessage}</p>
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #94a3b8;">
          Sent from Snagora App • ${new Date().toLocaleString()}
        </p>
      </div>
    `;

    let sendResult = await resend.emails.send({
      from: 'Snagora App <onboarding@resend.dev>',
      to: ['shoebk478@gmail.com', 'snagora.app@gmail.com', 'snagora.support@gmail.com'],
      subject: `New Inquiry from ${cleanName}`,
      html: htmlContent,
    });

    if (sendResult.error) {
      const isSandboxError = sendResult.error.message?.includes('testing emails') || 
                             sendResult.error.name === 'validation_error';
      
      if (isSandboxError) {
        sendResult = await resend.emails.send({
          from: 'Snagora App <onboarding@resend.dev>',
          to: ['shoebk478@gmail.com'],
          subject: `[Sandbox] New Inquiry from ${cleanName}`,
          html: htmlContent,
        });
      }
    }

    if (sendResult.error) {
      return NextResponse.json({ error: sendResult.error.message || 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: sendResult.data?.id });
  } catch {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
