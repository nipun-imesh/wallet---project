export type Task = {
  id: string
  title: string
  description: string
  createdAt?: string
  isComplete?: boolean

  // Wallet fields (optional for older docs)
  amount?: number
  category?: string
  spentAt?: string
}
