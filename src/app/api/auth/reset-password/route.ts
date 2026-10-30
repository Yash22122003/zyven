import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, token, newPassword } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json({ error: 'No account found with this email' }, { status: 404 });
    }

    // Case 1: Requesting a reset token (Forgot Password stage)
    if (!newPassword) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpires,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Password reset link generated',
        resetToken,
        resetUrl: `/reset-password?token=${resetToken}&email=${encodeURIComponent(normalizedEmail)}`,
      });
    }

    // Case 2: Submitting a new password
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // If token is provided, verify it
    if (token) {
      if (
        user.resetToken !== token ||
        !user.resetTokenExpires ||
        user.resetTokenExpires < new Date()
      ) {
        return NextResponse.json(
          { error: 'Invalid or expired password reset link' },
          { status: 400 }
        );
      }
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Password has been updated successfully. You can now sign in.',
    });
  } catch (err: unknown) {
    console.error('Reset password error:', err);
    return NextResponse.json(
      { error: 'An error occurred while resetting password' },
      { status: 500 }
    );
  }
}
