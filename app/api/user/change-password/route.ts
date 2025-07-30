import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, handleApiError } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';
import { changePasswordSchema } from '@/lib/validations';
import { verifyPassword, hashPassword } from '@/lib/auth';

/**
 * Change user password
 * POST /api/user/change-password
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return handleApiError(
        new Error('Unauthorized'),
        'Change Password'
      );
    }
    
    const body = await request.json();
    const validatedData = changePasswordSchema.parse(body);
    
    // Get user with current password hash
    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: { passwordHash: true },
    });
    
    if (!user) {
      return handleApiError(
        new Error('User not found'),
        'Change Password'
      );
    }
    
    // Verify current password
    const isValidPassword = await verifyPassword(
      validatedData.currentPassword,
      user.passwordHash
    );
    
    if (!isValidPassword) {
      return handleApiError(
        new Error('Current password is incorrect'),
        'Change Password'
      );
    }
    
    // Hash new password
    const newPasswordHash = await hashPassword(validatedData.newPassword);
    
    // Update password
    await prisma.user.update({
      where: { id: currentUser.userId },
      data: { passwordHash: newPasswordHash },
    });
    
    return createSuccessResponse({
      message: 'Password changed successfully',
    });
    
  } catch (error) {
    return handleApiError(error, 'Change Password');
  }
}