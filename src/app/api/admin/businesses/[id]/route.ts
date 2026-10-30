import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth';
import { MerchantStatus, SubscriptionStatus, SubscriptionPaymentStatus } from '@prisma/client';

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
      include: {
        selectedPlan: true,
        subscription: true,
      },
    });

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      let newStatus: MerchantStatus | undefined = undefined;
      let newIsActive: boolean | undefined = body.isActive !== undefined ? body.isActive : undefined;

      // Handle explicit ACTIVATE action by Super Admin
      if (body.action === 'ACTIVATE' || body.status === MerchantStatus.ACTIVE) {
        newStatus = MerchantStatus.ACTIVE;
        newIsActive = true;

        // Manual activation must NOT bypass subscription/payment records
        const plan =
          business.selectedPlan ||
          (await tx.subscriptionPlan.findFirst({ where: { isActive: true }, orderBy: { priceInr: 'asc' } }));

        if (plan) {
          const now = new Date();
          const periodEnd = new Date(now.getTime() + (plan.billingIntervalMonths || 1) * 30 * 24 * 60 * 60 * 1000);

          const sub = await tx.businessSubscription.upsert({
            where: { businessId: business.id },
            create: {
              businessId: business.id,
              planId: plan.id,
              status: SubscriptionStatus.ACTIVE,
              startedAt: now,
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              introMonthsConsumed: plan.isIntroductory ? 1 : 0,
            },
            update: {
              planId: plan.id,
              status: SubscriptionStatus.ACTIVE,
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
            },
          });

          await tx.subscriptionPayment.create({
            data: {
              subscriptionId: sub.id,
              businessId: business.id,
              amount: plan.priceInr,
              currency: 'INR',
              status: SubscriptionPaymentStatus.SUCCESS,
              gatewayTransactionId: `ADMIN_MANUAL_${adminUser.userId.slice(0, 8)}_${Date.now()}`,
              paymentMethod: 'SUPER_ADMIN_MANUAL_OVERRIDE',
            },
          });
        }
      } else if (body.action === 'SUSPEND' || body.status === MerchantStatus.SUSPENDED || body.isActive === false) {
        newStatus = MerchantStatus.SUSPENDED;
        newIsActive = false;
      }

      const b = await tx.business.update({
        where: { id: businessId },
        data: {
          isVerified: body.isVerified !== undefined ? body.isVerified : undefined,
          isActive: newIsActive !== undefined ? newIsActive : undefined,
          status: newStatus !== undefined ? newStatus : undefined,
        },
      });

      // Mandatory Audit log entry with details
      const actionName =
        newStatus === MerchantStatus.ACTIVE
          ? 'SUPER_ADMIN_MANUAL_ACTIVATION'
          : newStatus === MerchantStatus.SUSPENDED
          ? 'STORE_SUSPENDED'
          : body.isVerified !== undefined
          ? 'VERIFICATION_TOGGLED'
          : 'STORE_UPDATED';

      await tx.auditLog.create({
        data: {
          actorId: adminUser.userId,
          businessId: b.id,
          action: actionName,
          entityType: 'BUSINESS',
          entityId: b.id,
          metadataJson: {
            adminEmail: adminUser.email,
            reason: body.reason || 'Administrative action via Super Admin Console',
            previousStatus: business.status,
            newStatus: b.status,
            updates: body,
          },
        },
      });

      return b;
    });

    return NextResponse.json({
      success: true,
      message: 'Business status updated successfully',
      business: updated,
    });
  } catch (err: unknown) {
    console.error('Admin update business error:', err);
    return NextResponse.json({ error: 'Failed to update business status' }, { status: 400 });
  }
}
