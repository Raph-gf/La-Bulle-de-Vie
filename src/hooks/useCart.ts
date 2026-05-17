"use client"

import { useState } from "react"

export type CartItem = {
  productId: string
  name: string
  price: number
  quantity: number
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])

  const addItem = (item: CartItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === item.productId)
      if (existing) {
        return prev.map(i =>
          i.productId === item.productId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      return [...prev, item]
    })
  }

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.productId !== productId))
  }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return { items, addItem, removeItem, total }
}
