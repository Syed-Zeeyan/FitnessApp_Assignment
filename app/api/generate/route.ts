/**
 * API Route: /api/generate
 * 
 * Generates a personalized fitness plan using Google Gemini AI
 * 
 * Request Body (UserData):
 * - name: string
 * - age: number
 * - gender: string
 * - height: number (cm)
 * - weight: number (kg)
 * - fitnessGoal: string
 * - fitnessLevel: string
 * - workoutLocation: string
 * - dietaryPreferences: string
 * - medicalIssues?: string (optional)
 * - stressLevel: number (1-10)
 * 
 * Response (GenerateResponse):
 * - workoutPlan: WorkoutDay[] (7-day plan)
 * - dietPlan: DietPlan (breakfast, lunch, dinner, snacks)
 * - aiTips: string[] (5 tips)
 * - motivationQuote: string
 * 
 * Environment Variable Required:
 * - GEMINI_API_KEY: Your Google Gemini API key
 */

import { GoogleGenerativeAI } from "@google/generative-ai"
import { NextRequest, NextResponse } from "next/server"
import type {
  UserData,
  GenerateResponse,
} from "@/types/fitness"
import { getModelsToTry } from "../utils/get-available-models"

// Initialize Gemini client - will be created per request to ensure fresh API key
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured")
  }
  return new GoogleGenerativeAI(apiKey)
}

