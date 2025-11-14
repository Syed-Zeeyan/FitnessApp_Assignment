# Troubleshooting Gemini API 404 Errors

## Problem
You're seeing `404 Not Found` errors when trying to use Gemini models, even though your API key is valid.

## Root Cause
The **Generative AI API is not enabled** in your Google Cloud project. Having an API key doesn't automatically enable the API - you need to enable it separately.

## Solution

### Step 1: Enable the Generative AI API

1. Go to the Google Cloud Console API Library:
   ```
   https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com
   ```

2. Make sure you're in the correct project:
   - Your project: `projects/599646167290` (FITNESS)

3. Click the **"Enable"** button

4. Wait 2-3 minutes for the API to be fully enabled

### Step 2: Verify API is Enabled

1. Check your API usage dashboard (where you saw the 404 errors)
2. You should see the API listed as "Enabled"

### Step 3: Test Available Models

Visit this URL in your browser (while dev server is running):
```
http://localhost:3000/api/list-models
```

This will show you which models your API key can actually access.

### Step 4: Restart Your Dev Server

After enabling the API:
```bash
# Stop the server (Ctrl+C)
cd ai-fitness-coach
npm run dev
```

## Alternative: Check API Key Permissions

If enabling the API doesn't work:

1. Go to Google AI Studio: https://aistudio.google.com/
2. Check your API key settings
3. Ensure the key has access to Gemini models
4. Some models may require a paid tier

## Common Models for Free Tier

- `gemini-1.5-flash` - Most common, usually available on free tier
- `gemini-1.5-flash-8b` - Smaller variant
- `gemini-1.5-pro` - May require paid tier

## Still Having Issues?

1. Check the server console logs - they now show which models are being tried
2. Visit `/api/list-models` to see available models
3. Visit `/api/verify-key` to test your API key directly

