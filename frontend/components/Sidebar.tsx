/**
 * Navigation sidebar with role-based tab visibility.
 *
 * Subsystem: Account Management subsystem (role-based navigation)
 * PAC Layer: Presentation
 * Reqs:      SR-AC2 (RBAC -- shows/hides tabs based on role)
 */

import Link from 'next/link'
import { Wind, LogOut } from 'lucide-react'

interface NavItem {
  id: string
  label: string
  icon: React.ElementType
  section?: string
}

interface SidebarProps {
  nav: NavItem[]
  tab: string
  onTabChange: (tab: string) => void
  userName: string
  userRole: string
  activeAlertCount: number
  variant: 'admin' | 'operator'
  onLogout: () => void
}

export function Sidebar({ nav, tab, onTabChange, userName, userRole, activeAlertCount, variant, onLogout }: SidebarProps) {
  const activeClass  = variant === 'admin' ? 'bg-purple-600' : 'bg-blue-600'
  const logoAccent   = variant === 'admin' ? 'bg-purple-600' : 'bg-blue-500'
  const roleColor    = variant === 'admin' ? 'text-purple-400' : 'text-gray-500'
  const roleBadge    = variant === 'admin' ? 'ADMIN' : null

  return (
    <aside className="w-52 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-gray-800 flex items-center gap-2">
        <div className={`w-7 h-7 ${logoAccent} rounded-lg flex items-center justify-center`}>
          <Wind className="w-4 h-4 text-white" aria-hidden="true" />
        </div>
        <div>
          <span className="font-bold text-sm">SCEMAS</span>
          {roleBadge && <div className={`text-[9px] ${roleColor} font-medium`}>{roleBadge}</div>}
        </div>
      </div>

      <nav className="p-2 space-y-0.5 flex-1 overflow-y-auto">
        {nav.map(({ id, label, icon: Icon, section }) => (
          <div key={id}>
            {section && (
              <div className="px-3 pt-3 pb-1 text-[9px] text-gray-600 font-semibold uppercase tracking-wider">
                {section}
              </div>
            )}
            <button
              onClick={() => onTabChange(id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                tab === id ? `${activeClass} text-white` : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span className="flex-1 text-left">{label}</span>
              {id === 'alerts' && activeAlertCount > 0 && (
                <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                  {activeAlertCount}
                </span>
              )}
            </button>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-800 space-y-1">
        <Link href="/" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors">
          Public View
        </Link>
        <div className="px-3 pt-1">
          <div className="text-xs font-medium text-white truncate">{userName}</div>
          <div className={`text-[10px] ${roleColor} capitalize`}>{userRole}</div>
        </div>
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
          <LogOut className="w-4 h-4" aria-hidden="true" /> Logout
        </button>
      </div>
    </aside>
  )
}