export async function POST(request: NextRequest) {
  try {
    const userData: UserData = await request.json()

    // Validate required fields
    if (
      !userData.name ||
      !userData.age ||
      !userData.gender ||
      !userData.height ||
      !userData.weight ||
      !userData.fitnessGoal ||
      !userData.fitnessLevel ||
      !userData.workoutLocation ||
      !userData.dietaryPreferences
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Verify API key exists
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      )
    }

    // Initialize Gemini client
    const genAI = getGenAI()

    // Create structured prompt
    const prompt = createStructuredPrompt(userData)

    // Get available models (will query API or use fallback list)
    const modelNames = await getModelsToTry(process.env.GEMINI_API_KEY!)
    
    let result
    let lastError: any = null
    let successfulModel = ""
    
    // Try each model until one works
    for (const modelName of modelNames) {
      try {
        console.log(`[Generate] Trying model: ${modelName}`)
        const model = genAI.getGenerativeModel({ model: modelName })
        result = await model.generateContent(prompt)
        successfulModel = modelName
        console.log(`[Generate] Successfully used model: ${modelName}`)
        break
      } catch (error: any) {
        console.error(`[Generate] Model ${modelName} failed:`, {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
        })
        lastError = error
        
        // For 503 (overloaded) or 404/400 (not found), try next model
        // For other errors (401, 403, 500), don't try other models
        if (error.status === 503 || error.status === 404 || error.status === 400) {
          // Model is overloaded or not found, try next one
          continue
        }
        
        // For other errors, stop trying
        throw error
      }
    }
    
    // If all models failed
    if (!result) {
      if (lastError?.status === 503) {
        throw new Error(`All models are currently overloaded. Please try again in a few moments. Tried: ${modelNames.join(", ")}`)
      }
      if (lastError?.status === 404) {
        const errorMsg = `No available models found. Tried: ${modelNames.join(", ")}.\n\n` +
          `This usually means the Generative AI API is not enabled in your Google Cloud project.\n\n` +
          `To fix:\n` +
          `1. Go to: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com\n` +
          `2. Select your project (projects/599646167290)\n` +
          `3. Click "Enable" to enable the Generative AI API\n` +
          `4. Wait a few minutes and try again\n\n` +
          `Or check available models at: http://localhost:3000/api/list-models`
        throw new Error(errorMsg)
      }
      if (lastError?.status === 401) {
        throw new Error("Invalid API key. Please check your GEMINI_API_KEY.")
      }
      if (lastError?.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.")
      }
      throw new Error(`API Error: ${lastError?.message || "Unknown error"}`)
    }
    
    const response = await result.response
    const text = response.text()

    // Helper function to clean and fix common JSON issues
    function cleanJSON(jsonString: string): string {
      let cleaned = jsonString.trim()
      
      // Remove markdown code blocks if present
      cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*/g, '')
      
      // Remove leading/trailing whitespace and newlines
      cleaned = cleaned.trim()
      
      // Find the JSON object boundaries
      const jsonStart = cleaned.indexOf('{')
      const jsonEnd = cleaned.lastIndexOf('}') + 1
      
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        cleaned = cleaned.substring(jsonStart, jsonEnd)
      }
      
      // Fix common JSON issues:
      // 1. Remove trailing commas before } or ]
      cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1')
      
      // 2. Remove comments (JSON doesn't support comments)
      cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
      cleaned = cleaned.replace(/\/\/.*$/gm, '') // Remove // comments
      
      // 3. Fix unquoted identifiers (like Max, Min, etc.) - convert to strings or numbers
      // Match patterns like: "key": Identifier, or "key": Identifier}
      // For "reps", "sets", "calories" etc., convert Max/Min to reasonable numbers
      cleaned = cleaned.replace(/("(?:reps|sets|calories|protein|carbs|fats)"\s*:\s*)(Max|Min|MAX|MIN)(\s*[,}])/gi, (match, key, value, ending) => {
        // Convert Max to a reasonable number based on the field
        if (key.includes('reps') || key.includes('sets')) {
          return `${key}12${ending}` // Default to 12 reps/sets
        } else if (key.includes('calories')) {
          return `${key}500${ending}` // Default calories
        } else {
          return `${key}"${value}"${ending}` // Quote other cases
        }
      })
      
      // 4. Fix other unquoted identifiers - convert to strings
      cleaned = cleaned.replace(/("[\w]+"\s*:\s*)([A-Z][a-zA-Z]+)(\s*[,}\n])/g, (match, key, identifier, ending) => {
        // Skip if it's already a number, boolean, null, array, or object
        if (/^(true|false|null|\d+|\[|\{)/.test(identifier.trim())) {
          return match
        }
        // Quote the identifier
        return `${key}"${identifier}"${ending}`
      })
      
      // 5. Fix unquoted string values that should be quoted
      cleaned = cleaned.replace(/("[\w]+"\s*:\s*)([A-Z][a-zA-Z\s]+)(\s*[,}\n])/g, (match, key, value, ending) => {
        // Skip if it's a number, boolean, null, or already quoted
        if (/^(true|false|null|\d+|\[|\{)/.test(value.trim())) {
          return match
        }
        // Quote the value if it looks like a string
        return `${key}"${value.trim()}"${ending}`
      })
      
      return cleaned
    }

    // Parse JSON from response with robust error handling
    let parsedResponse: GenerateResponse
    let rawText = text
    let jsonString = ""
    
    try {
      // First, try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/)
      jsonString = jsonMatch ? jsonMatch[1] : text
      
      // Clean the JSON
      jsonString = cleanJSON(jsonString)
      
      // Try parsing
      parsedResponse = JSON.parse(jsonString)
    } catch (parseError: any) {
      console.log("[Generate] First parse attempt failed, trying alternative extraction...")
      
      try {
        // Try extracting JSON object boundaries
        const jsonStart = text.indexOf("{")
        const jsonEnd = text.lastIndexOf("}") + 1
        
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          jsonString = text.substring(jsonStart, jsonEnd)
          jsonString = cleanJSON(jsonString)
          parsedResponse = JSON.parse(jsonString)
        } else {
          throw new Error("No JSON object found in response")
        }
      } catch (secondError: any) {
        // Log the problematic JSON for debugging
        console.error("[Generate] JSON parsing failed. Raw text length:", text.length)
        console.error("[Generate] JSON string length:", jsonString.length)
        console.error("[Generate] Error position:", parseError.message.match(/position (\d+)/)?.[1] || "unknown")
        
        // Try to show the problematic area
        if (parseError.message.includes("position")) {
          const positionMatch = parseError.message.match(/position (\d+)/)
          if (positionMatch) {
            const position = parseInt(positionMatch[1])
            const start = Math.max(0, position - 100)
            const end = Math.min(jsonString.length, position + 100)
            console.error("[Generate] Problematic area:", jsonString.substring(start, end))
          }
        }
        
        throw new Error(
          `Failed to parse JSON from AI response. ` +
          `The AI may have generated invalid JSON. ` +
          `Error: ${parseError.message}. ` +
          `Please try again - the AI will generate a new response.`
        )
      }
    }

    // Validate response structure
    if (!parsedResponse.workoutPlan || !parsedResponse.dietPlan) {
      throw new Error("Invalid response structure from AI")
    }

    return NextResponse.json(parsedResponse)
  } catch (error: any) {
    console.error("Error generating fitness plan:", error)
    console.error("Error stack:", error.stack)
    console.error("Error details:", {
      message: error.message,
      status: error.status,
      code: error.code,
      name: error.name,
    })
    
    // Return detailed error information
    return NextResponse.json(
      {
        error: "Failed to generate fitness plan",
        details: error.message || "Unknown error occurred",
        errorType: error.name || "Error",
        ...(error.status && { statusCode: error.status }),
      },
      { status: error.status || 500 }
    )
  }
}

