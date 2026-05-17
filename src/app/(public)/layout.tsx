import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"
import Bulles from "@/components/animations/Bulles"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Bulles />
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  )
}
