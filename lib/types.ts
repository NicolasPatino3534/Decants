export type AppRole = "customer" | "staff" | "admin" | "owner";

export type ProductStatus = "draft" | "active" | "archived";
export type OrderStatus =
  | "pending"
  | "paid"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type ShipmentStatus =
  | "pending"
  | "preparing"
  | "in_transit"
  | "delivered"
  | "delayed";

export type Brand = {
  id: string;
  name: string;
  slug: string;
  country?: string | null;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
};

export type FragranceFamily = Category;

export type ProductVariant = {
  id: string;
  sizeMl: number;
  priceCents: number;
  stockOnHand: number;
  lowStockThreshold: number;
  sku: string;
  active: boolean;
};

export type DecantVariant = ProductVariant;

export type Product = {
  id: string;
  name: string;
  slug: string;
  brand: Brand;
  category: Category;
  family: FragranceFamily;
  concentration: string;
  description: string;
  notesTop: string[];
  notesHeart: string[];
  notesBase: string[];
  gender: "unisex" | "feminine" | "masculine";
  status: ProductStatus;
  featured: boolean;
  imageUrl: string;
  variants: DecantVariant[];
};

export type CartLine = {
  productId: string;
  productSlug: string;
  productName: string;
  imageUrl: string;
  variantId: string;
  sizeMl: number;
  priceCents: number;
  stockOnHand?: number;
  quantity: number;
};

export type ShippingMethod = {
  id: string;
  name: string;
  description?: string | null;
  carrier?: string | null;
  basePriceCents: number;
  estimatedDaysMin?: number | null;
  estimatedDaysMax?: number | null;
};

export type CartTotals = {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
};

export type Address = {
  id: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type OrderItem = {
  id: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  unitPriceCents: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  shipmentStatus: ShipmentStatus;
  totalCents: number;
  createdAt: string;
  items: OrderItem[];
};
