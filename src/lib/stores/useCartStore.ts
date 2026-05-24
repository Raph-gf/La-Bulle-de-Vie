import { create } from "zustand"
import { persist } from "zustand/middleware"

export type CartItem = {
  id: string
  name: string
  price: number       // cents
  imageUrl: string | null
  medium: string
  dimensions: string
  quantity: number
  stock: number
}

type CartStore = {
  items: CartItem[]
  isOpen: boolean
  add: (product: Omit<CartItem, "quantity">) => void
  remove: (id: string) => void
  updateQty: (id: string, qty: number) => void
  clear: () => void
  open: () => void
  close: () => void
  total: () => number
  count: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      add: (product) => {
        set((state) => {
          const existing = state.items.find(i => i.id === product.id)
          if (existing) {
            return {
              items: state.items.map(i =>
                i.id === product.id
                  ? { ...i, quantity: Math.min(i.quantity + 1, i.stock) }
                  : i
              ),
            }
          }
          return { items: [...state.items, { ...product, quantity: 1 }] }
        })
      },

      remove: (id) => set((state) => ({ items: state.items.filter(i => i.id !== id) })),

      updateQty: (id, qty) => set((state) => ({
        items: qty <= 0
          ? state.items.filter(i => i.id !== id)
          : state.items.map(i => i.id === id ? { ...i, quantity: Math.min(qty, i.stock) } : i),
      })),

      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),

      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: "bdv-cart" }
  )
)
