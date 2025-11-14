"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, RefreshCw, Loader2, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ImageModalProps {
  isOpen: boolean
  onClose: () => void
  exerciseName: string
  imageUrl: string | null
  loading: boolean
  error: string | null
  onRetry: () => void
}

export function ImageModal({
  isOpen,
  onClose,
  exerciseName,
  imageUrl,
  loading,
  error,
  onRetry,
}: ImageModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-transparent border-none">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ 
            type: "spring",
            stiffness: 300,
            damping: 30,
            duration: 0.4
          }}
          className="relative"
        >
          {/* Glassmorphism background */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-xl rounded-lg" />

          {/* Content */}
          <div className="relative z-10">
            <DialogHeader className="p-6 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl">{exerciseName}</DialogTitle>
                  <DialogDescription>AI-Generated Exercise Image</DialogDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            <div className="px-6 pb-6">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative aspect-video rounded-lg overflow-hidden"
                  >
                    {/* Glassmorphism + Shimmer Loading Skeleton */}
                    <div className="absolute inset-0 bg-gradient-to-br from-muted/50 via-muted/30 to-muted/50 backdrop-blur-sm border border-border/50 rounded-lg overflow-hidden">
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                      
                      {/* Content overlay */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                        <p className="text-sm font-medium text-foreground">
                          Generating image...
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          This may take a few seconds
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ) : error ? (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative aspect-video rounded-lg overflow-hidden bg-muted/50 backdrop-blur-sm border border-destructive/20"
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                      <motion.div
                        animate={{
                          boxShadow: [
                            "0 0 20px rgba(239, 68, 68, 0.5)",
                            "0 0 40px rgba(239, 68, 68, 0.8)",
                            "0 0 20px rgba(239, 68, 68, 0.5)",
                          ],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="rounded-full p-4 mb-4"
                      >
                        <AlertCircle className="h-12 w-12 text-destructive" />
                      </motion.div>
                      <p className="text-sm font-medium text-destructive mb-2">
                        Image not available. Try again.
                      </p>
                      <p className="text-xs text-muted-foreground text-center mb-4">
                        {error}
                      </p>
                      <Button onClick={onRetry} variant="outline" size="sm">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Retry
                      </Button>
                    </div>
                  </motion.div>
                ) : imageUrl ? (
                  <motion.div
                    key="image"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                      duration: 0.5,
                    }}
                    className="relative aspect-video rounded-lg overflow-hidden group"
                  >
                    {/* Neon glow effect */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3, duration: 0.8 }}
                      className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-500 to-primary rounded-lg blur-xl opacity-75 group-hover:opacity-100 transition-opacity"
                    />
                    
                    {/* Image container */}
                    <div className="relative z-10 w-full h-full rounded-lg overflow-hidden">
                      <motion.img
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 200,
                          damping: 25,
                          delay: 0.2,
                        }}
                        src={imageUrl}
                        alt={exerciseName}
                        className="w-full h-full object-cover"
                        onError={() => {
                          console.error("Failed to load image")
                        }}
                      />
                    </div>

                    {/* Fade-in overlay effect */}
                    <motion.div
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 0 }}
                      transition={{ duration: 0.8, delay: 0.4 }}
                      className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent pointer-events-none"
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
