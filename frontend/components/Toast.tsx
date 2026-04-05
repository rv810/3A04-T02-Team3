/**
 * Ephemeral notification toast for operation feedback.
 *
 * Subsystem: System infrastructure — reusable UI primitive for all subsystems
 * PAC Layer: Presentation
 * Reqs:      N/A
 */

import { CheckCircle2 } from 'lucide-react'

export function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-5 right-5 bg-gray-800 border border-green-500/30 text-green-400 text-sm px-4 py-2.5 rounded-lg shadow-2xl z-50 flex items-center gap-2">
      <CheckCircle2 className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      {message}
    </div>
  )
}