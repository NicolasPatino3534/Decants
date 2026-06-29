import { CheckoutClient } from "@/components/checkout/checkout-client";
import { requireCustomer } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const profile = await requireCustomer("/checkout");

  return (
    <CheckoutClient
      initialCustomer={{
        name: profile.fullName,
        email: profile.email,
        phone: profile.phone,
      }}
    />
  );
}
