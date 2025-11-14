/**
 * API Route: /api/voice-coach
 * 
 * Generates personalized motivational speech using Gemini AI
 * 
 * Request Body:
 * - name: string (user's name)
 * - goal: string (fitness goal)
 * - fitnessLevel: string (fitness level)
 * - tone: "motivational" | "calm" (speech tone)
 * 
 * Environment Variables:
 * - GEMINI_API_KEY: Your Google Gemini API key
 * 
 * Returns: JSON with speech field
 * {
 *   "speech": "your generated motivational voice script"
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
    const { name, goal, fitnessLevel, tone } = body

    // Validate input
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required and must be a non-empty string" },
        { status: 400 }
      )
    }

    if (!goal || typeof goal !== "string" || goal.trim().length === 0) {
      return NextResponse.json(
        { error: "Goal is required and must be a non-empty string" },
        { status: 400 }
      )
    }

    if (!fitnessLevel || typeof fitnessLevel !== "string" || fitnessLevel.trim().length === 0) {
      return NextResponse.json(
        { error: "Fitness level is required and must be a non-empty string" },
        { status: 400 }
      )
    }

    const validTones = ["motivational", "calm"]
    if (!tone || !validTones.includes(tone)) {
      return NextResponse.json(
        { error: `Tone must be one of: ${validTones.join(", ")}` },
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

    // Create structured prompt
    const prompt = createSpeechPrompt(name.trim(), goal.trim(), fitnessLevel.trim(), tone)

    // Get available models (will query API or use fallback list)
    const modelNames = await getModelsToTry(process.env.GEMINI_API_KEY!)
    
    // Try each model until one works
    let result
    let lastError: any = null
    
    for (const modelName of modelNames) {
      try {
        console.log(`Trying voice coach model: ${modelName}`)
        const model = genAI.getGenerativeModel({ model: modelName })
        result = await model.generateContent(prompt)
        console.log(`Successfully used voice coach model: ${modelName}`)
        break
      } catch (error: any) {
        console.log(`Voice coach model ${modelName} failed:`, error.message)
        lastError = error
        
        // For 503 (overloaded) or 404/400 (not found), try next model
        // For other errors (401, 403, 500), don't try other models
        if (error.status === 503 || error.status === 404 || error.status === 400) {
          // Model is overloaded or not found, try next one
          continue
        }
        
        // For other errors, stop trying
        break
      }
    }
    
    // If all models failed
    if (!result) {
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
            error: `No available models found. Tried: ${modelNames.join(", ")}. Your API key may not have access to these models. Please check your Google AI Studio account.`,
          },
          { status: 404 }
        )
      }
      if (lastError?.status === 401) {
        return NextResponse.json(
          {
            error: "Invalid API key. Please check your GEMINI_API_KEY.",
          },
          { status: 401 }
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
    const text = response.text()

    // Parse JSON from response
    let parsedResponse: { speech: string }
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/)
      const jsonString = jsonMatch ? jsonMatch[1] : text
      parsedResponse = JSON.parse(jsonString.trim())
    } catch (parseError) {
      // If parsing fails, try to extract JSON from the text
      const jsonStart = text.indexOf("{")
      const jsonEnd = text.lastIndexOf("}") + 1
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        const jsonString = text.substring(jsonStart, jsonEnd)
        parsedResponse = JSON.parse(jsonString)
      } else {
        // Fallback: treat entire response as speech
        parsedResponse = { speech: text.trim() }
      }
    }

    // Validate response structure
    if (!parsedResponse.speech || typeof parsedResponse.speech !== "string") {
      throw new Error("Invalid response structure from AI")
    }

    // Return pure JSON response
    return NextResponse.json({
      speech: parsedResponse.speech,
    })
  } catch (error: any) {
    console.error("Error generating voice coach speech:", error)

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

    // Handle network errors
    if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      return NextResponse.json(
        {
          error: "Network error: Unable to connect to AI service",
          details: error.message,
        },
        { status: 503 }
      )
    }

    // Generic error response
    return NextResponse.json(
      {
        error: "Failed to generate speech",
        details: error.message || "Unknown error occurred",
      },
      { status: 500 }
    )
  }
}

function createSpeechPrompt(
  name: string,
  goal: string,
  fitnessLevel: string,
  tone: string
): string {
  const toneDescription =
    tone === "motivational"
      ? "energetic, inspiring, and uplifting"
      : "calm, reassuring, and peaceful"

  return `You are a professional fitness coach creating a personalized ${tone} speech for a client.

USER INFORMATION:
- Name: ${name}
- Fitness Goal: ${goal}
- Fitness Level: ${fitnessLevel}
- Desired Tone: ${tone} (${toneDescription})

INSTRUCTIONS:
Create a short, personalized motivational speech (2-3 sentences, maximum 150 words) that:
1. Addresses the user by name
2. Acknowledges their specific fitness goal
3. Provides encouragement appropriate for their fitness level
4. Uses a ${tone} tone throughout
5. Is natural and conversational, suitable for text-to-speech
6. Focuses on motivation, consistency, and progress

OUTPUT FORMAT (respond ONLY with valid JSON, no markdown, no explanations):

{
  "speech": "Hey ${name}, today you're one step closer to your transformation. Your goal of ${goal} will require consistency, but you've got the discipline to make it happen. Remember, every workout counts and every healthy choice brings you closer to where you want to be."
}

IMPORTANT:
- Keep the speech concise and impactful
- Make it personal and relevant to their goal
- Use natural, conversational language
- Return ONLY valid JSON, no additional text before or after
- The speech should be ready to be read aloud by a text-to-speech system`
}

