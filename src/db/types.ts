export interface Category {
  id?: number
  name: string
  /** name.toLowerCase().trim() — the uniqueness key. */
  nameLower: string
  /** Monthly allocation in minor units. 0 == no budget for this envelope. */
  monthlyBudgetMinor: number
  sortOrder: number
  /** 0 | 1, NOT boolean — IndexedDB cannot index booleans. */
  archived: 0 | 1
}

export interface Expense {
  id?: number
  /** ALWAYS 'YYYY-MM-DD'. Never a Date. See non-negotiable #2. */
  date: string
  categoryId: number
  /** Always positive, minor units. */
  amountMinor: number
  note: string
  createdAt: number // epoch ms
}

export interface Setting {
  key: string
  value: string
}

/** Derived, never user-entered. Always written alongside `name`. */
export const nameKey = (name: string) => name.toLowerCase().trim()
