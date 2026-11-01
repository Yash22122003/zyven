'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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

export interface CartContextType {
  cart: CartStore;
  isLoaded: boolean;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (
    item: Omit<CartItem, 'quantity'>,
    businessSlug: string,
    businessName: string,
    quantity?: number
  ) => { success: boolean; conflict?: { existingBusinessName: string } };
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  totalCount: number;
  subtotal: number;
}

const CART_STORAGE_KEY = 'zyven_cart_v1';

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartStore>({
    businessSlug: null,
    businessName: null,
    items: [],
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load cart from localStorage on client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        setCart(JSON.parse(stored));
      }
    } catch {
      // Ignore storage read error
    } finally {
      setIsLoaded(true);
    }

    // Listen to storage events from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CART_STORAGE_KEY && e.newValue) {
        try {
          setCart(JSON.parse(e.newValue));
        } catch {
          // Ignore parse error
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const saveCart = useCallback((newCart: CartStore) => {
    setCart(newCart);
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newCart));
    } catch {
      // Ignore storage write error
    }
  }, []);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const toggleCart = useCallback(() => setIsCartOpen((prev) => !prev), []);

  const addItem = useCallback(
    (
      item: Omit<CartItem, 'quantity'>,
      businessSlug: string,
      businessName: string,
      quantity = 1
    ): { success: boolean; conflict?: { existingBusinessName: string } } => {
      // Check for single-store constraint
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
    },
    [cart, saveCart]
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
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
    },
    [cart, saveCart]
  );

  const removeItem = useCallback(
    (productId: string) => {
      const updatedItems = cart.items.filter((i) => i.productId !== productId);
      saveCart({
        businessSlug: updatedItems.length > 0 ? cart.businessSlug : null,
        businessName: updatedItems.length > 0 ? cart.businessName : null,
        items: updatedItems,
      });
    },
    [cart, saveCart]
  );

  const clearCart = useCallback(() => {
    saveCart({
      businessSlug: null,
      businessName: null,
      items: [],
    });
  }, [saveCart]);

  const totalCount = cart.items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
  const subtotal = cart.items.reduce((acc, i) => acc + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoaded,
        isCartOpen,
        openCart,
        closeCart,
        toggleCart,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        totalCount,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCartContext(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
