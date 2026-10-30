import { z } from 'zod';
import { isValidSlug } from '../reserved-slugs';

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  businessName: z.string().min(2, 'Business name is required'),
  categorySlug: z.string().min(1, 'Category is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  address: z.string().min(5, 'Address is required'),
  pincode: z.string().min(6, 'Valid 6-digit pincode is required'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const storeSettingsSchema = z.object({
  name: z.string().min(2, 'Store name must be at least 2 characters'),
  slug: z.string().min(3).max(50).refine((slug) => isValidSlug(slug).valid, {
    message: 'Invalid slug or reserved system name',
  }),
  description: z.string().optional(),
  phone: z.string().min(10, 'Valid contact number is required'),
  email: z.string().email().optional().or(z.literal('')),
  addressLine1: z.string().min(3, 'Address is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().min(6, 'Valid pincode is required'),
  isOpenManually: z.boolean(),
  stockDisplayMode: z.enum(['EXACT_COUNT', 'AVAILABILITY_STATUS']),
  pickupInstructions: z.string().optional(),
  estimatedPrepTimeMinutes: z.number().int().min(5).max(180),
  upiId: z.string().optional().or(z.literal('')),
  upiName: z.string().optional().or(z.literal('')),
  enableUpiQr: z.boolean().default(true),
});

export const productSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  description: z.string().optional(),
  sku: z.string().optional(),
  price: z.number().positive('Price must be greater than zero'),
  compareAtPrice: z.number().positive().optional().nullable(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  categoryId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  initialStock: z.number().int().min(0, 'Stock cannot be negative').default(0),
  lowStockThreshold: z.number().int().min(1).default(5),
});

export const checkoutSchema = z.object({
  businessSlug: z.string().min(1, 'Business slug is required'),
  customerName: z.string().min(2, 'Full name is required'),
  customerPhone: z.string().min(10, 'Valid 10-digit phone number is required'),
  customerEmail: z.string().email().optional().or(z.literal('')),
  paymentMethod: z.enum(['PAY_AT_STORE', 'UPI_ONLINE']).default('PAY_AT_STORE'),
  upiTransactionRef: z.string().optional(),
  pickupNotes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive('Quantity must be at least 1'),
    })
  ).min(1, 'Cart cannot be empty'),
});

export const orderTransitionSchema = z.object({
  orderId: z.string().uuid(),
  toStatus: z.enum([
    'ACCEPTED',
    'PREPARING',
    'READY_FOR_PICKUP',
    'COLLECTED',
    'REJECTED',
    'CANCELLED',
  ]),
  reason: z.string().optional(),
});
