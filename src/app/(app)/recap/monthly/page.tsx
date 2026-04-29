import { redirect } from "next/navigation";

export default function MonthlyRedirect() {
  redirect("/recaps?period=Month");
}
