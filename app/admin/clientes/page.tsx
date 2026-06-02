import { getOrders } from "@/lib/data/orders";
import { formatMoney } from "@/lib/format";

export default async function AdminCustomersPage() {
  const orders = await getOrders();
  const customers = Array.from(
    orders.reduce((map, order) => {
      const current = map.get(order.customerEmail) ?? {
        name: order.customerName,
        email: order.customerEmail,
        orders: 0,
        total: 0,
      };
      current.orders += 1;
      current.total += order.totalCents;
      map.set(order.customerEmail, current);
      return map;
    }, new Map<string, { name: string; email: string; orders: number; total: number }>()),
  ).map(([, value]) => value);

  return (
    <div>
      <h1 className="text-3xl font-black">Clientes</h1>
      <section className="mt-6 overflow-hidden rounded-md border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-line bg-mist text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Pedidos</th>
                <th className="px-4 py-3 font-semibold">Total comprado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {customers.map((customer) => (
                <tr key={customer.email}>
                  <td className="px-4 py-3 font-bold">{customer.name}</td>
                  <td className="px-4 py-3 text-neutral-600">{customer.email}</td>
                  <td className="px-4 py-3">{customer.orders}</td>
                  <td className="px-4 py-3 font-bold">{formatMoney(customer.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
