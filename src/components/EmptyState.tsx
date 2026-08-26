import './EmptyState.css'

export default function EmptyState({ children }: { children: string }) {
  return <p className="empty-state">{children}</p>
}
