import { redirect } from "next/navigation";

export default function AnnualRedirect() {
  redirect("/recaps?period=Year");
}