function createStructuredPrompt(userData: UserData): string {
  const bmi = (userData.weight / Math.pow(userData.height / 100, 2)).toFixed(1)
  
  return `You are an expert fitness coach and nutritionist. Generate a personalized fitness plan based on the following user information.

USER PROFILE:
- Name: ${userData.name}
- Age: ${userData.age} years
- Gender: ${userData.gender}
- Height: ${userData.height} cm
- Weight: ${userData.weight} kg
- BMI: ${bmi}
- Fitness Goal: ${userData.fitnessGoal}
- Fitness Level: ${userData.fitnessLevel}
- Workout Location: ${userData.workoutLocation}
- Dietary Preferences: ${userData.dietaryPreferences}
- Stress Level: ${userData.stressLevel}/10
${userData.medicalIssues ? `- Medical Issues: ${userData.medicalIssues}` : ""}

INSTRUCTIONS:
1. Create a 7-day workout plan appropriate for ${userData.fitnessLevel} level
2. Design a daily meal plan that aligns with ${userData.dietaryPreferences}
3. Provide 5 practical AI tips for achieving ${userData.fitnessGoal}
4. Generate an inspiring motivation quote

OUTPUT FORMAT (respond ONLY with valid JSON, no markdown, no explanations):

{
  "workoutPlan": [
    {
      "day": "Monday",
      "exercises": [
        {
          "name": "Exercise Name",
          "sets": 3,
          "reps": 12,
          "rest": "60 seconds"
        }
      ]
    }
  ],
  "dietPlan": {
    "breakfast": {
      "name": "Meal Name",
      "description": "Brief description",
      "calories": 350,
      "protein": "20g",
      "carbs": "45g",
      "fats": "8g"
    },
    "lunch": {
      "name": "Meal Name",
      "description": "Brief description",
      "calories": 450,
      "protein": "35g",
      "carbs": "30g",
      "fats": "15g"
    },
    "dinner": {
      "name": "Meal Name",
      "description": "Brief description",
      "calories": 500,
      "protein": "40g",
      "carbs": "25g",
      "fats": "20g"
    },
    "snacks": [
      {
        "name": "Snack Name",
        "description": "Brief description",
        "calories": 150,
        "protein": "10g",
        "carbs": "15g",
        "fats": "5g"
      }
    ]
  },
  "aiTips": [
    "Tip 1",
    "Tip 2",
    "Tip 3",
    "Tip 4",
    "Tip 5"
  ],
  "motivationQuote": "An inspiring quote here"
}

CRITICAL JSON REQUIREMENTS:
- Return ONLY valid JSON - no markdown, no explanations, no text before or after
- All strings must use double quotes (")
- Escape any quotes inside strings with backslash (\\")
- No trailing commas before } or ]
- All property names must be in double quotes
- Numbers should be numbers, not strings (except for "protein", "carbs", "fats" which are strings like "20g")
- Ensure proper JSON syntax - validate before responding

IMPORTANT:
- Ensure all exercises are appropriate for ${userData.workoutLocation} workouts
- Consider ${userData.fitnessLevel} fitness level in exercise selection
- Respect dietary preferences: ${userData.dietaryPreferences}
${userData.medicalIssues ? `- Take into account: ${userData.medicalIssues}` : ""}
- Make the plan realistic and achievable
- Return ONLY valid JSON that can be parsed with JSON.parse()`
}

