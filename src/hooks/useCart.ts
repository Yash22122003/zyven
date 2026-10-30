'use client';

import { useState, useEffect } from 'react';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
  sku?: string | null;
  maxAvailable: number;
}

export interface CartStore {
  businessSlug: string | null;
  businessName: string | null;
  items: CartItem[];
}

const CART_STORAGE_KEY = 'zyven_cart_v1';

export function useCart() {
  const [cart, setCart] = useState<CartStore>({
    businessSlug: null,
    businessName: null,
    items: [],
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        setCart(JSON.parse(stored));
      }
    } catch {
      // Ignore storage error
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const saveCart = (newCart: CartStore) => {
    setCart(newCart);
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newCart));
    } catch {
      // Ignore storage error
    }
  };

  const addItem = (
    item: Omit<CartItem, 'quantity'>,
    businessSlug: string,
    businessName: string,
    quantity = 1
  ): { success: boolean; conflict?: { existingBusinessName: string } } => {
    // Check if adding from another store
    if (cart.businessSlug && cart.businessSlug !== businessSlug && cart.items.length > 0) {
      return {
        success: false,
        conflict: { existingBusinessName: cart.businessName || 'another store' },
      };
    }

    const existingIdx = cart.items.findIndex((i) => i.productId === item.productId);
    let updatedItems = [...cart.items];

    if (existingIdx > -1) {
      const existing = updatedItems[existingIdx];
      const newQty = Math.min(existing.quantity + quantity, item.maxAvailable);
      updatedItems[existingIdx] = { ...existing, quantity: newQty };
    } else {
      updatedItems.push({
        ...item,
        quantity: Math.min(quantity, item.maxAvailable),
      });
    }

    saveCart({
      businessSlug,
      businessName,
      items: updatedItems,
    });

    return { success: true };
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    const updatedItems = cart.items.map((item) => {
      if (item.productId === productId) {
        return { ...item, quantity: Math.min(quantity, item.maxAvailable) };
      }
      return item;
    });

    saveCart({
      ...cart,
      items: updatedItems,
    });
  };

  const removeItem = (productId: string) => {
    const updatedItems = cart.items.filter((i) => i.productId !== productId);
    saveCart({
      businessSlug: updatedItems.length > 0 ? cart.businessSlug : null,
      businessName: updatedItems.length > 0 ? cart.businessName : null,
      items: updatedItems,
    });
  };

  const clearCart = () => {
    saveCart({
      businessSlug: null,
      businessName: null,
      items: [],
    });
  };

  const totalCount = cart.items.reduce((acc, i) => acc + i.quantity, 0);
  const subtotal = cart.items.reduce((acc, i) => acc + i.price * i.quantity, 0);

  return {
    cart,
    isLoaded,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    totalCount,
    subtotal,
  };
}
