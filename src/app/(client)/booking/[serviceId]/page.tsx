import BookingWizard from "@/components/booking/BookingWizard"

export default function BookingPage({ params }: { params: { serviceId: string } }) {
  return <BookingWizard serviceId={params.serviceId} />
}
