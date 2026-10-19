import { redirect } from "next/navigation";

/**
 * There is no online payment behind the app: a booking is made on the booking
 * page and settled at the venue. The old mock checkout that lived here is gone,
 * so an old link lands on the real flow instead of a page of made-up figures.
 */
export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/booking/${id}`);
}
