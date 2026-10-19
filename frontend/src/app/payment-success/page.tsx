import { redirect } from "next/navigation";

/** The confirmation is the booking itself, on the tickets page. */
export default function PaymentSuccessPage() {
  redirect("/tickets");
}
