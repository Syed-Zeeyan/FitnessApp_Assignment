"use client"

import { Activity, Dumbbell, Heart, Zap, TrendingUp, Target, Timer, Flame, Coffee, Sun, Moon, UtensilsCrossed } from "lucide-react"
import { StatsCard } from "@/components/stats-card"
import { WorkoutCardLovable } from "@/components/workout-card-lovable"
import { WorkoutPlanCard } from "@/components/workout-plan-card"
import { DietPlanCard } from "@/components/diet-plan-card"
import { FloatingActionButton } from "@/components/floating-action-button"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"

export default function Dashboard() {
  const workoutPlans = [
    {
      day: "Monday",
      title: "Chest & Triceps",
      duration: "60 min",
      difficulty: "Intermediate" as const,
      icon: Dumbbell,
      color: "cyan" as const,
      exercises: [
        { name: "Bench Press", sets: "4", reps: "8-10" },
        { name: "Incline Dumbbell Press", sets: "3", reps: "10-12" },
        { name: "Cable Flyes", sets: "3", reps: "12-15" },
        { name: "Tricep Dips", sets: "3", reps: "10-12" },
      ]
    },
    {
      day: "Wednesday",
      title: "Back & Biceps",
      duration: "60 min",
      difficulty: "Intermediate" as const,
      icon: Target,
      color: "pink" as const,
      exercises: [
        { name: "Pull-ups", sets: "4", reps: "8-10" },
        { name: "Barbell Rows", sets: "4", reps: "8-10" },
        { name: "Lat Pulldown", sets: "3", reps: "10-12" },
        { name: "Bicep Curls", sets: "3", reps: "12-15" },
      ]
    },
    {
      day: "Friday",
      title: "Legs & Shoulders",
      duration: "70 min",
      difficulty: "Advanced" as const,
      icon: Flame,
      color: "green" as const,
      exercises: [
        { name: "Squats", sets: "5", reps: "6-8" },
        { name: "Romanian Deadlift", sets: "4", reps: "8-10" },
        { name: "Leg Press", sets: "3", reps: "12-15" },
        { name: "Shoulder Press", sets: "4", reps: "8-10" },
      ]
    },
  ]

  const dietPlans = [
    {
      mealType: "Breakfast",
      time: "7:00 AM",
      totalCalories: 520,
      icon: Coffee,
      color: "cyan" as const,
      meals: [
        { name: "Oatmeal with Berries", calories: 280, protein: "12g", carbs: "45g" },
        { name: "Scrambled Eggs", calories: 180, protein: "15g", carbs: "2g" },
        { name: "Protein Shake", calories: 60, protein: "8g", carbs: "3g" },
      ]
    },
    {
      mealType: "Lunch",
      time: "12:30 PM",
      totalCalories: 680,
      icon: Sun,
      color: "pink" as const,
      meals: [
        { name: "Grilled Chicken Breast", calories: 280, protein: "45g", carbs: "0g" },
        { name: "Brown Rice", calories: 215, protein: "5g", carbs: "45g" },
        { name: "Mixed Vegetables", calories: 85, protein: "3g", carbs: "18g" },
        { name: "Avocado", calories: 100, protein: "2g", carbs: "6g" },
      ]
    },
    {
      mealType: "Dinner",
      time: "7:00 PM",
      totalCalories: 590,
      icon: Moon,
      color: "green" as const,
      meals: [
        { name: "Salmon Fillet", calories: 350, protein: "40g", carbs: "0g" },
        { name: "Sweet Potato", calories: 180, protein: "4g", carbs: "41g" },
        { name: "Steamed Broccoli", calories: 60, protein: "5g", carbs: "11g" },
      ]
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-neon rounded-lg shadow-glow-cyan">
              <Zap className="w-6 h-6 text-background" />
            </div>
            <span className="text-xl font-bold text-foreground">FitAI</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">Home</Link>
            <Link href="/plan" className="text-sm text-muted-foreground hover:text-primary transition-colors">My Plan</Link>
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">Dashboard</Link>
          </nav>
          <Link href="/">
            <Button variant="neon" size="sm">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6 animate-fade-in">
          <div className="inline-block">
            <div className="px-4 py-2 bg-primary/10 border border-primary/30 rounded-full text-sm text-primary shadow-glow-cyan">
              ✨ AI-Powered Fitness Assistant
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-foreground tracking-tight">
            Your Personal
            <span className="bg-gradient-neon bg-clip-text text-transparent"> AI Trainer</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform your fitness journey with intelligent workouts, real-time progress tracking, and personalized nutrition plans.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Link href="/plan">
              <Button variant="hero" size="lg">
                <Zap className="w-4 h-4" />
                View My Plan
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="lg">Create New Plan</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-foreground mb-6">Today's Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Calories Burned"
            value="847"
            icon={Flame}
            trend="+12% from yesterday"
            glowColor="cyan"
          />
          <StatsCard
            title="Active Minutes"
            value="68"
            icon={Timer}
            trend="Goal: 90 min"
            glowColor="pink"
          />
          <StatsCard
            title="Heart Rate"
            value="72"
            icon={Heart}
            trend="Avg BPM"
            glowColor="green"
          />
          <StatsCard
            title="Weekly Streak"
            value="5"
            icon={TrendingUp}
            trend="Keep it up!"
            glowColor="cyan"
          />
        </div>
      </section>

      {/* Quick Actions */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-foreground mb-6">Recommended Workouts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <WorkoutCardLovable
            title="HIIT Cardio Blast"
            duration="25 min"
            difficulty="High Intensity"
            icon={Flame}
          />
          <WorkoutCardLovable
            title="Strength Training"
            duration="45 min"
            difficulty="Intermediate"
            icon={Dumbbell}
          />
          <WorkoutCardLovable
            title="Core & Abs"
            duration="15 min"
            difficulty="Beginner"
            icon={Target}
            gradient={false}
          />
        </div>
      </section>

      {/* Workout Plans */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Weekly Workout Plan</h2>
          <Link href="/plan">
            <Button variant="outline" size="sm">View Full Plan</Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {workoutPlans.map((plan, idx) => (
            <WorkoutPlanCard key={idx} {...plan} />
          ))}
        </div>
      </section>

      {/* Diet Plans */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Today's Nutrition Plan</h2>
          <Button variant="outline" size="sm">
            <UtensilsCrossed className="w-4 h-4" />
            Meal Prep Guide
          </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {dietPlans.map((plan, idx) => (
            <DietPlanCard key={idx} {...plan} />
          ))}
        </div>
      </section>

      {/* AI Insights */}
      <section className="container mx-auto px-4 py-12 pb-20">
        <Card className="p-8 bg-card/50 backdrop-blur-sm border-primary/30 shadow-glow-cyan animate-fade-in">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-gradient-neon rounded-xl shadow-glow-pink animate-glow-pulse">
              <Activity className="w-8 h-8 text-background" />
            </div>
            <div className="flex-1 space-y-4">
              <h3 className="text-2xl font-bold text-foreground">AI Insights for Today</h3>
              <p className="text-muted-foreground">
                Based on your activity patterns, you're on track to exceed your weekly goal by 15%. 
                Consider adding a recovery session tomorrow to optimize your performance.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <span className="px-3 py-1 bg-accent/20 text-accent text-sm rounded-full">🎯 On Track</span>
                <span className="px-3 py-1 bg-primary/20 text-primary text-sm rounded-full">💪 Peak Performance</span>
                <span className="px-3 py-1 bg-secondary/20 text-secondary text-sm rounded-full">🔥 5 Day Streak</span>
              </div>
              <Link href="/plan">
                <Button variant="hero" className="mt-4">View Full Analysis</Button>
              </Link>
            </div>
          </div>
        </Card>
      </section>

      {/* Floating Action Button */}
      <FloatingActionButton />
    </div>
  )
}

