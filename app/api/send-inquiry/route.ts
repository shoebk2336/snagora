import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: Request) {
  try {
    const { name, email, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    const resend = new Resend(RESEND_API_KEY);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e293b; border-bottom: 2px solid #f59e0b; padding-bottom: 10px;">
          📩 New License Inquiry
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #64748b; width: 100px;">Name</td>
            <td style="padding: 8px 12px; color: #1e293b;">${name}</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 8px 12px; font-weight: bold; color: #64748b;">Email</td>
            <td style="padding: 8px 12px; color: #1e293b;">${email}</td>
          </tr>
        </table>
        <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <p style="margin: 0 0 5px 0; font-weight: bold; color: #64748b;">Message:</p>
          <p style="margin: 0; color: #1e293b; white-space: pre-wrap;">${message}</p>
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #94a3b8;">
          Sent from Snagora App • ${new Date().toLocaleString()}
        </p>
      </div>
    `;

    let sendResult = await resend.emails.send({
      from: 'Snagora App <onboarding@resend.dev>',
      to: ['shoebk478@gmail.com', 'snagora.app@gmail.com', 'snagora.support@gmail.com'],
      subject: `New Inquiry from ${name}`,
      html: htmlContent,
    });

    if (sendResult.error) {
      console.warn('Initial Resend send failed, checking for sandbox restriction:', sendResult.error);
      const isSandboxError = sendResult.error.message?.includes('testing emails') || 
                             sendResult.error.name === 'validation_error';
      
      if (isSandboxError) {
        console.info('Sandbox mode detected. Retrying email delivery only to verified owner: shoebk478@gmail.com');
        sendResult = await resend.emails.send({
          from: 'Snagora App <onboarding@resend.dev>',
          to: ['shoebk478@gmail.com'],
          subject: `[Sandbox] New Inquiry from ${name}`,
          html: htmlContent,
        });
      }
    }

    if (sendResult.error) {
      console.error('Resend error after fallback retry:', sendResult.error);
      return NextResponse.json({ error: sendResult.error.message || 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: sendResult.data?.id });
  } catch (error: any) {
    console.error('Failed to send inquiry email:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
