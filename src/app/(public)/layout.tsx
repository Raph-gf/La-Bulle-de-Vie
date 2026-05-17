import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"
import Bulles from "@/components/animations/Bulles"
import ScrollReveal from "@/components/animations/ScrollReveal"
import Counter from "@/components/animations/Counter"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Bulles />
      <ScrollReveal />
      <Counter />
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  )
}
