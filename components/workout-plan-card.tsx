"use client"

import { LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Exercise {
  name: string
  sets: string
  reps: string
}

interface WorkoutPlanCardProps {
  day: string
  title: string
  duration: string
  difficulty: "Beginner" | "Intermediate" | "Advanced"
  exercises: Exercise[]
  icon: LucideIcon
  color?: "cyan" | "pink" | "green"
}

export function WorkoutPlanCard({ 
  day, 
  title, 
  duration, 
  difficulty, 
  exercises, 
  icon: Icon,
  color = "cyan" 
}: WorkoutPlanCardProps) {
  const colorClasses = {
    cyan: "border-primary/30 hover:border-primary shadow-glow-cyan hover:shadow-glow-cyan",
    pink: "border-secondary/30 hover:border-secondary shadow-glow-pink hover:shadow-glow-pink",
    green: "border-accent/30 hover:border-accent shadow-glow-green hover:shadow-glow-green",
  }

  return (
    <Card 
      className={`p-6 bg-card/30 backdrop-blur-md border transition-all duration-500 hover:scale-105 hover:-translate-y-2 animate-fade-in group ${colorClasses[color]}`}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${
                color === 'cyan' ? 'from-primary/20 to-primary/5' :
                color === 'pink' ? 'from-secondary/20 to-secondary/5' :
                'from-accent/20 to-accent/5'
              } group-hover:scale-110 transition-transform duration-300`}>
                <Icon className={`w-5 h-5 ${
                  color === 'cyan' ? 'text-primary' :
                  color === 'pink' ? 'text-secondary' :
                  'text-accent'
                }`} />
              </div>
              <Badge variant="outline" className="text-xs">{day}</Badge>
            </div>
            <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground">{duration}</p>
          </div>
          <Badge className={`${
            difficulty === 'Beginner' ? 'bg-accent/20 text-accent' :
            difficulty === 'Intermediate' ? 'bg-primary/20 text-primary' :
            'bg-secondary/20 text-secondary'
          }`}>
            {difficulty}
          </Badge>
        </div>

        {/* Exercises List */}
        <div className="space-y-2 pt-2">
          {exercises.map((exercise, idx) => (
            <div 
              key={idx}
              className="flex items-center justify-between p-3 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-300 hover:translate-x-1"
            >
              <span className="text-sm font-medium text-foreground">{exercise.name}</span>
              <span className="text-xs text-muted-foreground">
                {exercise.sets} × {exercise.reps}
              </span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="pt-2">
          <div className="h-1 w-full bg-muted/30 rounded-full overflow-hidden">
            <div className={`h-full bg-gradient-to-r ${
              color === 'cyan' ? 'from-primary to-primary/50' :
              color === 'pink' ? 'from-secondary to-secondary/50' :
              'from-accent to-accent/50'
            } w-0 group-hover:w-full transition-all duration-1000`} />
          </div>
        </div>
      </div>
    </Card>
  )
}

