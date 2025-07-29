import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, handleApiError } from '@/lib/api-response';
import { passwordResetRequestSchema } from '@/lib/validations';
import { generateResetToken } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';

/**
 * Password reset request endpoint
 * POST /api/auth/password-reset/request
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = passwordResetRequestSchema.parse(body);
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });
    
    if (!user) {
      // Don't reveal if user exists - return success anyway
      return createSuccessResponse({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }
    
    // Generate reset token
    const resetToken = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    // Save reset token
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt,
      },
    });
    
    // Send email
    try {
      await sendPasswordResetEmail(user.email, resetToken);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Continue anyway - don't reveal email sending failure
    }
    
    return createSuccessResponse({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
    
  } catch (error) {
    return handleApiError(error, 'Password Reset Request');
  }
}