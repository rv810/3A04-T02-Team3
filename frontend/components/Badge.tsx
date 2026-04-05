/**
 * Reusable status/severity badge for alerts and sensor readings.
 *
 * Subsystem: Consumes Alert Rules Management subsystem (severity/status display)
 * PAC Layer: Presentation
 * Reqs:      N/A
 */

export function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${className}`}>
      {children}
    </span>
  )
}