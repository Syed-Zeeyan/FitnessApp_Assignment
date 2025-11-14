// Shared types for fitness data

export interface UserData {
  name: string
  age: number
  gender: string
  height: number
  weight: number
  fitnessGoal: string
  fitnessLevel: string
  workoutLocation: string
  dietaryPreferences: string
  medicalIssues?: string
  stressLevel: number
}

export interface Exercise {
  name: string
  sets: number
  reps: number
  rest: string
}

export interface WorkoutDay {
  day: string
  exercises: Exercise[]
}

export interface Meal {
  name: string
  description?: string
  calories: number
  protein: string
  carbs: string
  fats: string
}

export interface DietPlan {
  breakfast: Meal
  lunch: Meal
  dinner: Meal
  snacks: Meal[]
}

export interface GenerateResponse {
  workoutPlan: WorkoutDay[]
  dietPlan: DietPlan
  aiTips: string[]
  motivationQuote: string
}

