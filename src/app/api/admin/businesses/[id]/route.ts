import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await requireSuperAdmin();
    const businessId = params.id;
    const body = await req.json();

    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const b = await tx.business.update({
        where: { id: businessId },
        data: {
          isVerified: body.isVerified !== undefined ? body.isVerified : undefined,
          isActive: body.isActive !== undefined ? body.isActive : undefined,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId: adminUser.userId,
          businessId: b.id,
          action: body.isActive === false ? 'STORE_SUSPENDED' : body.isVerified !== undefined ? 'VERIFICATION_TOGGLED' : 'STORE_UPDATED',
          entityType: 'BUSINESS',
          entityId: b.id,
          metadataJson: { updates: body },
        },
      });

      return b;
    });

    return NextResponse.json({
      success: true,
      message: 'Business status updated',
      business: updated,
    });
  } catch (err: unknown) {
    console.error('Admin update business error:', err);
    return NextResponse.json({ error: 'Failed to update business status' }, { status: 400 });
  }
}
