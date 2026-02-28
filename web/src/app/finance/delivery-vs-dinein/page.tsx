import { getDeliveryVsDineInData } from "@/lib/finance-queries";
import DeliveryClient from "./DeliveryClient";

export const dynamic = "force-dynamic";

export default async function DeliveryVsDineInPage() {
  const data = await getDeliveryVsDineInData(6);
  const serialized = JSON.parse(JSON.stringify(data));
  return <DeliveryClient {...serialized} />;
}
