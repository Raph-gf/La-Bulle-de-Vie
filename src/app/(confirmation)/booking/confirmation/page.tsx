import { Suspense } from "react"
import ConfirmationClient from "./ConfirmationClient"

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#F5EDE5" }} />}>
      <ConfirmationClient />
    </Suspense>
  )
}
