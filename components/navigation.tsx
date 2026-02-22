"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Shield,
  LayoutDashboard,
  Calendar,
  History,
  Settings,
  HelpCircle,
  FileText,
  Users,
  Menu,
  X,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NavigationProps {
  user?: any
  className?: string
}

const navigationItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview and analytics"
  },
  {
    name: "Content Calendar",
    href: "/content-calendar",
    icon: Calendar,
    description: "AI-powered content recommendations",
    badge: "New"
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: TrendingUp,
    description: "Content consumption analytics"
  },
  {
    name: "History",
    href: "/history",
    icon: History,
    description: "Past analyses"
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Account preferences"
  },
  {
    name: "Help",
    href: "/help",
    icon: HelpCircle,
    description: "Support and documentation"
  },
  {
    name: "API Docs",
    href: "/api-docs",
    icon: FileText,
    description: "Developer resources"
  }
]

const adminItems = [
  {
    name: "Admin",
    href: "/admin",
    icon: Users,
    description: "System administration"
  }
]

export function Navigation({ user, className }: NavigationProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  // For demo purposes, show all navigation items including admin
  const allItems = [...navigationItems, ...adminItems]

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={cn(
        "bg-white border-b-2 border-red-600 shadow-sm sticky top-0 z-50",
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <Shield className="h-8 w-8 text-[rgba(230,160,147,1)]" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 font-sans">TruthLens</h1>
              <p className="text-xs text-gray-600 -mt-1">Media Integrity Platform</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {allItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "relative flex items-center gap-2 text-sm transition-colors",
                      isActive
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "text-gray-600 hover:text-red-600 hover:bg-red-50"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                    {(item as any).badge && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {(item as any).badge}
                      </Badge>
                    )}
                  </Button>
                </Link>
              )
            })}
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden py-4 border-t border-gray-200"
          >
            <nav className="space-y-2">
              {allItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "w-full justify-start gap-3 text-sm",
                        isActive
                          ? "bg-red-600 text-white"
                          : "text-gray-600 hover:text-red-600 hover:bg-red-50"
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon className="h-4 w-4" />
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          {item.name}
                          {(item as any).badge && (
                            <Badge variant="secondary" className="text-xs">
                              {(item as any).badge}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs opacity-70">{item.description}</div>
                      </div>
                    </Button>
                  </Link>
                )
              })}
            </nav>
          </motion.div>
        )}
      </div>
    </motion.header>
  )
}

export default Navigation