import type { Category } from '../types'

const docs = 'https://www.docs.inductiveautomation.com/docs/8.1'

export const categories: { name: Category; description: string; source: string; color: string }[] = [
  { name: 'Gateway', description: 'The foundation of your system', source: `${docs}/platform/gateway`, color: 'teal' },
  { name: 'Vision', description: 'Windows, clients & bindings', source: `${docs}/ignition-modules/vision`, color: 'blue' },
  { name: 'Perspective', description: 'Views, sessions & transforms', source: `${docs}/ignition-modules/perspective`, color: 'purple' },
  { name: 'Tags', description: 'Your real-time data model', source: `${docs}/platform/tags`, color: 'amber' },
  { name: 'Security', description: 'Identity, access & protection', source: `${docs}/platform/security`, color: 'rose' },
  { name: 'Reporting', description: 'Turn process data into insight', source: `${docs}/ignition-modules/reporting`, color: 'blue' },
  { name: 'Historian', description: 'History, queries & trends', source: `${docs}/ignition-modules/tag-historian`, color: 'purple' },
  { name: 'Transaction Groups', description: 'Connect PLC data to SQL', source: `${docs}/ignition-modules/sql-bridge-transaction-groups`, color: 'amber' },
  { name: 'Alarming', description: 'Events, journals & notification', source: `${docs}/platform/alarming`, color: 'rose' },
]

export function sourceFor(category: Category) {
  return categories.find((item) => item.name === category)!.source
}
