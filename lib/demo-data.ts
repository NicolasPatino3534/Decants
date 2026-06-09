import type { Order, Product } from "@/lib/types";
import { catalogProducts } from "@/lib/catalog-data";

const hero = "/images/hero-decants.png";

const fallbackProducts: Product[] = [
  {
    id: "prod_citrus_woods",
    name: "Citrus Woods",
    slug: "citrus-woods",
    brand: { id: "brand_aurum", name: "Aurum Atelier", slug: "aurum-atelier" },
    category: { id: "fam_woody", name: "Amaderada + Citrica", slug: "amaderada-citrica" },
    family: { id: "fam_woody", name: "Amaderada + Citrica", slug: "amaderada-citrica" },
    concentration: "Eau de Parfum",
    description:
      "Una salida luminosa de bergamota y lima sobre maderas secas. Ideal para probar un perfil fresco con presencia.",
    notesTop: ["Bergamota", "Lima", "Pimienta rosa"],
    notesHeart: ["Cedro", "Neroli", "Vetiver"],
    notesBase: ["Sandalwood", "Musk", "Amber"],
    gender: "unisex",
    status: "active",
    featured: true,
    imageUrl: hero,
    variants: [
      { id: "var_cw_2", sizeMl: 2, priceCents: 1600000, stockOnHand: 18, lowStockThreshold: 6, sku: "CW-2ML", active: true },
      { id: "var_cw_5", sizeMl: 5, priceCents: 2400000, stockOnHand: 7, lowStockThreshold: 6, sku: "CW-5ML", active: true },
      { id: "var_cw_10", sizeMl: 10, priceCents: 3200000, stockOnHand: 5, lowStockThreshold: 4, sku: "CW-10ML", active: true },
    ],
  },
  {
    id: "prod_amber_spice",
    name: "Amber Spice",
    slug: "amber-spice",
    brand: { id: "brand_aurum", name: "Aurum Atelier", slug: "aurum-atelier" },
    category: { id: "fam_amber", name: "Ambar + Especiada", slug: "ambar-especiada" },
    family: { id: "fam_amber", name: "Ambar + Especiada", slug: "ambar-especiada" },
    concentration: "Eau de Parfum",
    description:
      "Ambar resinoso, canela y maderas cremosas. Un decant pensado para noches frias y salidas elegantes.",
    notesTop: ["Canela", "Cardamomo"],
    notesHeart: ["Resina", "Iris"],
    notesBase: ["Ambar", "Vainilla", "Patchouli"],
    gender: "unisex",
    status: "active",
    featured: true,
    imageUrl: hero,
    variants: [
      { id: "var_as_2", sizeMl: 2, priceCents: 1700000, stockOnHand: 15, lowStockThreshold: 5, sku: "AS-2ML", active: true },
      { id: "var_as_5", sizeMl: 5, priceCents: 2550000, stockOnHand: 4, lowStockThreshold: 6, sku: "AS-5ML", active: true },
      { id: "var_as_10", sizeMl: 10, priceCents: 3400000, stockOnHand: 8, lowStockThreshold: 4, sku: "AS-10ML", active: true },
    ],
  },
  {
    id: "prod_fleur_blanche",
    name: "Fleur Blanche",
    slug: "fleur-blanche",
    brand: { id: "brand_maison", name: "Maison Nube", slug: "maison-nube" },
    category: { id: "fam_floral", name: "Floral + Almizclada", slug: "floral-almizclada" },
    family: { id: "fam_floral", name: "Floral + Almizclada", slug: "floral-almizclada" },
    concentration: "Eau de Parfum",
    description:
      "Flor blanca transparente, musk limpio y un fondo suave. Para descubrir una firma pulida y diaria.",
    notesTop: ["Mandarina", "Pera"],
    notesHeart: ["Jazmin", "Azahar", "Iris"],
    notesBase: ["Musk", "Cedro blanco"],
    gender: "feminine",
    status: "active",
    featured: true,
    imageUrl: hero,
    variants: [
      { id: "var_fb_2", sizeMl: 2, priceCents: 1600000, stockOnHand: 14, lowStockThreshold: 5, sku: "FB-2ML", active: true },
      { id: "var_fb_5", sizeMl: 5, priceCents: 2400000, stockOnHand: 6, lowStockThreshold: 6, sku: "FB-5ML", active: true },
      { id: "var_fb_10", sizeMl: 10, priceCents: 3200000, stockOnHand: 9, lowStockThreshold: 4, sku: "FB-10ML", active: true },
    ],
  },
  {
    id: "prod_oud_noir",
    name: "Oud Noir",
    slug: "oud-noir",
    brand: { id: "brand_terra", name: "Terra Lab", slug: "terra-lab" },
    category: { id: "fam_oud", name: "Oud + Cuero", slug: "oud-cuero" },
    family: { id: "fam_oud", name: "Oud + Cuero", slug: "oud-cuero" },
    concentration: "Extrait de Parfum",
    description:
      "Oud seco, cuero y humo suave. Una muestra intensa para comparar rendimiento antes de comprar botella.",
    notesTop: ["Azafran", "Pimienta negra"],
    notesHeart: ["Oud", "Cuero"],
    notesBase: ["Incienso", "Ambar gris"],
    gender: "masculine",
    status: "active",
    featured: false,
    imageUrl: hero,
    variants: [
      { id: "var_on_2", sizeMl: 2, priceCents: 2100000, stockOnHand: 10, lowStockThreshold: 5, sku: "ON-2ML", active: true },
      { id: "var_on_5", sizeMl: 5, priceCents: 3150000, stockOnHand: 3, lowStockThreshold: 6, sku: "ON-5ML", active: true },
      { id: "var_on_10", sizeMl: 10, priceCents: 4200000, stockOnHand: 2, lowStockThreshold: 4, sku: "ON-10ML", active: true },
    ],
  },
];

export const demoProducts: Product[] = catalogProducts.length > 0 ? catalogProducts : fallbackProducts;

export const demoOrders: Order[] = [
  {
    id: "ord_10024",
    orderNumber: "10024",
    customerName: "Camila R.",
    customerEmail: "camila@example.com",
    status: "preparing",
    paymentStatus: "paid",
    shipmentStatus: "preparing",
    totalCents: 3200000,
    createdAt: "2026-06-01T11:23:00.000Z",
    items: [
      { id: "oi_1", productName: "Citrus Woods", variantLabel: "10ml", quantity: 1, unitPriceCents: 3200000 },
    ],
  },
  {
    id: "ord_10023",
    orderNumber: "10023",
    customerName: "Andres M.",
    customerEmail: "andres@example.com",
    status: "shipped",
    paymentStatus: "paid",
    shipmentStatus: "in_transit",
    totalCents: 4800000,
    createdAt: "2026-06-01T10:02:00.000Z",
    items: [
      { id: "oi_2", productName: "Amber Spice", variantLabel: "5ml", quantity: 1, unitPriceCents: 2550000 },
      { id: "oi_3", productName: "Fleur Blanche", variantLabel: "5ml", quantity: 1, unitPriceCents: 2400000 },
    ],
  },
  {
    id: "ord_10022",
    orderNumber: "10022",
    customerName: "Valentina P.",
    customerEmail: "valentina@example.com",
    status: "delivered",
    paymentStatus: "paid",
    shipmentStatus: "delivered",
    totalCents: 1600000,
    createdAt: "2026-05-31T21:15:00.000Z",
    items: [
      { id: "oi_4", productName: "Fleur Blanche", variantLabel: "2ml", quantity: 1, unitPriceCents: 1600000 },
    ],
  },
];
