import { redirect } from "next/navigation";

export default function QuarterlyRedirect() {
  redirect("/recaps?period=Quarter");
}
