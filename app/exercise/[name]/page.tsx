"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, RefreshCw, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useExerciseImage } from "@/hooks/useExerciseImage"

export default function ExercisePage() {
  const params = useParams()
  const exerciseName = params.name as string
  const [descriptionLoading, setDescriptionLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [description, setDescription] = useState<string | null>(null)
  const [descriptionError, setDescriptionError] = useState<string | null>(null)

  const formattedName = exerciseName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")

  // Use the shared hook for image fetching
  const { url: imageUrl, loading: imageLoading, error: imageError, fetchImage, reset } = useExerciseImage()

  const generateDescription = async () => {
    setDescriptionLoading(true)
    setDescriptionError(null)
    setDescription(null)

    try {
      const response = await fetch("/api/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formattedName,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.details || "Failed to generate description"
        
        // For rate limit errors, show helpful message
        if (response.status === 429) {
          setDescriptionError(
            `Rate limit exceeded. ${errorData.details || "Please try again in a few minutes."}`
          )
        } else {
          setDescriptionError(errorMessage)
        }
        
        // Always provide fallback description
        // Detect if it's a meal or exercise for appropriate fallback (same logic as API)
        const foodKeywords = ['burger', 'sandwich', 'salad', 'soup', 'pasta', 'rice', 'chicken', 'fish', 'beef', 'pork', 'vegetable', 'fruit', 'smoothie', 'shake', 'breakfast', 'lunch', 'dinner', 'snack', 'meal', 'food', 'dish', 'recipe', 'bean', 'potato', 'fries', 'bread', 'toast', 'egg', 'cheese', 'yogurt', 'oatmeal', 'quinoa', 'avocado', 'tomato', 'lettuce', 'spinach', 'broccoli', 'carrot', 'edamame', 'nut', 'grilled', 'baked', 'roasted', 'steamed', 'fried', 'tofu', 'scramble', 'tempeh', 'lentil', 'chickpea']
        const lowerName = formattedName.toLowerCase()
        const hasFoodKeyword = foodKeywords.some(keyword => lowerName.includes(keyword))
        const hasCookingMethod = /^(grilled|baked|roasted|steamed|fried|sautéed|raw)\s/.test(lowerName)
        const hasFoodContainer = lowerName.includes('salad') || lowerName.includes('bowl') || lowerName.includes('power bowl') || lowerName.includes('powerbowl') || lowerName.includes('plate') || lowerName.includes('wrap') || lowerName.includes('sandwich') || lowerName.includes('burger') || lowerName.includes('soup') || lowerName.includes('stew')
        const isMeal = hasFoodKeyword || hasCookingMethod || hasFoodContainer
        
        setDescription(
          isMeal
            ? `${formattedName} is a nutritious meal that combines quality ingredients to provide essential nutrients for your fitness goals. This dish offers a balanced mix of protein, carbohydrates, and healthy fats to support muscle recovery and overall health.`
            : `Learn how to perform ${formattedName.toLowerCase()} with proper form and technique. This exercise helps improve strength, flexibility, and overall fitness.`
        )
        return // Don't throw, just show fallback
      }

      const data = await response.json()
      setDescription(data.description)
      setDescriptionError(null) // Clear any previous errors
    } catch (err: any) {
      console.error("Error generating description:", err)
      setDescriptionError(err.message || "Failed to generate description")
      // Fallback description - detect if meal or exercise
      const foodKeywords = ['burger', 'sandwich', 'salad', 'soup', 'pasta', 'rice', 'chicken', 'fish', 'beef', 'pork', 'vegetable', 'fruit', 'smoothie', 'shake', 'breakfast', 'lunch', 'dinner', 'snack', 'meal', 'food', 'dish', 'recipe', 'bean', 'potato', 'fries', 'bread', 'toast', 'egg', 'cheese', 'yogurt', 'oatmeal', 'quinoa', 'avocado', 'tomato', 'lettuce', 'spinach', 'broccoli', 'carrot', 'edamame', 'nut', 'grilled', 'baked', 'roasted', 'steamed', 'fried', 'tofu', 'scramble', 'tempeh', 'lentil', 'chickpea']
      const lowerName = formattedName.toLowerCase()
      const hasFoodKeyword = foodKeywords.some(keyword => lowerName.includes(keyword))
      const hasCookingMethod = /^(grilled|baked|roasted|steamed|fried|sautéed|raw)\s/.test(lowerName)
      const hasFoodContainer = lowerName.includes('salad') || lowerName.includes('bowl') || lowerName.includes('power bowl') || lowerName.includes('powerbowl') || lowerName.includes('plate') || lowerName.includes('wrap') || lowerName.includes('sandwich') || lowerName.includes('burger') || lowerName.includes('soup') || lowerName.includes('stew')
      const isMeal = hasFoodKeyword || hasCookingMethod || hasFoodContainer
      
      setDescription(
        isMeal
          ? `${formattedName} is a nutritious meal that combines quality ingredients to provide essential nutrients for your fitness goals. This dish offers a balanced mix of protein, carbohydrates, and healthy fats to support muscle recovery and overall health.`
          : `Learn how to perform ${formattedName.toLowerCase()} with proper form and technique. This exercise helps improve strength, flexibility, and overall fitness.`
      )
    } finally {
      setDescriptionLoading(false)
    }
  }

  useEffect(() => {
    // Clear cache when navigating to ensure fresh detection
    if (typeof window !== "undefined") {
      // Clear old cache to force re-detection
      const cacheKey = `exercise_image_${formattedName}`
      try {
        localStorage.removeItem(cacheKey)
      } catch (e) {
        // Ignore cache clear errors
      }
    }
    
    fetchImage(formattedName)
    generateDescription()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseName])

  const handleRetry = async () => {
    setRegenerating(true)
    await Promise.all([fetchImage(formattedName), generateDescription()])
    setRegenerating(false)
  }

  return (
    <div className="relative min-h-screen">
      {/* Full-screen image with blurred background */}
      <AnimatePresence mode="wait">
        {imageLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-0"
          >
            {/* Loading skeleton */}
            <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/50 to-muted animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4">
                <Loader2 className="h-16 w-16 animate-spin mx-auto text-primary" />
                <p className="text-lg font-medium text-foreground">
                  Generating image...
                </p>
                <p className="text-sm text-muted-foreground">
                  This may take a few seconds
                </p>
              </div>
            </div>
          </motion.div>
        ) : imageError ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-0 bg-muted"
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center space-y-6 max-w-md"
              >
                <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
                <div>
                  <h2 className="text-2xl font-bold text-destructive mb-2">
                    Failed to Load Image
                  </h2>
                  <p className="text-muted-foreground">{imageError}</p>
                </div>
                <Button
                  onClick={handleRetry}
                  disabled={regenerating}
                  size="lg"
                  className="mt-4"
                >
                  {regenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Retry
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        ) : imageUrl ? (
          <motion.div
            key="image"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 z-0"
          >
            {/* Blurred background */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${imageUrl})`,
                filter: "blur(40px) brightness(0.4)",
                transform: "scale(1.1)",
              }}
            />
            {/* Main image */}
            <div className="absolute inset-0 flex items-center justify-center p-4 md:p-8">
              <motion.img
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                src={imageUrl}
                alt={formattedName}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                onError={() => {
                  reset()
                }}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Content overlay */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b"
        >
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/plan">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Plan
              </Button>
            </Link>
            <h1 className="text-xl md:text-2xl font-bold">{formattedName}</h1>
            <Button
              onClick={handleRetry}
              disabled={regenerating || imageLoading}
              variant="outline"
              size="sm"
            >
              {regenerating || imageLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </motion.div>

        {/* Spacer to push content below */}
        <div className="flex-1" />

        {/* Description section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="container mx-auto px-4 pb-8"
        >
          <div className="max-w-3xl mx-auto">
            <div className="bg-background/95 backdrop-blur-md rounded-lg border p-6 md:p-8 shadow-xl">
              {descriptionLoading ? (
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-muted rounded animate-pulse w-full" />
                  <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
                </div>
              ) : descriptionError ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    {descriptionError}
                  </p>
                </div>
              ) : description ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-base md:text-lg leading-relaxed text-foreground"
                >
                  {description}
                </motion.p>
              ) : null}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
