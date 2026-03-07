import { getConvenienceStoreData } from "@/lib/finance-queries";
import ConvenienceClient from "./ConvenienceClient";

export const dynamic = "force-dynamic";

export default async function ConvenienceStoresPage() {
  const data = await getConvenienceStoreData();
  const serialized = JSON.parse(JSON.stringify(data));
  return <ConvenienceClient {...serialized} />;
}
