import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await requireSuperAdmin();
    const planId = params.id;
    const body = await req.json();

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Subscription plan not found' }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.subscriptionPlan.update({
        where: { id: planId },
        data: {
          name: body.name !== undefined ? body.name : undefined,
          priceInr: body.priceInr !== undefined ? body.priceInr : undefined,
          introDurationMonths: body.introDurationMonths !== undefined ? body.introDurationMonths : undefined,
          isActive: body.isActive !== undefined ? body.isActive : undefined,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminUser.userId,
          action: 'PLAN_PRICE_MODIFIED',
          entityType: 'SUBSCRIPTION_PLAN',
          entityId: p.id,
          metadataJson: { previousPrice: Number(plan.priceInr), updates: body },
        },
      });

      return p;
    });

    return NextResponse.json({
      success: true,
      message: 'Plan updated successfully',
      plan: {
        id: updated.id,
        name: updated.name,
        code: updated.code,
        priceInr: Number(updated.priceInr),
        introDurationMonths: updated.introDurationMonths,
        isActive: updated.isActive,
      },
    });
  } catch (err: unknown) {
    console.error('Update plan error:', err);
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 400 });
  }
}
