import { PrismaClient, UserRole, StockDisplayMode, OrderStatus, PaymentMethod, PaymentStatus, MovementType, SubscriptionStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting ZYVEN database seed...');

  // Clean existing records if any
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.operatingHour.deleteMany();
  await prisma.subscriptionPayment.deleteMany();
  await prisma.businessSubscription.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.business.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = await bcrypt.hash('Zyven@2026', 10);

  // 1. Create Super Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@zyven.me',
      phone: '+919999000001',
      passwordHash: defaultPassword,
      fullName: 'ZYVEN Platform Operator',
      role: UserRole.SUPER_ADMIN,
    },
  });
  console.log('✅ Created Super Admin:', admin.email);

  // 2. Create Categories
  const categoriesData = [
    { name: 'Grocery & Essentials', slug: 'grocery-essentials', icon: 'ShoppingBag', displayOrder: 1 },
    { name: 'Fashion & Apparel', slug: 'fashion-apparel', icon: 'Shirt', displayOrder: 2 },
    { name: 'Electronics & Mobile', slug: 'electronics-mobile', icon: 'Smartphone', displayOrder: 3 },
    { name: 'Bakery & Confectionery', slug: 'bakery-confectionery', icon: 'UtensilsCrossed', displayOrder: 4 },
    { name: 'Health & Pharmacy', slug: 'health-pharmacy', icon: 'HeartPulse', displayOrder: 5 },
    { name: 'Books & Stationery', slug: 'books-stationery', icon: 'BookOpen', displayOrder: 6 },
  ];

  const categoriesMap: Record<string, string> = {};
  for (const cat of categoriesData) {
    const created = await prisma.category.create({ data: cat });
    categoriesMap[cat.slug] = created.id;
  }
  console.log('✅ Seeded 6 retail categories');

  // 3. Create Subscription Plans
  const introPlan = await prisma.subscriptionPlan.create({
    data: {
      name: 'Introductory Launch Offer',
      code: 'INTRO_PROMO',
      priceInr: 1.00,
      billingIntervalMonths: 1,
      isIntroductory: true,
      introDurationMonths: 3,
      isActive: true,
    },
  });

  const standardMonthlyPlan = await prisma.subscriptionPlan.create({
    data: {
      name: 'Standard Growth Plan',
      code: 'STANDARD_MONTHLY',
      priceInr: 299.00,
      billingIntervalMonths: 1,
      isIntroductory: false,
      introDurationMonths: 0,
      isActive: true,
    },
  });

  const standardAnnualPlan = await prisma.subscriptionPlan.create({
    data: {
      name: 'Annual Value Plan',
      code: 'STANDARD_ANNUAL',
      priceInr: 2999.00,
      billingIntervalMonths: 12,
      isIntroductory: false,
      introDurationMonths: 0,
      isActive: true,
    },
  });
  console.log('✅ Seeded 3 subscription plans (₹1 Promo, ₹299/mo, ₹2999/yr)');

  // 4. Create Business 1: Sharma Grocery Store
  const sharmaUser = await prisma.user.create({
    data: {
      email: 'sharma@store.com',
      phone: '+919876543210',
      passwordHash: defaultPassword,
      fullName: 'Ramesh Sharma',
      role: UserRole.MERCHANT,
    },
  });

  const sharmaStore = await prisma.business.create({
    data: {
      ownerId: sharmaUser.id,
      categoryId: categoriesMap['grocery-essentials'],
      name: 'Sharma Grocery Store',
      slug: 'sharma-store',
      description: 'Your neighborhood trusted grocery store providing farm-fresh staples, grains, spices, and daily household essentials.',
      logoUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200&q=80',
      phone: '+919876543210',
      email: 'sharma@store.com',
      addressLine1: 'Shop #14, Main Market, Sector 18',
      addressLine2: 'Near Central Bank',
      city: 'Noida',
      state: 'Uttar Pradesh',
      pincode: '201301',
      isVerified: true,
      isActive: true,
      isOpenManually: true,
      stockDisplayMode: StockDisplayMode.AVAILABILITY_STATUS,
      pickupInstructions: 'Pick up your prepared order at billing counter #2. Please show your order number on arrival.',
      estimatedPrepTimeMinutes: 15,
      upiId: 'sharmagrocery@upi',
      upiName: 'Sharma Grocery Store',
      enableUpiQr: true,
    },
  });

  // Business 2: Fashion Hub
  const fashionUser = await prisma.user.create({
    data: {
      email: 'anita@fashionhub.com',
      phone: '+919811223344',
      passwordHash: defaultPassword,
      fullName: 'Anita Mehra',
      role: UserRole.MERCHANT,
    },
  });

  const fashionStore = await prisma.business.create({
    data: {
      ownerId: fashionUser.id,
      categoryId: categoriesMap['fashion-apparel'],
      name: 'Fashion Hub',
      slug: 'fashion-hub',
      description: 'Trendy casual wear, premium cotton shirts, ethnic kurtas, and handcrafted accessories.',
      logoUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=300&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1200&q=80',
      phone: '+919811223344',
      email: 'anita@fashionhub.com',
      addressLine1: '45-A, Commercial Complex, M-Block',
      addressLine2: 'Greater Kailash 1',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110048',
      isVerified: true,
      isActive: true,
      isOpenManually: true,
      stockDisplayMode: StockDisplayMode.EXACT_COUNT,
      pickupInstructions: 'Visit our flagship store reception. Try-ons available before taking items if required.',
      estimatedPrepTimeMinutes: 25,
      upiId: 'anitamehra@okhdfcbank',
      upiName: 'Fashion Hub Delhi',
      enableUpiQr: true,
    },
  });

  // Business 3: Mobile World
  const mobileUser = await prisma.user.create({
    data: {
      email: 'vikram@mobileworld.com',
      phone: '+919955443322',
      passwordHash: defaultPassword,
      fullName: 'Vikram Patel',
      role: UserRole.MERCHANT,
    },
  });

  const mobileStore = await prisma.business.create({
    data: {
      ownerId: mobileUser.id,
      categoryId: categoriesMap['electronics-mobile'],
      name: 'Mobile World',
      slug: 'mobile-world',
      description: 'Genuine mobile phone accessories, fast chargers, wireless earbuds, smart bands, and screen protectors.',
      logoUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=300&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=1200&q=80',
      phone: '+919955443322',
      email: 'vikram@mobileworld.com',
      addressLine1: 'UG-22, City Centre Mall',
      addressLine2: 'MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      isVerified: true,
      isActive: true,
      isOpenManually: true,
      stockDisplayMode: StockDisplayMode.AVAILABILITY_STATUS,
      pickupInstructions: 'Collect directly at the accessories counter with your digital order confirmation.',
      estimatedPrepTimeMinutes: 10,
      upiId: 'mobileworld@paytm',
      upiName: 'Mobile World Bangalore',
      enableUpiQr: true,
    },
  });

  console.log('✅ Seeded 3 verified businesses (Sharma Store, Fashion Hub, Mobile World)');

  // 5. Operating Hours for businesses (Mon-Sun 09:00 - 21:00)
  for (const store of [sharmaStore, fashionStore, mobileStore]) {
    for (let day = 0; day <= 6; day++) {
      await prisma.operatingHour.create({
        data: {
          businessId: store.id,
          dayOfWeek: day,
          openTime: '09:00',
          closeTime: '21:00',
          isClosed: false,
        },
      });
    }

    // Attach active subscription (₹1 Promotional Plan)
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sub = await prisma.businessSubscription.create({
      data: {
        businessId: store.id,
        planId: introPlan.id,
        status: SubscriptionStatus.ACTIVE,
        startedAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        introMonthsConsumed: 1,
      },
    });

    await prisma.subscriptionPayment.create({
      data: {
        subscriptionId: sub.id,
        businessId: store.id,
        amount: 1.00,
        currency: 'INR',
        status: 'SUCCESS',
        paymentMethod: 'UPI',
        gatewayTransactionId: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      },
    });
  }
  console.log('✅ Configured operating hours & ₹1 introductory subscriptions for all stores');

  // 6. Products for Sharma Grocery Store
  const sharmaProducts = [
    {
      name: 'Organic Basmati Rice (5kg)',
      slug: 'organic-basmati-rice-5kg',
      description: 'Long grain, aged aromatic basmati rice suitable for daily meals and festive biryanis.',
      sku: 'SGS-RIC-001',
      price: 499.00,
      compareAtPrice: 580.00,
      imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
      stock: 45,
    },
    {
      name: 'Cold-Pressed Mustard Oil (1L)',
      slug: 'cold-pressed-mustard-oil-1l',
      description: 'Pure kachi ghani mustard oil extracted traditionally, rich in natural antioxidants.',
      sku: 'SGS-OIL-002',
      price: 185.00,
      compareAtPrice: 210.00,
      imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80',
      stock: 28,
    },
    {
      name: 'Organic Toor Dal (1kg)',
      slug: 'organic-toor-dal-1kg',
      description: 'Unpolished premium yellow pigeon peas, high protein staple for daily dal.',
      sku: 'SGS-DAL-003',
      price: 165.00,
      compareAtPrice: 190.00,
      imageUrl: 'https://images.unsplash.com/photo-1585994192700-eb86d6786e24?auto=format&fit=crop&w=600&q=80',
      stock: 3, // Low stock demo!
    },
    {
      name: 'Pure Desi Cow Ghee (500ml)',
      slug: 'pure-desi-cow-ghee-500ml',
      description: 'A2 bilona churned traditional cow ghee with authentic granular texture and aroma.',
      sku: 'SGS-GHEE-004',
      price: 420.00,
      compareAtPrice: 475.00,
      imageUrl: 'https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?auto=format&fit=crop&w=600&q=80',
      stock: 12,
    },
    {
      name: 'Whole Wheat Chakki Atta (10kg)',
      slug: 'whole-wheat-chakki-atta-10kg',
      description: '100% whole grain wheat flour with zero maida, yielding soft and fluffy rotis.',
      sku: 'SGS-ATT-005',
      price: 395.00,
      compareAtPrice: 440.00,
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
      stock: 20,
    },
  ];

  for (const item of sharmaProducts) {
    const prod = await prisma.product.create({
      data: {
        businessId: sharmaStore.id,
        categoryId: categoriesMap['grocery-essentials'],
        name: item.name,
        slug: item.slug,
        description: item.description,
        sku: item.sku,
        price: item.price,
        compareAtPrice: item.compareAtPrice,
        imageUrl: item.imageUrl,
        isActive: true,
      },
    });

    await prisma.inventory.create({
      data: {
        businessId: sharmaStore.id,
        productId: prod.id,
        quantityOnHand: item.stock,
        quantityReserved: 0,
        lowStockThreshold: 5,
      },
    });

    await prisma.inventoryMovement.create({
      data: {
        businessId: sharmaStore.id,
        productId: prod.id,
        actorId: sharmaUser.id,
        changeQuantity: item.stock,
        newQuantityOnHand: item.stock,
        movementType: MovementType.INITIAL_STOCK,
        reason: 'Initial catalogue onboarding',
      },
    });
  }

  // 7. Products for Fashion Hub
  const fashionProducts = [
    {
      name: 'Pure Cotton Casual Oxford Shirt',
      slug: 'pure-cotton-casual-oxford-shirt',
      description: 'Breathable 100% combed cotton regular fit button-down shirt in navy blue.',
      sku: 'FH-SHT-01',
      price: 1299.00,
      compareAtPrice: 1999.00,
      imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80',
      stock: 15,
    },
    {
      name: 'Slim Fit Stretch Denim Jeans',
      slug: 'slim-fit-stretch-denim-jeans',
      description: 'Classic dark indigo 5-pocket denim with elastane stretch for all-day comfort.',
      sku: 'FH-JNS-02',
      price: 1799.00,
      compareAtPrice: 2499.00,
      imageUrl: 'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=600&q=80',
      stock: 8,
    },
    {
      name: 'Handcrafted Khadi Nehru Jacket',
      slug: 'handcrafted-khadi-nehru-jacket',
      description: 'Traditional textured khadi sleeveless jacket with mandarin collar and coconut-shell buttons.',
      sku: 'FH-JKT-03',
      price: 2199.00,
      compareAtPrice: 2899.00,
      imageUrl: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=600&q=80',
      stock: 4, // Low stock demo!
    },
  ];

  for (const item of fashionProducts) {
    const prod = await prisma.product.create({
      data: {
        businessId: fashionStore.id,
        categoryId: categoriesMap['fashion-apparel'],
        name: item.name,
        slug: item.slug,
        description: item.description,
        sku: item.sku,
        price: item.price,
        compareAtPrice: item.compareAtPrice,
        imageUrl: item.imageUrl,
        isActive: true,
      },
    });

    await prisma.inventory.create({
      data: {
        businessId: fashionStore.id,
        productId: prod.id,
        quantityOnHand: item.stock,
        quantityReserved: 0,
        lowStockThreshold: 5,
      },
    });
  }

  // 8. Products for Mobile World
  const mobileProducts = [
    {
      name: '65W GaN Fast Charger (Type-C)',
      slug: '65w-gan-fast-charger-type-c',
      description: 'Ultra-compact multi-device charger compatible with iPhone, Android, and laptops.',
      sku: 'MW-CHG-001',
      price: 1499.00,
      compareAtPrice: 2199.00,
      imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80',
      stock: 22,
    },
    {
      name: 'Wireless Active Noise Cancelling Earbuds',
      slug: 'wireless-anc-earbuds',
      description: 'Bluetooth 5.3 earbuds with 32dB active noise cancellation and 36hr battery case.',
      sku: 'MW-AUD-002',
      price: 2499.00,
      compareAtPrice: 3999.00,
      imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80',
      stock: 14,
    },
    {
      name: '10,000mAh Magnetic Wireless Power Bank',
      slug: '10000mah-magnetic-power-bank',
      description: 'Slim MagSafe-compatible portable battery pack with 20W PD fast wired output.',
      sku: 'MW-PWR-003',
      price: 1899.00,
      compareAtPrice: 2599.00,
      imageUrl: 'https://images.unsplash.com/photo-1622445262464-84b1456045b6?auto=format&fit=crop&w=600&q=80',
      stock: 9,
    },
  ];

  for (const item of mobileProducts) {
    const prod = await prisma.product.create({
      data: {
        businessId: mobileStore.id,
        categoryId: categoriesMap['electronics-mobile'],
        name: item.name,
        slug: item.slug,
        description: item.description,
        sku: item.sku,
        price: item.price,
        compareAtPrice: item.compareAtPrice,
        imageUrl: item.imageUrl,
        isActive: true,
      },
    });

    await prisma.inventory.create({
      data: {
        businessId: mobileStore.id,
        productId: prod.id,
        quantityOnHand: item.stock,
        quantityReserved: 0,
        lowStockThreshold: 5,
      },
    });
  }

  // 9. Seed Sample Pickup Orders for Sharma Grocery Store
  const firstProduct = await prisma.product.findFirst({ where: { businessId: sharmaStore.id } });
  if (firstProduct) {
    const order1 = await prisma.order.create({
      data: {
        orderNumber: 'ZYV-20261030-1011',
        businessId: sharmaStore.id,
        customerName: 'Priya Verma',
        customerPhone: '+919876500001',
        customerEmail: 'priya@example.com',
        status: OrderStatus.READY_FOR_PICKUP,
        subtotal: 998.00,
        taxAmount: 0.00,
        totalAmount: 998.00,
        paymentMethod: PaymentMethod.PAY_AT_STORE,
        paymentStatus: PaymentStatus.PENDING,
        pickupNotes: 'I will collect around 5:30 PM after office hours.',
        estimatedPickupTime: new Date(Date.now() + 3600000),
        expiresAt: new Date(Date.now() + 7200000),
        items: {
          create: [
            {
              productId: firstProduct.id,
              productName: firstProduct.name,
              productSku: firstProduct.sku,
              unitPrice: firstProduct.price,
              quantity: 2,
              totalPrice: 998.00,
            },
          ],
        },
        statusHistory: {
          create: [
            { fromStatus: null, toStatus: OrderStatus.PENDING, note: 'Order placed by customer for in-store pickup' },
            { fromStatus: OrderStatus.PENDING, toStatus: OrderStatus.ACCEPTED, note: 'Merchant confirmed order' },
            { fromStatus: OrderStatus.ACCEPTED, toStatus: OrderStatus.READY_FOR_PICKUP, note: 'Order packed and placed at billing counter' },
          ],
        },
      },
    });

    const order2 = await prisma.order.create({
      data: {
        orderNumber: 'ZYV-20261030-1012',
        businessId: sharmaStore.id,
        customerName: 'Amit Saxena',
        customerPhone: '+919876500002',
        customerEmail: 'amit@example.com',
        status: OrderStatus.PENDING,
        subtotal: 499.00,
        taxAmount: 0.00,
        totalAmount: 499.00,
        paymentMethod: PaymentMethod.PAY_AT_STORE,
        paymentStatus: PaymentStatus.PENDING,
        pickupNotes: 'Please ensure it is packed securely.',
        expiresAt: new Date(Date.now() + 1800000),
        items: {
          create: [
            {
              productId: firstProduct.id,
              productName: firstProduct.name,
              productSku: firstProduct.sku,
              unitPrice: firstProduct.price,
              quantity: 1,
              totalPrice: 499.00,
            },
          ],
        },
        statusHistory: {
          create: [
            { fromStatus: null, toStatus: OrderStatus.PENDING, note: 'New pickup order awaiting merchant confirmation' },
          ],
        },
      },
    });

    // Update reservation for order2 item
    await prisma.inventory.update({
      where: { productId: firstProduct.id },
      data: { quantityReserved: { increment: 1 } },
    });

    console.log('✅ Seeded sample pickup orders (READY_FOR_PICKUP & PENDING)');
  }

  console.log('🎉 ZYVEN database successfully seeded with production-grade test data!');
  console.log('\nDefault Test Logins:');
  console.log('• Super Admin: admin@zyven.me / Zyven@2026');
  console.log('• Sharma Store: sharma@store.com / Zyven@2026 (Route: /sharma-store)');
  console.log('• Fashion Hub: anita@fashionhub.com / Zyven@2026 (Route: /fashion-hub)');
  console.log('• Mobile World: vikram@mobileworld.com / Zyven@2026 (Route: /mobile-world)');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
