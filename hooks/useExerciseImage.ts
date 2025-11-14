import { useState, useCallback, useEffect, useRef } from "react"

interface CachedImage {
  url: string
  timestamp: number
  version?: string
}

interface UseExerciseImageReturn {
  url: string | null
  loading: boolean
  error: string | null
  fetchImage: (name: string) => Promise<void>
  reset: () => void
  isVisible: boolean
  setRef: (node: HTMLElement | null) => void
  loadFromCache: (name: string) => void
}

const CACHE_PREFIX = "exercise_image_"
const CACHE_VERSION = "v2" // Increment when detection logic changes
const CACHE_EXPIRY_DAYS = 7
const CACHE_EXPIRY_MS = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000

/**
 * Clear cache for a specific item (useful when detection changes)
 */
export function clearCachedImage(name: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(`${CACHE_PREFIX}${name}`)
  } catch (error) {
    console.error("Failed to clear cached image:", error)
  }
}

/**
 * Get cached image URL if valid
 */
function getCachedImage(name: string): string | null {
  if (typeof window === "undefined") return null

  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${name}`)
    if (!cached) return null

    const data: CachedImage = JSON.parse(cached)
    const now = Date.now()

    // Check cache version - invalidate if version mismatch
    if (data.version !== CACHE_VERSION) {
      localStorage.removeItem(`${CACHE_PREFIX}${name}`)
      return null
    }

    // Check if cache is expired
    if (now - data.timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(`${CACHE_PREFIX}${name}`)
      return null
    }

    return data.url
  } catch {
    return null
  }
}

/**
 * Cache image URL with timestamp
 */
function setCachedImage(name: string, url: string): void {
  if (typeof window === "undefined") return

  try {
    const data: CachedImage = {
      url,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    }
    localStorage.setItem(`${CACHE_PREFIX}${name}`, JSON.stringify(data))
  } catch (error) {
    console.error("Failed to cache image:", error)
  }
}

/**
 * Custom hook for fetching exercise images from /api/image
 * Supports lazy loading with IntersectionObserver and localStorage caching
 * 
 * @returns {UseExerciseImageReturn} Object containing url, loading, error, fetchImage function, reset function, and visibility ref
 */
export function useExerciseImage(): UseExerciseImageReturn {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [currentName, setCurrentName] = useState<string | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const elementRef = useRef<HTMLElement | null>(null)

  // Set up IntersectionObserver for lazy loading
  const setRef = useCallback((node: HTMLElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    elementRef.current = node

    if (node) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible(true)
              if (observerRef.current) {
                observerRef.current.disconnect()
              }
            }
          })
        },
        {
          rootMargin: "50px", // Start loading 50px before entering viewport
          threshold: 0.1,
        }
      )
      observerRef.current.observe(node)
    }
  }, [])

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  const fetchImage = useCallback(async (name: string) => {
    if (!name || name.trim().length === 0) {
      setError("Exercise name is required")
      return
    }

    const exerciseName = name.trim()
    setCurrentName(exerciseName)

    // Check cache first (now with versioning to handle detection changes)
    const cachedUrl = getCachedImage(exerciseName)
    if (cachedUrl) {
      setUrl(cachedUrl)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    setUrl(null)

    try {
      const response = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: exerciseName }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to generate image")
      }

      const data = await response.json()
      const imageUrl = data.url || data.imageUrl

      if (imageUrl) {
        setUrl(imageUrl)
        // Cache the image URL
        setCachedImage(exerciseName, imageUrl)
      } else {
        throw new Error("No image URL returned")
      }
    } catch (err: any) {
      console.error("Error fetching exercise image:", err)
      setError(err.message || "Failed to generate image")
      setUrl(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setUrl(null)
    setError(null)
    setLoading(false)
  }, [])

  // Load from cache immediately (synchronous)
  const loadFromCache = useCallback((name: string) => {
    if (!name || name.trim().length === 0) return

    const exerciseName = name.trim()
    const cachedUrl = getCachedImage(exerciseName)
    if (cachedUrl) {
      setUrl(cachedUrl)
      setError(null)
    }
  }, [])

  return {
    url,
    loading,
    error,
    fetchImage,
    reset,
    isVisible,
    setRef,
    loadFromCache,
  }
}
