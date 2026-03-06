import { getFoodBattleData } from "@/lib/finance-queries";
import FoodBattleClient from "./FoodBattleClient";

export const dynamic = "force-dynamic";

export default async function FoodBattlePage() {
  const data = await getFoodBattleData(6);
  const serialized = JSON.parse(JSON.stringify(data));
  return <FoodBattleClient {...serialized} />;
}
