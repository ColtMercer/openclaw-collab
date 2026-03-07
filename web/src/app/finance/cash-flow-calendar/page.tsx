import CashFlowCalendarClient from "./CashFlowCalendarClient";

export const dynamic = "force-dynamic";

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function CashFlowCalendarPage() {
  return <CashFlowCalendarClient initialMonth={getCurrentMonth()} />;
}
