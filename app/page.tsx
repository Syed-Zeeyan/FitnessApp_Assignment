"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Upload, Camera, Info, Sparkles } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  age: z.coerce
    .number()
    .min(13, "Age must be at least 13")
    .max(120, "Age must be less than 120"),
  gender: z.enum(["male", "female", "other"], {
    required_error: "Please select a gender",
  }),
  height: z.coerce
    .number()
    .min(100, "Height must be at least 100 cm")
    .max(250, "Height must be less than 250 cm"),
  weight: z.coerce
    .number()
    .min(30, "Weight must be at least 30 kg")
    .max(300, "Weight must be less than 300 kg"),
  fitnessGoal: z.enum(
    [
      "lose-weight",
      "build-muscle",
      "improve-endurance",
      "maintain-fitness",
      "general-health",
    ],
    {
      required_error: "Please select a fitness goal",
    }
  ),
  fitnessLevel: z.enum(
    ["beginner", "intermediate", "advanced", "expert"],
    {
      required_error: "Please select your fitness level",
    }
  ),
  workoutLocation: z.enum(["home", "gym", "outdoor", "mixed"], {
    required_error: "Please select a workout location",
  }),
  dietaryPreferences: z.string().min(1, "Please enter your dietary preferences"),
  medicalIssues: z.string().optional(),
  stressLevel: z.array(z.number()).length(1),
})

type FormValues = z.infer<typeof formSchema>

