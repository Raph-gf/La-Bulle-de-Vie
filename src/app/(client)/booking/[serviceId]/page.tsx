export default function BookingPage({ params }: { params: { serviceId: string } }) {
  return <div>Booking for {params.serviceId}</div>
}
