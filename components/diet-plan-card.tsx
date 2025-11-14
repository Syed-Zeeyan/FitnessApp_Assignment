"use client"

import { LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Meal {
  name: string
  calories: number
  protein: string
  carbs: string
}

interface DietPlanCardProps {
  mealType: string
  time: string
  meals: Meal[]
  totalCalories: number
  icon: LucideIcon
  color?: "cyan" | "pink" | "green"
}

export function DietPlanCard({ 
  mealType, 
  time, 
  meals, 
  totalCalories, 
  icon: Icon,
  color = "cyan" 
}: DietPlanCardProps) {
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
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${
              color === 'cyan' ? 'from-primary/20 to-primary/5' :
              color === 'pink' ? 'from-secondary/20 to-secondary/5' :
              'from-accent/20 to-accent/5'
            } group-hover:scale-110 transition-transform duration-300`}>
              <Icon className={`w-6 h-6 ${
                color === 'cyan' ? 'text-primary' :
                color === 'pink' ? 'text-secondary' :
                'text-accent'
              }`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                {mealType}
              </h3>
              <p className="text-sm text-muted-foreground">{time}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">{totalCalories}</p>
            <p className="text-xs text-muted-foreground">calories</p>
          </div>
        </div>

        {/* Meals List */}
        <div className="space-y-2">
          {meals.map((meal, idx) => (
            <div 
              key={idx}
              className="p-4 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-300 hover:translate-x-1 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{meal.name}</span>
                <Badge variant="outline" className="text-xs">{meal.calories} cal</Badge>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>🥩 {meal.protein}</span>
                <span>🍚 {meal.carbs}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Macros visualization */}
        <div className="pt-2 flex gap-2">
          <div className="flex-1 h-2 bg-primary/30 rounded-full overflow-hidden">
            <div className="h-full bg-primary w-2/3 group-hover:w-full transition-all duration-700" />
          </div>
          <div className="flex-1 h-2 bg-secondary/30 rounded-full overflow-hidden">
            <div className="h-full bg-secondary w-1/2 group-hover:w-full transition-all duration-700 delay-100" />
          </div>
          <div className="flex-1 h-2 bg-accent/30 rounded-full overflow-hidden">
            <div className="h-full bg-accent w-3/4 group-hover:w-full transition-all duration-700 delay-200" />
          </div>
        </div>
      </div>
    </Card>
  )
}

