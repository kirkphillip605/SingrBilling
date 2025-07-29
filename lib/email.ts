import Mailjet from 'node-mailjet';

/**
 * Email service using Mailjet for transactional emails
 */

const mailjet = new Mailjet({
  apiKey: process.env.MAILJET_API_KEY!,
  apiSecret: process.env.MAILJET_SECRET_KEY!
}
)

export interface EmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

/**
 * Send email using Mailjet
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const request = await mailjet
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: process.env.FROM_EMAIL!,
              Name: 'Billing Portal'
            },
            To: [
              {
                Email: options.to
              }
            ],
            Subject: options.subject,
            TextPart: options.textContent || '',
            HTMLPart: options.htmlContent
          }
        ]
      });

    console.log('Email sent successfully:', request.body);
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Failed to send email');
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<void> {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset Request</h2>
      <p>You requested a password reset for your account.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
        Reset Password
      </a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    </div>
  `;

  const textContent = `
    Password Reset Request
    
    You requested a password reset for your account.
    
    Visit this link to reset your password: ${resetUrl}
    
    This link will expire in 1 hour.
    
    If you didn't request this, please ignore this email.
  `;

  await sendEmail({
    to: email,
    subject: 'Password Reset Request',
    htmlContent,
    textContent
  });
}