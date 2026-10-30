'use client';

import { useCartContext, CartItem, CartStore, CartContextType } from '@/context/CartContext';

export type { CartItem, CartStore, CartContextType };

export function useCart(): CartContextType {
  return useCartContext();
}