export default function Home() {
  const router = useRouter()
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      age: undefined,
      gender: undefined,
      height: undefined,
      weight: undefined,
      fitnessGoal: undefined,
      fitnessLevel: undefined,
      workoutLocation: undefined,
      dietaryPreferences: "",
      medicalIssues: "",
      stressLevel: [5],
    },
  })

  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [analysisResults, setAnalysisResults] = useState<{
    bodyFat?: string
    posture?: string
    fitnessLevel?: string
    weightRange?: string
    tip?: string
  } | null>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Helper function to extract weight from weightRange
  const extractWeightFromRange = (weightRange: string): number | null => {
    if (!weightRange) return null

    // Try to extract numbers from patterns like "65–75 kg", "65-75 kg", "65 to 75 kg", etc.
    const match = weightRange.match(/(\d+)\s*[–\-to]+\s*(\d+)/i)
    if (match) {
      const min = parseInt(match[1])
      const max = parseInt(match[2])
      // Return the middle value
      return Math.round((min + max) / 2)
    }

    // Try to extract single number
    const singleMatch = weightRange.match(/(\d+)/)
    if (singleMatch) {
      return parseInt(singleMatch[1])
    }

    return null
  }

  // Helper function to map AI fitness level to form enum
  const mapFitnessLevel = (level: string): "beginner" | "intermediate" | "advanced" | "expert" | null => {
    const normalized = level.toLowerCase().trim()
    if (normalized.includes("beginner")) return "beginner"
    if (normalized.includes("intermediate")) return "intermediate"
    if (normalized.includes("advanced")) return "advanced"
    if (normalized.includes("expert")) return "expert"
    return null
  }

  // Helper function to map AI gender to form enum
  const mapGender = (gender: string): "male" | "female" | "other" | null => {
    const normalized = gender.toLowerCase().trim()
    if (normalized.includes("male") && !normalized.includes("fe")) return "male"
    if (normalized.includes("female")) return "female"
    if (normalized.includes("other")) return "other"
    return null
  }

  // Helper function to generate AI tip based on analysis data
  const generateVisionTip = (data: {
    posture?: string
    fitnessLevel?: string
    bodyFat?: string
  }): string => {
    const tips: string[] = []

    // Posture-based tips
    if (data.posture) {
      const postureLower = data.posture.toLowerCase()
      if (postureLower.includes("poor") || postureLower.includes("round")) {
        tips.push("Your posture suggests mild shoulder rounding. Try adding face pulls and planks to strengthen your posterior chain.")
      } else if (postureLower.includes("average")) {
        tips.push("Your posture could benefit from core strengthening exercises like dead bugs and bird dogs.")
      } else if (postureLower.includes("good")) {
        tips.push("Great posture! Maintain it with regular stretching and core work.")
      }
    }

    // Fitness level-based tips
    if (data.fitnessLevel) {
      const levelLower = data.fitnessLevel.toLowerCase()
      if (levelLower.includes("beginner")) {
        tips.push("Start with bodyweight exercises and focus on form before adding resistance.")
      } else if (levelLower.includes("intermediate")) {
        tips.push("Consider progressive overload and periodization to continue improving.")
      } else if (levelLower.includes("advanced")) {
        tips.push("Focus on recovery and advanced training techniques to break plateaus.")
      }
    }

    // Body fat-based tips
    if (data.bodyFat) {
      const bodyFatNum = parseFloat(data.bodyFat.replace(/[^0-9.]/g, ""))
      if (!isNaN(bodyFatNum)) {
        if (bodyFatNum > 25) {
          tips.push("Consider a caloric deficit combined with strength training to reduce body fat while preserving muscle.")
        } else if (bodyFatNum < 15) {
          tips.push("Maintain your lean physique with adequate protein intake and consistent training.")
        }
      }
    }

    return tips.length > 0 ? tips[0] : "Continue with consistent training and proper nutrition for best results."
  }

  const handleAnalyze = async () => {
    if (!selectedImage) return

    setAnalyzing(true)
    setShowToast(true)
    setToastMessage("📸 Analyzing image…")

    try {
      const formData = new FormData()
      formData.append("image", selectedImage)

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to analyze image")
      }

      const result = await response.json()

      // Check if API returned success
      if (!result.success) {
        throw new Error(result.error || "Analysis failed")
      }

      const data = result.data

      // Auto-fill form fields
      if (data.gender) {
        const mappedGender = mapGender(data.gender)
        if (mappedGender) {
          form.setValue("gender", mappedGender)
        }
      }

      if (data.fitnessLevel) {
        const mappedLevel = mapFitnessLevel(data.fitnessLevel)
        if (mappedLevel) {
          form.setValue("fitnessLevel", mappedLevel)
        }
      }

      if (data.weightRange) {
        const extractedWeight = extractWeightFromRange(data.weightRange)
        if (extractedWeight) {
          form.setValue("weight", extractedWeight)
        }
      }

      // Store bodyFat, posture, weightRange in state (not in form)
      // Generate AI tip based on analysis
      const tip = generateVisionTip({
        posture: data.posture,
        fitnessLevel: data.fitnessLevel,
        bodyFat: data.bodyFat,
      })

      setAnalysisResults({
        bodyFat: data.bodyFat || undefined,
        posture: data.posture || undefined,
        fitnessLevel: data.fitnessLevel || undefined,
        weightRange: data.weightRange || undefined,
        tip: tip,
      })

      // Show success toast
      setToastMessage("🎉 AI Analysis Complete: Form Updated!")
      setTimeout(() => {
        setShowToast(false)
      }, 4000)
    } catch (error: any) {
      console.error("Error analyzing image:", error)
      setToastMessage(`❌ ${error.message || "Analysis failed. Please try again."}`)
      setTimeout(() => {
        setShowToast(false)
      }, 4000)
      setAnalysisResults(null)
    } finally {
      setAnalyzing(false)
    }
  }

  const onSubmit = (data: FormValues) => {
    // Store in localStorage
    localStorage.setItem("fitnessData", JSON.stringify(data))
    
    // Create query params
    const params = new URLSearchParams({
      name: data.name,
      age: data.age.toString(),
      gender: data.gender,
      height: data.height.toString(),
      weight: data.weight.toString(),
      fitnessGoal: data.fitnessGoal,
      fitnessLevel: data.fitnessLevel,
      workoutLocation: data.workoutLocation,
      dietaryPreferences: data.dietaryPreferences,
      stressLevel: data.stressLevel[0].toString(),
      ...(data.medicalIssues && { medicalIssues: data.medicalIssues }),
    })
    
    router.push(`/plan?${params.toString()}`)
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
              <CardContent className="p-4">
                <span className="font-semibold">{toastMessage}</span>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto space-y-6"
      >
        {/* Photo-Based Body Analysis Section */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
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
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                Photo-Based Body Analysis
              </CardTitle>
              <CardDescription>
                Upload a photo to automatically analyze your body metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10 space-y-4">
              <div className="flex flex-col md:flex-row items-center gap-4">
                {/* File Upload */}
                <div className="flex-1 w-full relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-muted/30"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, WEBP up to 10MB
                    </span>
                  </label>
                  {/* Privacy Tooltip */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6"
                          onClick={(e) => e.preventDefault()}
                        >
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">
                          We never store your photos. Everything runs securely through API.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Image Preview */}
                {imagePreview && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-primary/30 shadow-lg"
                  >
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                )}
              </div>

              {/* Analyze Button */}
              <Button
                onClick={handleAnalyze}
                disabled={!selectedImage || analyzing}
                className="w-full"
                size="lg"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing body…
                  </>
                ) : (
                  <>
                    <Camera className="mr-2 h-4 w-4" />
                    Analyze My Body (AI)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Skeleton Loader While Analyzing */}
        <AnimatePresence>
          {analyzing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="relative overflow-hidden bg-background/80 backdrop-blur-xl border-primary/20">
                {/* Pulsing neon border */}
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 0 10px rgba(34, 197, 94, 0.3)",
                      "0 0 30px rgba(34, 197, 94, 0.6)",
                      "0 0 10px rgba(34, 197, 94, 0.3)",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -inset-0.5 bg-gradient-to-r from-green-500 via-emerald-500 to-green-500 opacity-50 blur-sm"
                />
                <CardHeader className="relative z-10">
                  <CardTitle className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    AI Body Analysis Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        animate={{
                          opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                        className="h-24 rounded-lg bg-gradient-to-br from-muted/50 via-muted/30 to-muted/50 backdrop-blur-sm border border-primary/20"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Form Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl font-bold">
              Welcome to AI Fitness Coach
            </CardTitle>
            <CardDescription>
              Tell us about yourself to get a personalized fitness plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Age and Gender */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 25"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Height and Weight */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Height (cm)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 175"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight (kg)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 70"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Fitness Goal */}
                <FormField
                  control={form.control}
                  name="fitnessGoal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fitness Goal</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your fitness goal" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="lose-weight">Lose Weight</SelectItem>
                          <SelectItem value="build-muscle">Build Muscle</SelectItem>
                          <SelectItem value="improve-endurance">
                            Improve Endurance
                          </SelectItem>
                          <SelectItem value="maintain-fitness">
                            Maintain Fitness
                          </SelectItem>
                          <SelectItem value="general-health">
                            General Health
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Fitness Level */}
                <FormField
                  control={form.control}
                  name="fitnessLevel"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Fitness Level</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="beginner" id="beginner" />
                            <label
                              htmlFor="beginner"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Beginner
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value="intermediate"
                              id="intermediate"
                            />
                            <label
                              htmlFor="intermediate"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Intermediate
                            </label>
        </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="advanced" id="advanced" />
                            <label
                              htmlFor="advanced"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Advanced
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="expert" id="expert" />
                            <label
                              htmlFor="expert"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Expert
                            </label>
        </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Workout Location */}
                <FormField
                  control={form.control}
                  name="workoutLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Workout Location</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select workout location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="home">Home</SelectItem>
                          <SelectItem value="gym">Gym</SelectItem>
                          <SelectItem value="outdoor">Outdoor</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Dietary Preferences */}
                <FormField
                  control={form.control}
                  name="dietaryPreferences"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dietary Preferences</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., Vegetarian, Vegan, No dairy, Gluten-free, etc."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Please describe your dietary preferences or restrictions
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Medical Issues (Optional) */}
                <FormField
                  control={form.control}
                  name="medicalIssues"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medical Issues (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any medical conditions, injuries, or health concerns we should know about"
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        This information helps us create a safe workout plan for you
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Stress Level */}
                <FormField
                  control={form.control}
                  name="stressLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Stress Level: {field.value[0]}/10
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          value={field.value}
                          onValueChange={field.onChange}
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>
                        Rate your current stress level from 1 (very low) to 10 (very
                        high)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button type="submit" className="w-full" size="lg">
                    Generate My Fitness Plan
                  </Button>
                </motion.div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* AI Body Analysis Insights Card */}
        <AnimatePresence>
          {analysisResults && !analyzing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
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
                <CardHeader className="relative z-10">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="h-5 w-5 text-primary" />
                      AI Body Analysis Insights
                    </CardTitle>
                    {/* Powered by AI Vision Badge */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-green-500/50 bg-green-500/10 backdrop-blur-sm"
                    >
                      <motion.div
                        animate={{
                          boxShadow: [
                            "0 0 8px rgba(34, 197, 94, 0.4)",
                            "0 0 16px rgba(34, 197, 94, 0.6)",
                            "0 0 8px rgba(34, 197, 94, 0.4)",
                          ],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute -inset-0.5 rounded-full bg-green-500/30 blur-sm"
                      />
                      <Sparkles className="h-3.5 w-3.5 text-green-400 relative z-10" />
                      <span className="text-xs font-semibold text-green-400 relative z-10">
                        Powered by AI Vision
                      </span>
                    </motion.div>
                  </div>
                  <CardDescription>
                    Insights from your body photo analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative z-10 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Estimated Body Fat */}
                    {analysisResults.bodyFat && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1, type: "spring" }}
                        className="p-4 rounded-lg border bg-card"
                      >
                        <p className="text-sm text-muted-foreground mb-1">
                          Estimated Body Fat
                        </p>
                        <p className="text-2xl font-bold text-primary">
                          {analysisResults.bodyFat}
                        </p>
                      </motion.div>
                    )}

                    {/* Predicted Fitness Level */}
                    {analysisResults.fitnessLevel && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="p-4 rounded-lg border bg-card"
                      >
                        <p className="text-sm text-muted-foreground mb-1">
                          Predicted Fitness Level
                        </p>
                        <p className="text-2xl font-bold text-primary capitalize">
                          {analysisResults.fitnessLevel}
                        </p>
                      </motion.div>
                    )}

                    {/* Weight Range */}
                    {analysisResults.weightRange && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, type: "spring" }}
                        className="p-4 rounded-lg border bg-card"
                      >
                        <p className="text-sm text-muted-foreground mb-1">
                          Weight Range
                        </p>
                        <p className="text-2xl font-bold text-primary">
                          {analysisResults.weightRange}
                        </p>
                      </motion.div>
                    )}

                    {/* Posture Quality */}
                    {analysisResults.posture && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, type: "spring" }}
                        className="p-4 rounded-lg border bg-card"
                      >
                        <p className="text-sm text-muted-foreground mb-1">
                          Posture Quality
                        </p>
                        <p className="text-2xl font-bold text-primary">
                          {analysisResults.posture}
                        </p>
                      </motion.div>
                    )}
                  </div>

                  {/* AI-Generated Tip */}
                  {analysisResults.tip && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="mt-4 p-4 rounded-lg border-l-4 border-primary bg-primary/5"
                    >
                      <p className="text-sm font-medium text-foreground">
                        💡 AI Tip:
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {analysisResults.tip}
                      </p>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
