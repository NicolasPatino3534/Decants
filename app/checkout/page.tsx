import { CheckoutClient } from "@/components/checkout/checkout-client";
import { isDemoProfile, requireCustomer } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const profile = await requireCustomer("/checkout");
  const demoProfile = isDemoProfile(profile);

  return (
    <CheckoutClient
      initialCustomer={{
        name: demoProfile ? "" : profile.fullName,
        email: demoProfile ? "" : profile.email,
        phone: demoProfile ? "" : profile.phone,
      }}
    />
  );
}
