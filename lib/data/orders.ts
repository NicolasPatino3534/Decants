import { demoOrders } from "@/lib/demo-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/types";

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  status: Order["status"];
  payment_status: Order["paymentStatus"];
  shipment_status: Order["shipmentStatus"];
  total_cents: number;
  created_at: string;
  order_items: Array<{
    id: string;
    product_name: string;
    variant_label: string;
    quantity: number;
    unit_price_cents: number;
  }>;
};

function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    status: row.status,
    paymentStatus: row.payment_status,
    shipmentStatus: row.shipment_status,
    totalCents: row.total_cents,
    createdAt: row.created_at,
    items: row.order_items.map((item) => ({
      id: item.id,
      productName: item.product_name,
      variantLabel: item.variant_label,
      quantity: item.quantity,
      unitPriceCents: item.unit_price_cents,
    })),
  };
}

const orderSelect = `
  id,
  order_number,
  customer_name,
  customer_email,
  status,
  payment_status,
  shipment_status,
  total_cents,
  created_at,
  order_items ( id, product_name, variant_label, quantity, unit_price_cents )
`;

export async function getOrders() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return demoOrders;

  const { data, error } = await supabase
    .from("orders")
    .select(orderSelect)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return demoOrders;
  return (data as unknown as OrderRow[]).map(mapOrder);
}

export async function getAccountOrders(userId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return demoOrders;

  const { data, error } = await supabase
    .from("orders")
    .select(orderSelect)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as unknown as OrderRow[]).map(mapOrder);
}

export async function getOrderById(id: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase)
    return (
      demoOrders.find((order) => order.id === id || order.orderNumber === id) ??
      null
    );

  const { data, error } = await supabase
    .from("orders")
    .select(orderSelect)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return mapOrder(data as unknown as OrderRow);
}
