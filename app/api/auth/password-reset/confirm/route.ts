import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, handleApiError } from '@/lib/api-response';
import { passwordResetConfirmSchema } from '@/lib/validations';
import { hashPassword } from '@/lib/auth';

/**
 * Password reset confirmation endpoint
 * POST /api/auth/password-reset/confirm
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = passwordResetConfirmSchema.parse(body);
    
    // Find valid reset token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: validatedData.token },
      include: { user: true },
    });
    
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return handleApiError(
        new Error('Invalid or expired reset token'),
        'Password Reset Confirm'
      );
    }
    
    // Hash new password
    const passwordHash = await hashPassword(validatedData.password);
    
    // Update user password and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);
    
    return createSuccessResponse({
      message: 'Password reset successful',
    });
    
  } catch (error) {
    return handleApiError(error, 'Password Reset Confirm');
  }
}