/**
 * API Route: /api/describe
 * 
 * Generate exercise/meal description using Gemini
 * 
 * Request Body:
 * - name: string (exercise or meal name)
 * 
 * Environment Variables:
 * - GEMINI_API_KEY: Your Google Gemini API key
 * 
 * Returns: JSON with description field
 * {
 *   "description": "..."
 * }
 */

import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { getModelsToTry } from "../utils/get-available-models"

// Initialize Gemini client function
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured")
  }
  return new GoogleGenerativeAI(apiKey)
}

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

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      )
    }

    // Initialize Gemini client
    const genAI = getGenAI()

    const itemName = name.trim()
    
    // Detect if this is a meal/food or exercise (same logic as image API)
    const foodKeywords = [
      'burger', 'sandwich', 'salad', 'soup', 'pasta', 'rice', 'chicken', 'fish', 
      'beef', 'pork', 'vegetable', 'fruit', 'smoothie', 'shake', 'breakfast', 
      'lunch', 'dinner', 'snack', 'meal', 'food', 'dish', 'recipe', 'bean', 
      'potato', 'fries', 'bread', 'toast', 'egg', 'cheese', 'yogurt', 'oatmeal',
      'quinoa', 'avocado', 'tomato', 'lettuce', 'spinach', 'broccoli', 'carrot',
      'edamame', 'nut', 'grilled', 'baked', 'roasted', 'steamed', 'fried', 'tofu',
      'scramble', 'tempeh', 'lentil', 'chickpea', 'hummus', 'almond', 'walnut',
      'peanut', 'cashew', 'pistachio', 'seed', 'chia', 'flax'
    ]
    
    const lowerName = itemName.toLowerCase()
    const hasFoodKeyword = foodKeywords.some(keyword => lowerName.includes(keyword))
    const hasCookingMethod = /^(grilled|baked|roasted|steamed|fried|sautéed|raw|boiled|poached|braised|stir-fried|pan-seared)\s/.test(lowerName)
    const hasFoodCombination = /\s(with|and|&)\s/.test(lowerName)
    const hasFoodContainer = lowerName.includes('salad') || 
      lowerName.includes('bowl') || 
      lowerName.includes('power bowl') ||
      lowerName.includes('powerbowl') ||
      lowerName.includes('plate') || 
      lowerName.includes('wrap') || 
      lowerName.includes('sandwich') || 
      lowerName.includes('burger') || 
      lowerName.includes('soup') || 
      lowerName.includes('stew')
    
    // More lenient: if it has a food container, it's likely a meal
    const isMeal = hasFoodKeyword || hasCookingMethod || hasFoodContainer || (hasFoodCombination && hasFoodContainer)
    
    console.log(`[Describe API] Item: "${itemName}"`)
    console.log(`[Describe API] Detection: hasFoodKeyword=${hasFoodKeyword}, hasCookingMethod=${hasCookingMethod}, hasFoodContainer=${hasFoodContainer}`)
    console.log(`[Describe API] Result: isMeal=${isMeal}`)
    
    const prompt = isMeal
      ? `IMPORTANT: "${itemName}" is a FOOD/MEAL, NOT an exercise. Describe it as a nutritious meal dish. 

Include:
- What ingredients and foods it contains
- Its nutritional value (protein, carbs, fats, vitamins, minerals)
- Why it's beneficial for fitness and health goals

DO NOT describe it as a physical exercise or workout. Describe it as FOOD that you eat. Write 2 sentences.`
      : `Describe the exercise "${itemName}" in 2 sentences, focusing on proper form, technique, and fitness benefits.`

    // Get available models (will query API or use fallback list)
    const modelNames = await getModelsToTry(process.env.GEMINI_API_KEY!)
    
    // Try each model until one works
    let result
    let lastError: any = null
    
    for (const modelName of modelNames) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        result = await model.generateContent(prompt)
        break
      } catch (error: any) {
        lastError = error
        
        // For 503 (overloaded), 429 (rate limit), or 404/400 (not found), try next model
        // For other errors (401, 403, 500), don't try other models
        if (error.status === 503 || error.status === 429 || error.status === 404 || error.status === 400) {
          // Model is overloaded, rate limited, or not found, try next one
          console.log(`[Describe] Model ${modelName} failed with status ${error.status}, trying next model...`)
          continue
        }
        
        // For other errors, stop trying
        break
      }
    }
    
    // If all models failed
    if (!result) {
      if (lastError?.status === 429) {
        return NextResponse.json(
          {
            error: `Rate limit exceeded. All models are currently rate-limited. Please try again in a few minutes.`,
            details: "You've made too many requests. The free tier has rate limits. Please wait before trying again.",
            retryAfter: "2-5 minutes",
          },
          { status: 429 }
        )
      }
      if (lastError?.status === 503) {
        return NextResponse.json(
          {
            error: `All models are currently overloaded. Please try again in a few moments. Tried: ${modelNames.join(", ")}`,
          },
          { status: 503 }
        )
      }
      if (lastError?.status === 404) {
        return NextResponse.json(
          {
            error: `No available models found. Tried: ${modelNames.join(", ")}. Your API key may not have access to these models.`,
          },
          { status: 404 }
        )
      }
      return NextResponse.json(
        {
          error: lastError?.message || "Unknown error occurred",
        },
        { status: 500 }
      )
    }
    
    const response = await result.response
    const description = response.text().trim()

    return NextResponse.json({
      description: description,
    })
  } catch (error: any) {
    console.error("Error generating description:", error)

    // Handle API key errors
    if (error.message?.includes("API key") || error.status === 401) {
      return NextResponse.json(
        {
          error: "Authentication failed: Invalid API key",
          details: "Please check your GEMINI_API_KEY environment variable",
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
        error: "Failed to generate description",
        details: error.message || "Unknown error occurred",
      },
      { status: 500 }
    )
  }
}

