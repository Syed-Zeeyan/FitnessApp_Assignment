"use client"

import { LucideIcon } from "lucide-react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface WorkoutCardProps {
  title: string
  duration: string
  difficulty: string
  icon: LucideIcon
  gradient?: boolean
}

export function WorkoutCardLovable({ title, duration, difficulty, icon: Icon, gradient = false }: WorkoutCardProps) {
  const exerciseSlug = title.toLowerCase().replace(/\s+/g, "-")
  
  return (
    <Card className={`p-6 bg-card/50 backdrop-blur-sm border-border hover:border-primary transition-all duration-300 hover:scale-105 ${gradient ? 'bg-gradient-neon' : ''} shadow-glow-cyan hover:shadow-glow-pink animate-fade-in`}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/20 rounded-lg">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{duration}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs px-3 py-1 bg-accent/20 text-accent rounded-full">{difficulty}</span>
          <Link href={`/exercise/${exerciseSlug}`}>
            <Button variant="ghost" size="sm">View</Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}

