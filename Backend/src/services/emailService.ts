import 'dotenv/config';
import { Resend } from 'resend';

const emailFrom = process.env.EMAIL_FROM || 'KwikQ <onboarding@resend.dev>';
const appUrl = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');

let resendClient: Resend | null = null;

function getResendClient(): Resend {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
        throw new Error('RESEND_API_KEY is not configured');
    }
    if (!resendClient) {
        resendClient = new Resend(resendApiKey);
    }
    return resendClient;
}

const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

export async function sendAdminInvitationEmail(params: {
    to: string;
    invitationCode: string;
}): Promise<void> {
    const { to, invitationCode } = params;
    const registerUrl = `${appUrl}/admin/auth`;

    const { error } = await getResendClient().emails.send({
        from: emailFrom,
        to,
        subject: 'Your KwikQ staff invitation',
        text: [
            'You have been invited to join KwikQ as clinic staff (admin).',
            '',
            `Your one-time invitation code: ${invitationCode}`,
            '',
            `Open ${registerUrl}, enter the code, then register with this email address: ${to}`,
            '',
            'If you were not expecting this, you can ignore this email.',
        ].join('\n'),
        html: `
            <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#161a23">
                <p style="font-size:22px;font-weight:800;letter-spacing:-0.03em;margin:0 0 20px">Kwik<span style="color:#2f4fe0">Q</span></p>
                <p style="margin:0 0 16px">You have been invited to join <strong>KwikQ</strong> as clinic staff.</p>
                <p style="margin:0 0 8px;color:#5f6878;font-size:14px">Your one-time invitation code</p>
                <p style="font-size:26px;font-weight:700;letter-spacing:3px;background:#e8ecfd;color:#2440c0;padding:14px 18px;border-radius:12px;display:inline-block;margin:0 0 20px">${escapeHtml(invitationCode)}</p>
                <p style="margin:0 0 16px"><a href="${escapeHtml(registerUrl)}" style="background:#2f4fe0;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block">Open KwikQ staff sign-in</a></p>
                <p style="margin:0 0 16px;font-size:14px">Enter the code there, then register with <strong>${escapeHtml(to)}</strong>. The code works once.</p>
                <p style="margin:0;color:#5f6878;font-size:13px">If you were not expecting this, you can ignore this email.</p>
            </div>
        `,
    });

    if (error) {
        throw new Error(error.message || 'Failed to send invitation email');
    }
}
