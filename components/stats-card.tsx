"use client"

import { LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"

interface StatsCardProps {
  title: string
  value: string
  icon: LucideIcon
  trend?: string
  glowColor?: "cyan" | "pink" | "green"
}

export function StatsCard({ title, value, icon: Icon, trend, glowColor = "cyan" }: StatsCardProps) {
  const glowClass = {
    cyan: "shadow-glow-cyan hover:shadow-glow-cyan",
    pink: "shadow-glow-pink hover:shadow-glow-pink",
    green: "shadow-glow-green hover:shadow-glow-green",
  }[glowColor]

  return (
    <Card className={`p-6 bg-card/50 backdrop-blur-sm border-border hover:border-primary transition-all duration-300 ${glowClass} animate-fade-in`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {trend && (
            <p className="text-xs text-accent">{trend}</p>
          )}
        </div>
        <div className="p-3 bg-primary/10 rounded-lg">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </Card>
  )
}

