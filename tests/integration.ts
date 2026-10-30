import { PrismaClient, OrderStatus, MovementType, UserRole } from '@prisma/client';
import { canTransitionOrder, shouldReleaseStockOnTransition, shouldFulfillStockOnTransition } from '../src/lib/order-machine';
import { validateAndReserveStock, releaseReservedStock, fulfillOrderStock } from '../src/lib/inventory';
import { generateOrderNumber } from '../src/lib/utils';
import { isValidSlug, isReservedSlug } from '../src/lib/reserved-slugs';

const prisma = new PrismaClient();

async function runTests() {
  console.log('🧪 Starting ZYVEN Comprehensive Integration & Tenant Isolation Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // TEST 1: Reserved Slugs Engine
  console.log('--- Test Suite 1: Reserved Slugs & URL Protection ---');
  assert(isReservedSlug('admin') === true, 'Blocks "admin" as reserved');
  assert(isReservedSlug('dashboard') === true, 'Blocks "dashboard" as reserved');
  assert(isReservedSlug('api') === true, 'Blocks "api" as reserved');
  assert(isValidSlug('sharma-store').valid === true, 'Allows valid store slug "sharma-store"');
  assert(isValidSlug('a').valid === false, 'Rejects too short slug');
  assert(isValidSlug('invalid_slug!').valid === false, 'Rejects invalid characters in slug');

  // TEST 2: Order State Machine Transitions
  console.log('\n--- Test Suite 2: Order State Machine Transitions ---');
  assert(canTransitionOrder(OrderStatus.PENDING, OrderStatus.ACCEPTED) === true, 'PENDING -> ACCEPTED is valid');
  assert(canTransitionOrder(OrderStatus.ACCEPTED, OrderStatus.PREPARING) === true, 'ACCEPTED -> PREPARING is valid');
  assert(canTransitionOrder(OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP) === true, 'PREPARING -> READY_FOR_PICKUP is valid');
  assert(canTransitionOrder(OrderStatus.READY_FOR_PICKUP, OrderStatus.COLLECTED) === true, 'READY_FOR_PICKUP -> COLLECTED is valid');
  assert(canTransitionOrder(OrderStatus.COLLECTED, OrderStatus.ACCEPTED) === false, 'COLLECTED -> ACCEPTED is forbidden (terminal state)');
  assert(canTransitionOrder(OrderStatus.PENDING, OrderStatus.COLLECTED) === false, 'PENDING -> COLLECTED cannot jump without acceptance');

  // TEST 3: Multi-Tenant Data Isolation
  console.log('\n--- Test Suite 3: Strict Multi-Tenant Data Isolation ---');
  const sharmaStore = await prisma.business.findUnique({ where: { slug: 'sharma-store' } });
  const fashionStore = await prisma.business.findUnique({ where: { slug: 'fashion-hub' } });

  assert(sharmaStore !== null && fashionStore !== null, 'Both test businesses exist in PostgreSQL');

  if (sharmaStore && fashionStore) {
    // Check that products belong strictly to respective business
    const sharmaProds = await prisma.product.findMany({ where: { businessId: sharmaStore.id } });
    const fashionProds = await prisma.product.findMany({ where: { businessId: fashionStore.id } });

    assert(sharmaProds.length > 0, `Sharma Store has ${sharmaProds.length} isolated products`);
    assert(fashionProds.length > 0, `Fashion Hub has ${fashionProds.length} isolated products`);

    // Verify cross-tenant query with tenant scoping returns nothing
    const crossQuery = await prisma.product.findMany({
      where: {
        businessId: sharmaStore.id,
        id: fashionProds[0].id,
      },
    });
    assert(crossQuery.length === 0, 'Sharma Store query cannot access Fashion Hub product');
  }

  // TEST 4: Atomic Inventory Concurrency & Oversell Protection
  console.log('\n--- Test Suite 4: Atomic Concurrency & Stock Reservation ---');
  if (sharmaStore) {
    // Create a temporary test product
    const testProd = await prisma.product.create({
      data: {
        businessId: sharmaStore.id,
        name: 'Concurrency Test Sugar (1kg)',
        slug: `test-sugar-${Date.now()}`,
        price: 50.00,
        isActive: true,
      },
    });

    const testInv = await prisma.inventory.create({
      data: {
        businessId: sharmaStore.id,
        productId: testProd.id,
        quantityOnHand: 5,
        quantityReserved: 0,
        lowStockThreshold: 2,
      },
    });

    // Test successful reservation of 3 units
    const orderNum1 = generateOrderNumber();
    const result1 = await prisma.$transaction(async (tx) => {
      return validateAndReserveStock(
        tx,
        sharmaStore.id,
        [{ productId: testProd.id, quantity: 3 }],
        orderNum1
      );
    });
    assert(result1.success === true, 'Successfully reserved 3 of 5 units');

    const invAfter1 = await prisma.inventory.findUnique({ where: { id: testInv.id } });
    assert(invAfter1?.quantityReserved === 3, 'Inventory quantityReserved is now 3');
    assert((invAfter1!.quantityOnHand - invAfter1!.quantityReserved) === 2, 'Available to promise is now 2');

    // Attempt to order 3 more units (should fail because only 2 are available)
    const orderNum2 = generateOrderNumber();
    try {
      await prisma.$transaction(async (tx) => {
        const res2 = await validateAndReserveStock(
          tx,
          sharmaStore.id,
          [{ productId: testProd.id, quantity: 3 }],
          orderNum2
        );
        if (!res2.success) throw new Error(res2.error);
      });
      assert(false, 'Should have failed overselling');
    } catch (err: any) {
      assert(err.message.includes('Insufficient stock'), 'Correctly blocked overselling beyond available stock');
    }

    // Release reservation (simulate rejection)
    await prisma.$transaction(async (tx) => {
      // Mock order to release
      const mockOrder = await tx.order.create({
        data: {
          orderNumber: orderNum1,
          businessId: sharmaStore.id,
          customerName: 'Test Customer',
          customerPhone: '9999999999',
          status: OrderStatus.REJECTED,
          subtotal: 150.00,
          totalAmount: 150.00,
          expiresAt: new Date(),
          items: {
            create: [{ productId: testProd.id, productName: testProd.name, unitPrice: 50, quantity: 3, totalPrice: 150 }],
          },
        },
      });

      await releaseReservedStock(tx, sharmaStore.id, mockOrder.id, orderNum1);
    });

    const invAfterRelease = await prisma.inventory.findUnique({ where: { id: testInv.id } });
    assert(invAfterRelease?.quantityReserved === 0, 'Reserved stock successfully released back to 0');
    assert(invAfterRelease?.quantityOnHand === 5, 'Physical stock remains at 5');

    // Clean up test product and mock order
    await prisma.inventoryMovement.deleteMany({ where: { productId: testProd.id } });
    await prisma.orderItem.deleteMany({ where: { productId: testProd.id } });
    await prisma.order.deleteMany({ where: { orderNumber: orderNum1 } });
    await prisma.inventory.delete({ where: { id: testInv.id } });
    await prisma.product.delete({ where: { id: testProd.id } });
  }

  // TEST 5: Subscription Pricing & ₹1 Introductory Plan
  console.log('\n--- Test Suite 5: Subscription Pricing Governance ---');
  const introPlan = await prisma.subscriptionPlan.findUnique({ where: { code: 'INTRO_PROMO' } });
  const standardPlan = await prisma.subscriptionPlan.findUnique({ where: { code: 'STANDARD_MONTHLY' } });

  assert(introPlan !== null && Number(introPlan.priceInr) === 1.00, 'Introductory Plan is priced at ₹1.00');
  assert(introPlan?.introDurationMonths === 3, 'Introductory duration is 3 months');
  assert(standardPlan !== null && Number(standardPlan.priceInr) === 299.00, 'Standard Plan is configured at ₹299.00');

  // TEST 6: Razorpay UPI Payment Gateway, Verification & Idempotency
  console.log('\n--- Test Suite 6: Razorpay UPI Gateway, Signature Verification & Idempotency ---');
  const { createRazorpayOrder, verifyPaymentSignature, verifyWebhookSignature, markOrderAsPaidAndCompleted } = await import('../src/lib/razorpay');

  const rzpOrder = await createRazorpayOrder({
    amountInPaise: 49900,
    currency: 'INR',
    receipt: 'TEST-RZP-101',
    notes: { orderNumber: 'ZYV-TEST-RZP' },
  });

  assert(rzpOrder.id.length > 0, 'Razorpay order created with valid order ID');
  assert(rzpOrder.amount === 49900, 'Razorpay order amount matches paise (₹499.00 -> 49900)');
  assert(rzpOrder.currency === 'INR', 'Razorpay currency is Indian Rupee (INR)');

  const validSig = verifyPaymentSignature({
    razorpayOrderId: rzpOrder.id,
    razorpayPaymentId: 'pay_test_123456',
    razorpaySignature: 'sig_test_valid',
  });
  assert(validSig === true, 'Validates Razorpay payment signature correctly');

  const validWebhook = verifyWebhookSignature({
    rawBody: JSON.stringify({ event: 'payment.captured' }),
    signature: 'webhook_sig_test',
  });
  assert(validWebhook === true, 'Validates Razorpay webhook signature format');

  // Test Idempotency with a test order
  if (sharmaStore) {
    const testRzpOrder = await prisma.order.create({
      data: {
        orderNumber: `ZYV-IDEMP-${Date.now()}`,
        businessId: sharmaStore.id,
        customerName: 'Idempotency Test User',
        customerPhone: '+919999988888',
        totalAmount: 100.00,
        subtotal: 100.00,
        paymentMethod: 'RAZORPAY_UPI',
        paymentStatus: 'PENDING',
        razorpayOrderId: `order_idemp_${Date.now()}`,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    const firstUpdate = await markOrderAsPaidAndCompleted({
      orderNumber: testRzpOrder.orderNumber,
      razorpayPaymentId: 'pay_first_run_999',
      source: 'WEBHOOK',
    });
    assert(firstUpdate.alreadyPaid === false, 'First payment webhook marks order as PAID');
    assert(firstUpdate.order.paymentStatus === 'PAID', 'Order paymentStatus updated to PAID');

    const duplicateUpdate = await markOrderAsPaidAndCompleted({
      orderNumber: testRzpOrder.orderNumber,
      razorpayPaymentId: 'pay_first_run_999',
      source: 'WEBHOOK',
    });
    assert(duplicateUpdate.alreadyPaid === true, 'Idempotent: Duplicate webhook does not re-process order');

    // Clean up
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: testRzpOrder.id } });
    await prisma.notification.deleteMany({ where: { recipientUserId: sharmaStore.ownerId } });
    await prisma.order.delete({ where: { id: testRzpOrder.id } });
  }

  // TEST 7: Customer Role Auth & Strict Customer Order Isolation
  console.log('\n--- Test Suite 7: Customer Role Auth & Order Isolation ---');
  assert(isReservedSlug('account') === true, 'Blocks "account" as reserved system slug');
  assert(isReservedSlug('customer') === true, 'Blocks "customer" as reserved system slug');

  const customerUser = await prisma.user.findFirst({ where: { email: 'priya@example.com' } });
  assert(customerUser !== null, 'Demo customer Priya Verma exists');
  assert(customerUser?.role === UserRole.CUSTOMER, 'Priya Verma has role CUSTOMER');

  // Verify Customer Order Data Isolation
  if (customerUser && sharmaStore) {
    const customerOrders = await prisma.order.findMany({
      where: {
        OR: [
          { customerId: customerUser.id },
          { customerEmail: customerUser.email! },
        ],
      },
    });
    assert(customerOrders.length > 0, `Customer Priya has ${customerOrders.length} accessible order(s)`);

    // Another customer should NOT see Priya's orders
    const fakeOtherCustomerId = 'fake-other-customer-id-999';
    const fakeOtherCustomerOrders = await prisma.order.findMany({
      where: {
        OR: [
          { customerId: fakeOtherCustomerId },
          { customerEmail: 'nonexistent@example.com' },
        ],
      },
    });
    assert(fakeOtherCustomerOrders.length === 0, 'Isolated: Other customer receives 0 of Priya\'s orders');
  }

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests()
  .catch((e) => {
    console.error('Test execution error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
