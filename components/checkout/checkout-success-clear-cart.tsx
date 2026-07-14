"use client";

import { useEffect } from "react";
import { useCart } from "@/components/cart/cart-provider";

export function CheckoutSuccessClearCart() {
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return null;
}
