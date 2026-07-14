const labels: Record<string, string> = {
  pending: "Pendiente",
  pending_payment: "Pago pendiente",
  payment_review: "Pago en revisión",
  paid: "Pagado",
  failed: "Fallido",
  rejected: "Rechazado",
  cancelled: "Cancelado",
  refunded: "Reintegrado",
  preparing: "En preparación",
  ready_to_ship: "Listo para despachar",
  in_transit: "En camino",
  shipped: "Despachado",
  delivered: "Entregado",
  delayed: "Demorado",
};

export function orderStatusLabel(status: string) {
  return labels[status] ?? status;
}

const productLabels: Record<string, string> = {
  draft: "Borrador",
  active: "Activo",
  archived: "Archivado",
};

export function productStatusLabel(status: string) {
  return productLabels[status] ?? status;
}
