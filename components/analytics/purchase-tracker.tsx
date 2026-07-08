"use client";

import { useEffect, useRef } from "react";
import { trackPurchase } from "@/lib/analytics/events";

type PurchaseTrackerProps = {
  payload: Parameters<typeof trackPurchase>[0];
};

export function PurchaseTracker({ payload }: PurchaseTrackerProps) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    trackPurchase(payload);
  }, [payload]);

  return null;
}
