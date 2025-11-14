/**
 * API Route: /api/image
 * 
 * Image Generation API using Gemini (free) or OpenAI DALL-E
 * 
 * Request Body:
 * - name: string (workout exercise or meal name)
 * 
 * Environment Variables:
 * - GEMINI_API_KEY: Your Google Gemini API key (primary, free)
 * - OPENAI_API_KEY: Your OpenAI API key (fallback, optional)
 * 
 * Returns: JSON with url field
 * {
 *   "url": "https://..."
 * }
 */

import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import OpenAI from "openai"

// Initialize Gemini client
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null

// Initialize OpenAI client (fallback)
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name } = body

    // Validate input
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required and must be a non-empty string" },
        { status: 400 }
      )
    }

    const itemName = name.trim()
    
    // Detect if this is a meal/food or exercise
    // Common food-related keywords (expanded list)
    const foodKeywords = [
      // Meals and dishes
      'burger', 'sandwich', 'salad', 'soup', 'pasta', 'rice', 'chicken', 'fish', 
      'beef', 'pork', 'lamb', 'turkey', 'seafood', 'steak', 'roast',
      // Meal times
      'breakfast', 'lunch', 'dinner', 'snack', 'meal', 'food', 'dish', 'recipe',
      // Vegetables
      'vegetable', 'veggie', 'bean', 'edamame', 'potato', 'fries', 'sweet potato',
      'broccoli', 'carrot', 'spinach', 'lettuce', 'kale', 'cabbage', 'pepper',
      'onion', 'garlic', 'mushroom', 'zucchini', 'cucumber', 'tomato', 'corn',
      // Fruits
      'fruit', 'apple', 'banana', 'orange', 'berry', 'strawberry', 'blueberry',
      'grape', 'mango', 'pineapple', 'watermelon', 'avocado',
      // Grains and carbs
      'bread', 'toast', 'bagel', 'quinoa', 'oatmeal', 'oats', 'cereal', 'granola',
      'pasta', 'noodle', 'wheat', 'barley', 'buckwheat',
      // Proteins
      'egg', 'cheese', 'yogurt', 'milk', 'protein', 'tofu', 'tempeh', 'lentil',
      'chickpea', 'hummus', 'nut', 'almond', 'walnut', 'peanut', 'cashew',
      'pistachio', 'seed', 'chia', 'flax', 'sunflower seed', 'scramble',
      // Beverages
      'smoothie', 'shake', 'juice', 'tea', 'coffee', 'water',
      // Other food items
      'sauce', 'dressing', 'mayo', 'butter', 'oil', 'honey', 'maple syrup',
      'chocolate', 'cookie', 'cake', 'pie', 'dessert', 'ice cream'
    ]
    
    // Check if name contains food keywords
    const lowerName = itemName.toLowerCase()
    
    // Check for food keywords
    const hasFoodKeyword = foodKeywords.some(keyword => 
      lowerName.includes(keyword.toLowerCase())
    )
    
    // Check for common food patterns (cooking methods + food items)
    const hasCookingMethod = /^(grilled|baked|roasted|steamed|fried|sautéed|sautéed|raw|boiled|poached|braised|stir-fried|pan-seared)\s/.test(lowerName)
    
    // Check for food combinations (X & Y or X with Y)
    const hasFoodCombination = /\s(with|and|&)\s/.test(lowerName)
    
    // Check for food containers/dishes
    const hasFoodContainer = lowerName.includes('salad') || 
      lowerName.includes('bowl') ||
      lowerName.includes('plate') ||
      lowerName.includes('wrap') ||
      lowerName.includes('sandwich') ||
      lowerName.includes('burger') ||
      lowerName.includes('soup') ||
      lowerName.includes('stew') ||
      lowerName.includes('power bowl') ||
      lowerName.includes('powerbowl')
    
    // It's a meal if it has food keywords OR cooking method OR food combination OR container
    // More lenient: if it has a food container, it's likely a meal
    const isMeal = hasFoodKeyword || hasCookingMethod || hasFoodContainer || (hasFoodCombination && hasFoodContainer)
    
    // Log for debugging
    console.log(`[Image API] Item: "${itemName}"`)
    console.log(`[Image API] Detection: hasFoodKeyword=${hasFoodKeyword}, hasCookingMethod=${hasCookingMethod}, hasFoodContainer=${hasFoodContainer}, hasFoodCombination=${hasFoodCombination}`)
    console.log(`[Image API] Result: isMeal=${isMeal}`)

    // Generate appropriate prompt based on type
    const prompt = isMeal
      ? `Generate a realistic, high-quality food photography image of: ${itemName}. Show the meal beautifully plated, with good lighting, appetizing presentation, and professional food styling.`
      : `Generate a realistic, high-quality image of the exercise: ${itemName}. Show proper form, lighting, and clarity.`

    let imageUrl: string | null = null
    let provider: string = "unknown"
    let errorDetails: string | null = null

    // Option 1: Try OpenAI DALL-E (primary image generator)
    // Note: Gemini doesn't have direct image generation API yet
    // When Gemini Image API becomes available, it will be added here as the primary option
    if (openai) {
      try {
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: prompt,
          n: 1,
          size: "1024x1024",
          quality: "standard",
        })

        if (response.data && response.data[0]?.url) {
          imageUrl = response.data[0].url
          provider = "openai"
        } else {
          throw new Error("No image URL returned from OpenAI")
        }
      } catch (error: any) {
        console.error("OpenAI error:", error.message)
        errorDetails = `OpenAI: ${error.message}`
        // Continue to fallback
      }
    }

    // Option 2: Use Unsplash Search API to find food-specific images dynamically
    // This searches for actual images based on the food/exercise name
    if (!imageUrl) {
      try {
        // Extract main keywords from complex names for better search results
        let searchQuery: string
        
        if (isMeal) {
          // For meals, extract main food items and remove cooking methods/prepositions
          // Example: "Baked Fish With Roasted Sweet Potato & Broccoli" -> "fish sweet potato broccoli"
          // Example: "Vegan Protein Shake" -> "vegan protein shake"
          // Example: "Grilled Chicken Salad" -> "chicken salad"
          
          // Remove common cooking methods and prepositions
          const cleaned = lowerName
            .replace(/\b(baked|grilled|roasted|steamed|fried|sautéed|raw|boiled|poached|braised|stir-fried|pan-seared|with|and|&)\b/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
          
          // If cleaned name is too short or empty, use original
          searchQuery = cleaned.length > 3 ? cleaned : lowerName
        } else {
          // For exercises, extract main exercise type
          // Example: "Brisk Walk Or Light Jog" -> "walking jogging"
          // Example: "Push-ups" -> "push ups"
          // Example: "Squats" -> "squats"
          
          const exerciseCleaned = lowerName
            .replace(/\b(brisk|light|heavy|deep|wide|narrow|or|and|&)\b/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
          
          // Add exercise context
          searchQuery = `${exerciseCleaned} exercise`
        }
        
        console.log(`[Image API] Searching Unsplash for: "${searchQuery}" (original: "${itemName}")`)
        
        // Use Unsplash API search
        // Note: Unsplash requires an API key for production use (free at https://unsplash.com/developers)
        const unsplashApiKey = process.env.UNSPLASH_ACCESS_KEY
        
        if (unsplashApiKey) {
          // Use Unsplash API for proper search
          const unsplashSearchUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=10&orientation=landscape&client_id=${unsplashApiKey}`
          
          const unsplashResponse = await fetch(unsplashSearchUrl)
          if (unsplashResponse.ok) {
            const unsplashData = await unsplashResponse.json()
            if (unsplashData.results && unsplashData.results.length > 0) {
              // Use consistent selection based on item name hash
              const itemHash = itemName.split('').reduce((acc, char) => {
                return ((acc << 5) - acc) + char.charCodeAt(0) | 0
              }, 0)
              const imageIndex = Math.abs(itemHash) % unsplashData.results.length
              const selectedImage = unsplashData.results[imageIndex]
              imageUrl = selectedImage.urls?.regular || selectedImage.urls?.small || selectedImage.urls?.thumb
              provider = "unsplash"
              console.log(`[Image API] Found ${unsplashData.results.length} Unsplash results for "${searchQuery}", using index ${imageIndex}`)
            } else {
              console.log(`[Image API] No Unsplash results found for "${searchQuery}"`)
            }
          } else {
            console.log(`[Image API] Unsplash API returned ${unsplashResponse.status}`)
          }
        } else {
          // No API key - use expanded curated mapping for common foods/exercises
          const foodImageMap: Record<string, string> = {
            'burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=600&fit=crop&q=80',
            'shake': 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&h=600&fit=crop&q=80',
            'smoothie': 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=800&h=600&fit=crop&q=80',
            'salad': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop&q=80',
            'chicken': 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800&h=600&fit=crop&q=80',
            'fish': 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&h=600&fit=crop&q=80',
            'pasta': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&h=600&fit=crop&q=80',
            'pizza': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop&q=80',
            'soup': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&h=600&fit=crop&q=80',
            'sandwich': 'https://images.unsplash.com/photo-1539252554453-80ab65ce3586?w=800&h=600&fit=crop&q=80',
            'vegan': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop&q=80',
            'protein': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop&q=80',
            'grilled': 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800&h=600&fit=crop&q=80',
            'baked': 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&h=600&fit=crop&q=80',
            'potato': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop&q=80',
            'broccoli': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop&q=80',
          }
          
          const exerciseImageMap: Record<string, string> = {
            'walk': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop&q=80',
            'jog': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop&q=80',
            'run': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop&q=80',
            'push': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=600&fit=crop&q=80',
            'squat': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=600&fit=crop&q=80',
            'deadlift': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=600&fit=crop&q=80',
            'bench': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=600&fit=crop&q=80',
            'curl': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=600&fit=crop&q=80',
            'press': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=600&fit=crop&q=80',
          }
          
          // Check if we have a direct mapping (check for keywords in the name)
          const mapToCheck = isMeal ? foodImageMap : exerciseImageMap
          const directMatch = Object.keys(mapToCheck).find(key => 
            lowerName.includes(key)
          )
          
          if (directMatch) {
            imageUrl = mapToCheck[directMatch]
            provider = "unsplash-curated"
            console.log(`[Image API] Using curated image for keyword: ${directMatch}`)
          } else {
            console.log(`[Image API] No Unsplash API key and no curated match for "${itemName}"`)
            console.log(`[Image API] Tip: Add UNSPLASH_ACCESS_KEY to .env.local for dynamic image search`)
            // Will fall through to generic placeholder
          }
        }
      } catch (error: any) {
        console.error("Unsplash search error:", error.message)
        errorDetails = errorDetails ? `${errorDetails}; Unsplash: ${error.message}` : `Unsplash: ${error.message}`
        // Continue to final fallback
      }
    }

    // Option 3: Final fallback to generic themed images
    if (!imageUrl) {
      // Use a consistent placeholder based on item name
      // This ensures the same item always gets the same placeholder
      const itemHash = itemName.split('').reduce((acc, char) => {
        return ((acc << 5) - acc) + char.charCodeAt(0) | 0
      }, 0)
      
      if (isMeal) {
        // Generic healthy food images as last resort
        const foodImages = [
          "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop&q=80", // Healthy food
          "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=300&fit=crop&q=80", // Meal prep
          "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop&q=80", // Food platter
          "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop&q=80", // Healthy meal
        ]
        const imageIndex = Math.abs(itemHash) % foodImages.length
        imageUrl = foodImages[imageIndex]
      } else {
        // Fitness-themed images for exercises
        const fitnessImages = [
          "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&q=80", // Gym
          "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=300&fit=crop&q=80", // Workout
          "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop&q=80", // Exercise
          "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop&q=80", // Fitness
        ]
        const imageIndex = Math.abs(itemHash) % fitnessImages.length
        imageUrl = fitnessImages[imageIndex]
      }
      
      provider = "placeholder"
      console.log(`[Image API] Using fallback placeholder image`)
    }

    // Return success response with url field
    return NextResponse.json({
      url: imageUrl,
      provider: provider,
      ...(provider === "unsplash" && {
        note: "Using fallback image service. Configure GEMINI_API_KEY or OPENAI_API_KEY for AI-generated images.",
      }),
    })
  } catch (error: any) {
    // Strong error handling
    console.error("Error in /api/image:", error)

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: "Invalid JSON in request body",
          details: error.message,
        },
        { status: 400 }
      )
    }

    // Handle network errors
    if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      return NextResponse.json(
        {
          error: "Network error: Unable to connect to image generation service",
          details: error.message,
        },
        { status: 503 }
      )
    }

    // Handle API key errors
    if (error.status === 401 || error.message?.includes("API key")) {
      return NextResponse.json(
        {
          error: "Authentication failed: Invalid API key",
          details: "Please check your GEMINI_API_KEY or OPENAI_API_KEY environment variable",
        },
        { status: 401 }
      )
    }

    // Handle rate limiting
    if (error.status === 429) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded: Too many requests",
          details: "Please try again later",
        },
        { status: 429 }
      )
    }

    // Generic error response
    return NextResponse.json(
      {
        error: "Failed to generate image",
        details: error.message || "Unknown error occurred",
      },
      { status: 500 }
    )
  }
}
