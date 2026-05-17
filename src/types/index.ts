import type { Database } from "./database"

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Service = Database["public"]["Tables"]["services"]["Row"]
export type Appointment = Database["public"]["Tables"]["appointments"]["Row"]
export type Review = Database["public"]["Tables"]["reviews"]["Row"]
export type Product = Database["public"]["Tables"]["products"]["Row"]
export type Order = Database["public"]["Tables"]["orders"]["Row"]
