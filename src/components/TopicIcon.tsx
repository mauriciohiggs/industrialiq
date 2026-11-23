import { Activity, Bell, Database, FileChartColumn, Layers3, Monitor, Network, Server, ShieldCheck } from 'lucide-react'
import type { Category } from '../types'

export function TopicIcon({ category, size = 21 }: { category: Category; size?: number }) {
  const Icon = {
    Gateway: Server, Vision: Monitor, Perspective: Layers3, Tags: Database,
    Security: ShieldCheck, Reporting: FileChartColumn, Historian: Activity,
    'Transaction Groups': Network, Alarming: Bell,
  }[category]
  return <Icon size={size} aria-hidden="true" />
}
