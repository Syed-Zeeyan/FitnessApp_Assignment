"use client"

import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSearchParams, useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import Link from "next/link"
import { Loader2, Download, Volume2, Save, RefreshCw, Dumbbell, UtensilsCrossed, Sparkles } from "lucide-react"
import type { GenerateResponse, UserData } from "@/types/fitness"
import jsPDF from "jspdf"
import { AudioPlayer } from "@/components/audio-player"
import { WorkoutCard } from "@/components/workout-card"
import { ErrorBoundary } from "@/components/error-boundary"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function PlanPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [fitnessData, setFitnessData] = useState<UserData | null>(null)
  const [planData, setPlanData] = useState<GenerateResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workoutAudioUrl, setWorkoutAudioUrl] = useState<string | null>(null)
  const [dietAudioUrl, setDietAudioUrl] = useState<string | null>(null)
  const [workoutLoading, setWorkoutLoading] = useState(false)
  const [dietLoading, setDietLoading] = useState(false)
  const [voiceCoachEnabled, setVoiceCoachEnabled] = useState(true)
  const [voiceCoachLoading, setVoiceCoachLoading] = useState(false)
  const [voiceCoachAudioUrl, setVoiceCoachAudioUrl] = useState<string | null>(null)
  const voiceCoachPlayedRef = useRef(false)
  const [showToast, setShowToast] = useState(false)

  // Load voice coach preference from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("voiceCoachEnabled")
      if (saved !== null) {
        setVoiceCoachEnabled(saved === "true")
      }
    }
  }, [])

  useEffect(() => {
    loadFitnessData()
  }, [searchParams])

  useEffect(() => {
    if (fitnessData) {
      // Check if user is coming from form submission (has query params)
      // If coming from form, always generate new plan
      const hasQueryParams = searchParams.toString().length > 0
      
      if (hasQueryParams) {
        // User just submitted form - always generate new plan
        console.log("[Plan] Generating new plan from form submission")
        generatePlan()
        return
      }
      
      // User navigated back or refreshed - check cache
      const savedPlan = localStorage.getItem("fitnessPlan")
      const savedFitnessData = localStorage.getItem("fitnessData")
      
      // Only load from cache if:
      // 1. Plan exists in localStorage, AND
      // 2. Fitness data matches saved data
      if (savedPlan && savedFitnessData) {
        try {
          const parsedPlan = JSON.parse(savedPlan)
          const parsedFitnessData = JSON.parse(savedFitnessData)
          
          // Check if fitness data matches (simple comparison)
          const dataMatches = JSON.stringify(parsedFitnessData) === JSON.stringify(fitnessData)
          
          if (dataMatches && parsedPlan) {
            // Load existing plan from cache
            console.log("[Plan] Loading cached plan")
            setPlanData(parsedPlan)
            setLoading(false)
            setError(null)
            return
          } else {
            console.log("[Plan] Fitness data changed, generating new plan")
          }
        } catch (e) {
          console.error("Error loading cached plan:", e)
          // If parsing fails, generate new plan
        }
      }
      
      // Generate new plan if no cache or data changed
      generatePlan()
    }
  }, [fitnessData, searchParams])

  // Auto-play voice coach when plan is loaded and rendered
  // Check localStorage after plan data is fully loaded
  useEffect(() => {
    if (!planData || !fitnessData || loading) return

    // Check localStorage for voice coach preference
    const savedPreference = localStorage.getItem("voiceCoachEnabled")
    const isEnabled = savedPreference === null ? true : savedPreference === "true"
    
    // Update state if different from localStorage
    if (isEnabled !== voiceCoachEnabled) {
      setVoiceCoachEnabled(isEnabled)
    }

    // Auto-play if enabled and not already played
    if (
      isEnabled &&
      !voiceCoachLoading &&
      !voiceCoachAudioUrl &&
      !voiceCoachPlayedRef.current
    ) {
      voiceCoachPlayedRef.current = true
      playVoiceCoach()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planData, fitnessData, loading])

  const handleVoiceCoachToggle = (enabled: boolean) => {
    setVoiceCoachEnabled(enabled)
    localStorage.setItem("voiceCoachEnabled", enabled.toString())
    
    // Stop current audio if disabling
    if (!enabled && voiceCoachAudioUrl) {
      const audio = document.querySelector('audio[data-voice-coach]') as HTMLAudioElement
      if (audio) {
        audio.pause()
        audio.currentTime = 0
      }
      // Data URLs don't need revokeObjectURL
      setVoiceCoachAudioUrl(null)
    }
  }

  const playVoiceCoach = async () => {
    if (!planData || !fitnessData || voiceCoachLoading) return

    setVoiceCoachLoading(true)
    try {
      // Step 1: Generate speech from /api/voice-coach
      const speechResponse = await fetch("/api/voice-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fitnessData.name,
          goal: fitnessData.fitnessGoal,
          fitnessLevel: fitnessData.fitnessLevel,
          tone: "motivational",
        }),
      })

      if (!speechResponse.ok) {
        throw new Error("Failed to generate speech")
      }

      const speechData = await speechResponse.json()
      const speechText = speechData.speech

      // Step 2: Convert speech to audio using /api/tts
      const ttsResponse = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "voice-coach",
          text: speechText,
        }),
      })

      if (!ttsResponse.ok) {
        throw new Error("Failed to generate audio")
      }

      const ttsData = await ttsResponse.json()
      const audioDataUrl = ttsData.audioUrl || `data:audio/mpeg;base64,${ttsData.audioBase64}`

      // Show toast notification
      setShowToast(true)
      setTimeout(() => {
        setShowToast(false)
      }, 3000)

      // Step 3: Auto-play the audio
      const audio = new Audio(audioDataUrl)
      audio.setAttribute("data-voice-coach", "true")
      audio.play().catch((error) => {
        console.error("Error playing voice coach audio:", error)
        // Some browsers require user interaction before autoplay
        // We'll still set the URL so user can play manually if needed
      })

      setVoiceCoachAudioUrl(audioDataUrl)

      // Cleanup on audio end (data URLs don't need revokeObjectURL)
      audio.onended = () => {
        setVoiceCoachAudioUrl(null)
      }
    } catch (error) {
      console.error("Error playing voice coach:", error)
    } finally {
      setVoiceCoachLoading(false)
    }
  }

  // Cleanup audio URLs on unmount
  useEffect(() => {
    return () => {
      if (workoutAudioUrl) {
        URL.revokeObjectURL(workoutAudioUrl)
      }
      if (dietAudioUrl) {
        URL.revokeObjectURL(dietAudioUrl)
      }
      // Data URLs don't need cleanup
    }
  }, [workoutAudioUrl, dietAudioUrl, voiceCoachAudioUrl])

  const loadFitnessData = () => {
    // Try to get data from query params first
    const paramsData: Partial<UserData> = {}
    const name = searchParams.get("name")
    const age = searchParams.get("age")
    const gender = searchParams.get("gender")
    const height = searchParams.get("height")
    const weight = searchParams.get("weight")
    const fitnessGoal = searchParams.get("fitnessGoal")
    const fitnessLevel = searchParams.get("fitnessLevel")
    const workoutLocation = searchParams.get("workoutLocation")
    const dietaryPreferences = searchParams.get("dietaryPreferences")
    const medicalIssues = searchParams.get("medicalIssues")
    const stressLevel = searchParams.get("stressLevel")

    if (name) {
      paramsData.name = name
      paramsData.age = age ? parseInt(age) : undefined
      paramsData.gender = gender || undefined
      paramsData.height = height ? parseInt(height) : undefined
      paramsData.weight = weight ? parseInt(weight) : undefined
      paramsData.fitnessGoal = fitnessGoal || undefined
      paramsData.fitnessLevel = fitnessLevel || undefined
      paramsData.workoutLocation = workoutLocation || undefined
      paramsData.dietaryPreferences = dietaryPreferences || undefined
      paramsData.medicalIssues = medicalIssues || undefined
      paramsData.stressLevel = stressLevel ? parseInt(stressLevel) : undefined
      setFitnessData(paramsData as UserData)
      // Save to localStorage for persistence
      localStorage.setItem("fitnessData", JSON.stringify(paramsData))
    } else {
      // Fallback to localStorage
      const data = localStorage.getItem("fitnessData")
      if (data) {
        try {
          setFitnessData(JSON.parse(data))
        } catch {
          router.push("/")
        }
      } else {
        router.push("/")
      }
    }
  }

  const generatePlan = async () => {
    if (!fitnessData) return

    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fitnessData),
      })

      if (!response.ok) {
        let errorData: any = {}
        try {
          const text = await response.text()
          errorData = text ? JSON.parse(text) : {}
        } catch (e) {
          console.error("Failed to parse error response:", e)
        }
        
        const errorMessage = errorData.details || errorData.error || `HTTP ${response.status}: ${response.statusText}` || "Failed to generate plan"
        console.error("Plan generation error:", {
          status: response.status,
          statusText: response.statusText,
          errorMessage,
          errorData,
        })
        setError(errorMessage)
        throw new Error(errorMessage)
      }

      const data = await response.json()
      setPlanData(data)
      setError(null)
      // Save to localStorage
      localStorage.setItem("fitnessPlan", JSON.stringify(data))
    } catch (error: any) {
      console.error("Error generating plan:", error)
      if (!error.message || error.message === "Failed to generate plan") {
        setError("Failed to generate fitness plan. Please check your API key and try again.")
      } else {
        setError(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    await generatePlan()
    setRegenerating(false)
  }

  const handleExportPDF = () => {
    if (!planData || !fitnessData) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    let yPos = margin

    // Helper function to add new page if needed
    const checkPageBreak = (requiredSpace: number = 10) => {
      if (yPos + requiredSpace > pageHeight - margin) {
        doc.addPage()
        yPos = margin
        return true
      }
      return false
    }

    // Helper function to split text into lines that fit the page width
    const splitTextToLines = (text: string, maxWidth: number): string[] => {
      return doc.splitTextToSize(text, maxWidth)
    }

    // Title Section
    doc.setFontSize(24)
    doc.setFont("helvetica", "bold")
    const titleLines = splitTextToLines("Your Personalized Fitness Plan", pageWidth - 2 * margin)
    doc.text(titleLines, pageWidth / 2, yPos, { align: "center" })
    yPos += titleLines.length * 8 + 10

    // User Info Section
    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
    doc.text(`Name: ${fitnessData.name}`, margin, yPos)
    yPos += 7
    doc.text(`Age: ${fitnessData.age} years | Gender: ${fitnessData.gender}`, margin, yPos)
    yPos += 7
    doc.text(
      `Height: ${fitnessData.height} cm | Weight: ${fitnessData.weight} kg`,
      margin,
      yPos
    )
    yPos += 7
    doc.text(
      `Fitness Goal: ${fitnessData.fitnessGoal} | Level: ${fitnessData.fitnessLevel}`,
      margin,
      yPos
    )
    yPos += 7
    doc.text(`Workout Location: ${fitnessData.workoutLocation}`, margin, yPos)
    yPos += 7
    doc.text(`Dietary Preferences: ${fitnessData.dietaryPreferences}`, margin, yPos)
    yPos += 15

    // Workout Plan Section
    checkPageBreak(20)
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("Workout Plan", margin, yPos)
    yPos += 12
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 8

    planData.workoutPlan.forEach((day, dayIndex) => {
      checkPageBreak(15)
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text(day.day, margin, yPos)
      yPos += 8

      doc.setFontSize(11)
      doc.setFont("helvetica", "normal")
      day.exercises.forEach((exercise, exerciseIndex) => {
        checkPageBreak(8)
        const exerciseText = `${exerciseIndex + 1}. ${exercise.name}`
        doc.text(exerciseText, margin + 5, yPos)
        yPos += 6

        const detailsText = `   Sets: ${exercise.sets} | Reps: ${exercise.reps} | Rest: ${exercise.rest}`
        doc.setFontSize(10)
        doc.text(detailsText, margin + 5, yPos)
        yPos += 7
      })
      yPos += 3
    })

    // Diet Plan Section
    checkPageBreak(25)
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("Diet Plan", margin, yPos)
    yPos += 12
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 8

    const meals = [
      { name: "Breakfast", meal: planData.dietPlan.breakfast },
      { name: "Lunch", meal: planData.dietPlan.lunch },
      { name: "Dinner", meal: planData.dietPlan.dinner },
    ]

    meals.forEach(({ name, meal }) => {
      checkPageBreak(20)
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text(name, margin, yPos)
      yPos += 8

      doc.setFontSize(12)
      doc.setFont("helvetica", "normal")
      doc.text(meal.name, margin + 5, yPos)
      yPos += 7

      if (meal.description) {
        doc.setFontSize(10)
        const descLines = splitTextToLines(meal.description, pageWidth - 2 * margin - 10)
        descLines.forEach((line) => {
          checkPageBreak(6)
          doc.text(line, margin + 5, yPos)
          yPos += 6
        })
        yPos += 2
      }

      doc.setFontSize(10)
      doc.text(`Calories: ${meal.calories}`, margin + 5, yPos)
      yPos += 6
      doc.text(`Protein: ${meal.protein} | Carbs: ${meal.carbs} | Fats: ${meal.fats}`, margin + 5, yPos)
      yPos += 10
    })

    // Snacks Section
    if (planData.dietPlan.snacks.length > 0) {
      checkPageBreak(15)
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text("Snacks", margin, yPos)
      yPos += 8

      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      planData.dietPlan.snacks.forEach((snack) => {
        checkPageBreak(12)
        doc.text(`• ${snack.name}`, margin + 5, yPos)
        yPos += 6
        if (snack.description) {
          const snackDescLines = splitTextToLines(snack.description, pageWidth - 2 * margin - 10)
          snackDescLines.forEach((line) => {
            checkPageBreak(6)
            doc.text(line, margin + 10, yPos)
            yPos += 6
          })
        }
        doc.text(
          `  Calories: ${snack.calories} | Protein: ${snack.protein} | Carbs: ${snack.carbs} | Fats: ${snack.fats}`,
          margin + 5,
          yPos
        )
        yPos += 8
      })
    }

    // AI Tips Section
    checkPageBreak(25)
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("AI Tips", margin, yPos)
    yPos += 12
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 8

    doc.setFontSize(11)
    doc.setFont("helvetica", "normal")
    planData.aiTips.forEach((tip, index) => {
      checkPageBreak(12)
      const tipLines = splitTextToLines(`${index + 1}. ${tip}`, pageWidth - 2 * margin - 10)
      tipLines.forEach((line) => {
        checkPageBreak(7)
        doc.text(line, margin + 5, yPos)
        yPos += 7
      })
      yPos += 3
    })

    // Motivation Quote Section
    checkPageBreak(30)
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("Daily Motivation", pageWidth / 2, yPos, { align: "center" })
    yPos += 12
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 10

    doc.setFontSize(14)
    doc.setFont("helvetica", "italic")
    const quoteLines = splitTextToLines(
      `"${planData.motivationQuote}"`,
      pageWidth - 2 * margin
    )
    quoteLines.forEach((line) => {
      checkPageBreak(8)
      doc.text(line, pageWidth / 2, yPos, { align: "center" })
      yPos += 8
    })

    // Footer
    yPos = pageHeight - 15
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(128, 128, 128)
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} by AI Fitness Coach`,
      pageWidth / 2,
      yPos,
      { align: "center" }
    )

    // Save PDF
    doc.save(`fitness-plan-${fitnessData.name.replace(/\s+/g, "-")}.pdf`)
  }

  const handleReadWorkout = async () => {
    if (!planData || !fitnessData) return

    setWorkoutLoading(true)
    setWorkoutAudioUrl(null)

    try {
      // Format workout text
      let text = `Your workout plan for ${fitnessData.name}. `
      text += `Your fitness goal is ${fitnessData.fitnessGoal} and your level is ${fitnessData.fitnessLevel}. `
      text += "Here's your 7-day workout plan. "

      planData.workoutPlan.forEach((day) => {
        text += `${day.day}: `
        day.exercises.forEach((exercise) => {
          text += `${exercise.name}. Do ${exercise.sets} sets of ${exercise.reps} reps. Rest for ${exercise.rest} between sets. `
        })
        text += " "
      })

      // Call TTS API
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "workout", text }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate audio")
      }

      // Create blob URL from audio response
      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      setWorkoutAudioUrl(audioUrl)
    } catch (error) {
      console.error("Error generating workout audio:", error)
      alert("Failed to generate audio. Please check your ElevenLabs API key.")
    } finally {
      setWorkoutLoading(false)
    }
  }

  const handleReadDiet = async () => {
    if (!planData || !fitnessData) return

    setDietLoading(true)
    setDietAudioUrl(null)

    try {
      // Format diet text
      let text = `Your personalized diet plan for ${fitnessData.name}. `
      text += `Based on your dietary preferences: ${fitnessData.dietaryPreferences}. `

      text += `For breakfast, have ${planData.dietPlan.breakfast.name}. `
      if (planData.dietPlan.breakfast.description) {
        text += `${planData.dietPlan.breakfast.description}. `
      }
      text += `This meal contains ${planData.dietPlan.breakfast.calories} calories, ${planData.dietPlan.breakfast.protein} of protein, ${planData.dietPlan.breakfast.carbs} of carbohydrates, and ${planData.dietPlan.breakfast.fats} of fats. `

      text += `For lunch, have ${planData.dietPlan.lunch.name}. `
      if (planData.dietPlan.lunch.description) {
        text += `${planData.dietPlan.lunch.description}. `
      }
      text += `This meal contains ${planData.dietPlan.lunch.calories} calories, ${planData.dietPlan.lunch.protein} of protein, ${planData.dietPlan.lunch.carbs} of carbohydrates, and ${planData.dietPlan.lunch.fats} of fats. `

      text += `For dinner, have ${planData.dietPlan.dinner.name}. `
      if (planData.dietPlan.dinner.description) {
        text += `${planData.dietPlan.dinner.description}. `
      }
      text += `This meal contains ${planData.dietPlan.dinner.calories} calories, ${planData.dietPlan.dinner.protein} of protein, ${planData.dietPlan.dinner.carbs} of carbohydrates, and ${planData.dietPlan.dinner.fats} of fats. `

      if (planData.dietPlan.snacks.length > 0) {
        text += "For snacks, you can have: "
        planData.dietPlan.snacks.forEach((snack) => {
          text += `${snack.name}. `
        })
      }

      // Call TTS API
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "diet", text }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate audio")
      }

      // Create blob URL from audio response
      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      setDietAudioUrl(audioUrl)
    } catch (error) {
      console.error("Error generating diet audio:", error)
      alert("Failed to generate audio. Please check your ElevenLabs API key.")
    } finally {
      setDietLoading(false)
    }
  }

  const handleSavePlan = () => {
    if (!planData || !fitnessData) return

    const dataToSave = {
      userData: fitnessData,
      planData: planData,
      savedAt: new Date().toISOString(),
    }

    localStorage.setItem("savedFitnessPlan", JSON.stringify(dataToSave))
    
    // Show feedback
    const button = document.activeElement as HTMLElement
    const originalText = button.textContent
    button.textContent = "Saved!"
    setTimeout(() => {
      button.textContent = originalText
    }, 2000)
  }

  if (loading || !fitnessData) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Generating your fitness plan...</p>
        </div>
      </div>
    )
  }

  if (!planData || error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Generating Plan</CardTitle>
            <CardDescription>
              {error || "Failed to load plan. Please try again."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">Possible causes:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Invalid or missing GEMINI_API_KEY</li>
                  <li>API rate limit exceeded</li>
                  <li>Network connectivity issues</li>
                  <li>Model not available for your API key</li>
                </ul>
              </div>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleRegenerate} variant="default">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
                <Button onClick={() => router.push("/")} variant="outline">
                  Back to Form
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed top-4 right-4 z-50"
          >
            <Card className="bg-background/95 backdrop-blur-xl border-primary/30 shadow-lg">
              <CardContent className="p-4 flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: 2 }}
                >
                  🎧
                </motion.div>
                <span className="font-semibold">Voice Coach Activated</span>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
          {/* Header */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Your Fitness Plan
            </h1>
            <p className="text-muted-foreground">
              Personalized plan for {fitnessData.name}
            </p>
          </motion.div>

        {/* AI Voice Coach Toggle */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="relative overflow-hidden bg-background/80 backdrop-blur-xl border-primary/20">
            {/* Neon glow effect */}
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 20px rgba(59, 130, 246, 0.3)",
                  "0 0 30px rgba(59, 130, 246, 0.5)",
                  "0 0 20px rgba(59, 130, 246, 0.3)",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute -inset-0.5 bg-gradient-to-r from-primary via-purple-500 to-primary opacity-50 blur-sm"
            />
            <CardContent className="relative z-10 p-4 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <motion.div
                    animate={{
                      scale: voiceCoachEnabled ? [1, 1.1, 1] : 1,
                    }}
                    transition={{ duration: 0.5 }}
                  >
                    <Sparkles className="h-5 w-5 text-primary" />
                  </motion.div>
                  <div className="flex-1">
                    <Label
                      htmlFor="voice-coach-toggle"
                      className="text-base font-semibold cursor-pointer"
                    >
                      AI Voice Coach
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {voiceCoachLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Generating motivational speech...
                        </span>
                      ) : voiceCoachEnabled ? (
                        "Motivational speech will play automatically"
                      ) : (
                        "Voice coach is disabled"
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {voiceCoachLoading && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  <Switch
                    id="voice-coach-toggle"
                    checked={voiceCoachEnabled}
                    onCheckedChange={handleVoiceCoachToggle}
                    disabled={voiceCoachLoading}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-2"
        >
          <Button
            onClick={handleRegenerate}
            disabled={regenerating}
            variant="outline"
          >
            {regenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </>
            )}
          </Button>
          <Button onClick={handleExportPDF} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button
            onClick={handleReadWorkout}
            disabled={workoutLoading}
            variant="outline"
          >
            {workoutLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Dumbbell className="mr-2 h-4 w-4" />
                Read Workout
              </>
            )}
          </Button>
          <Button
            onClick={handleReadDiet}
            disabled={dietLoading}
            variant="outline"
          >
            {dietLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <UtensilsCrossed className="mr-2 h-4 w-4" />
                Read Diet
              </>
            )}
          </Button>
          <Button onClick={handleSavePlan} variant="outline">
            <Save className="mr-2 h-4 w-4" />
            Save Plan
          </Button>
        </motion.div>

        {/* Workout Audio Player */}
        <AudioPlayer
          audioUrl={workoutAudioUrl}
          isLoading={workoutLoading}
          onEnded={() => setWorkoutAudioUrl(null)}
        />

        {/* Diet Audio Player */}
        <AudioPlayer
          audioUrl={dietAudioUrl}
          isLoading={dietLoading}
          onEnded={() => setDietAudioUrl(null)}
        />

        {/* Workout Plan - Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Workout Plan</CardTitle>
              <CardDescription>
                Your 7-day exercise routine
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AnimatePresence>
                  {planData.workoutPlan.map((day, index) => (
                    <AccordionItem key={day.day} value={day.day}>
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{day.day}</span>
                          <span className="text-sm text-muted-foreground">
                            ({day.exercises.length} exercises)
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3 pt-2"
                        >
                          {day.exercises.map((exercise, idx) => (
                            <ErrorBoundary key={idx}>
                              <WorkoutCard
                                exercise={exercise}
                                index={idx}
                              />
                            </ErrorBoundary>
                          ))}
                        </motion.div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </AnimatePresence>
              </Accordion>
            </CardContent>
          </Card>
        </motion.div>

        {/* Diet Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Diet Plan</CardTitle>
              <CardDescription>
                Your daily meal recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="meals" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="meals">Meals</TabsTrigger>
                  <TabsTrigger value="snacks">Snacks</TabsTrigger>
                </TabsList>
                <TabsContent value="meals" className="space-y-4 mt-4">
                  {[
                    { name: "Breakfast", meal: planData.dietPlan.breakfast },
                    { name: "Lunch", meal: planData.dietPlan.lunch },
                    { name: "Dinner", meal: planData.dietPlan.dinner },
                  ].map(({ name, meal }, idx) => (
                    <motion.div
                      key={name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + idx * 0.1 }}
                      className="p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg capitalize">
                            {name}
                          </h3>
                          <Link
                            href={`/exercise/${meal.name.toLowerCase().replace(/\s+/g, "-")}`}
                            className="hover:text-primary transition-colors"
                          >
                            <p className="font-medium text-primary mt-1 hover:underline cursor-pointer">
                              {meal.name}
                            </p>
                          </Link>
                          {meal.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {meal.description}
                            </p>
                          )}
                        </div>
                        <Link
                          href={`/exercise/${meal.name.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Calories
                          </p>
                          <p className="font-semibold">{meal.calories}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Protein
                          </p>
                          <p className="font-semibold">{meal.protein}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Carbs
                          </p>
                          <p className="font-semibold">{meal.carbs}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Fats</p>
                          <p className="font-semibold">{meal.fats}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </TabsContent>
                <TabsContent value="snacks" className="space-y-4 mt-4">
                  {planData.dietPlan.snacks.length > 0 ? (
                    planData.dietPlan.snacks.map((snack, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + idx * 0.1 }}
                        className="p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <Link
                              href={`/exercise/${snack.name.toLowerCase().replace(/\s+/g, "-")}`}
                              className="hover:text-primary transition-colors"
                            >
                              <p className="font-medium text-primary hover:underline cursor-pointer">
                                {snack.name}
                              </p>
                            </Link>
                            {snack.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {snack.description}
                              </p>
                            )}
                          </div>
                          <Link
                            href={`/exercise/${snack.name.toLowerCase().replace(/\s+/g, "-")}`}
                          >
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </Link>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Calories
                            </p>
                            <p className="font-semibold">{snack.calories}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Protein
                            </p>
                            <p className="font-semibold">{snack.protein}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Carbs
                            </p>
                            <p className="font-semibold">{snack.carbs}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Fats
                            </p>
                            <p className="font-semibold">{snack.fats}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No snacks recommended
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>AI Tips</CardTitle>
              <CardDescription>
                Personalized advice for your fitness journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {planData.aiTips.map((tip, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + idx * 0.1 }}
                    className="p-4 rounded-lg border-l-4 border-primary bg-muted/30"
                  >
                    <p className="text-sm">{tip}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Motivation Quote */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.7, type: "spring" }}
                className="text-center space-y-4"
              >
                <p className="text-2xl md:text-3xl font-bold text-primary">
                  💪
                </p>
                <p className="text-lg md:text-xl italic text-foreground">
                  "{planData.motivationQuote}"
                </p>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex justify-center pt-4"
        >
          <Link href="/">
            <Button variant="outline">Update My Information</Button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}
