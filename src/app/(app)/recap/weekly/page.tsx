import { redirect } from "next/navigation";

export default function WeeklyRedirect() {
  redirect("/recaps?period=Week");
}
