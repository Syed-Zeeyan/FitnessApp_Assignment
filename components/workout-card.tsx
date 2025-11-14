"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ImageIcon, AlertCircle } from "lucide-react"
import { useExerciseImage } from "@/hooks/useExerciseImage"
import { ImageModal } from "./image-modal"
import type { Exercise } from "@/types/fitness"

interface WorkoutCardProps {
  exercise: Exercise
  index?: number
}

export function WorkoutCard({ exercise, index = 0 }: WorkoutCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [imageLoadError, setImageLoadError] = useState(false)
  const { url, loading, error, fetchImage, isVisible, setRef, loadFromCache } = useExerciseImage()

  // Load from cache immediately on mount
  useEffect(() => {
    loadFromCache(exercise.name)
  }, [exercise.name, loadFromCache])

  // Lazy load image when card becomes visible (if not already loaded from cache)
  useEffect(() => {
    if (isVisible && !url && !loading && !error && !imageLoadError) {
      fetchImage(exercise.name)
    }
  }, [isVisible, url, loading, error, imageLoadError, exercise.name, fetchImage])

  // Reset image load error when exercise name changes
  useEffect(() => {
    setImageLoadError(false)
  }, [exercise.name])

  const handleThumbnailClick = () => {
    setIsModalOpen(true)
    // If image hasn't loaded yet, trigger fetch
    if (!url && !loading) {
      fetchImage(exercise.name)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  return (
    <>
      <motion.div
        ref={(node) => setRef(node as HTMLElement | null)}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.1 }}
        className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Link
              href={`/exercise/${exercise.name.toLowerCase().replace(/\s+/g, "-")}`}
              className="hover:text-primary transition-colors"
            >
              <h4 className="font-semibold mb-1 hover:underline">
                {exercise.name}
              </h4>
            </Link>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>{exercise.sets} sets</span>
              <span>{exercise.reps} reps</span>
              <span>Rest: {exercise.rest}</span>
            </div>
          </div>

          {/* Thumbnail Preview */}
          <div className="flex-shrink-0">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative w-[120px] h-[80px] rounded-lg overflow-hidden cursor-pointer group"
              onClick={handleThumbnailClick}
            >
              {loading ? (
                // Shimmer skeleton
                <div className="absolute inset-0 bg-gradient-to-br from-muted/50 via-muted/30 to-muted/50 backdrop-blur-sm">
                  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground animate-pulse" />
                  </div>
                </div>
              ) : error ? (
                // Error fallback with neon icon
                <div className="absolute inset-0 bg-muted/50 backdrop-blur-sm flex flex-col items-center justify-center p-2 border-2 border-destructive/30 rounded-lg">
                  <motion.div
                    animate={{
                      boxShadow: [
                        "0 0 10px rgba(239, 68, 68, 0.5)",
                        "0 0 20px rgba(239, 68, 68, 0.8)",
                        "0 0 10px rgba(239, 68, 68, 0.5)",
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="rounded-full p-2"
                  >
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  </motion.div>
                  <p className="text-[10px] text-destructive/80 text-center mt-1 leading-tight">
                    Image not available.
                    <br />
                    Try again.
                  </p>
                </div>
              ) : url && !imageLoadError ? (
                // Thumbnail with neon glow
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="relative w-full h-full"
                >
                  {/* Neon border glow */}
                  <motion.div
                    animate={{
                      boxShadow: [
                        "0 0 10px rgba(59, 130, 246, 0.5)",
                        "0 0 20px rgba(59, 130, 246, 0.8)",
                        "0 0 10px rgba(59, 130, 246, 0.5)",
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-primary via-purple-500 to-primary opacity-75 blur-sm group-hover:opacity-100 transition-opacity"
                  />
                  <img
                    src={url}
                    alt={exercise.name}
                    className="relative z-10 w-full h-full object-cover rounded-lg"
                    onError={(e) => {
                      console.error("Failed to load thumbnail:", url)
                      setImageLoadError(true)
                      // Clear the bad URL from cache
                      if (typeof window !== "undefined") {
                        localStorage.removeItem(`exercise_image_${exercise.name}`)
                      }
                    }}
                    onLoad={() => {
                      setImageLoadError(false)
                    }}
                  />
                </motion.div>
              ) : (
                // Placeholder
                <div className="absolute inset-0 bg-muted/30 backdrop-blur-sm flex items-center justify-center border border-border/50 rounded-lg">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </motion.div>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/exercise/${exercise.name.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <Button variant="ghost" size="sm">
                View
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      <ImageModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        exerciseName={exercise.name}
        imageUrl={url}
        loading={loading}
        error={error}
        onRetry={() => fetchImage(exercise.name)}
      />
    </>
  )
}
