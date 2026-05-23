import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"
import Bulles from "@/components/animations/Bulles"
import CartDrawer from "@/components/CartDrawer"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Bulles />
      <Navbar />
      <CartDrawer />
      <main>{children}</main>
      <Footer />
    </>
  )
}
