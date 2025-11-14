# AI Fitness Coach

Your personal AI-powered fitness coach with photo-based body analysis, personalized workout plans, and nutrition guidance.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd ai-fitness-coach
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the `ai-fitness-coach` directory with the following variables:

```env
# Required: Google Gemini API Key (for AI plan generation, image analysis, and voice coach)
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: OpenAI API Key (for image generation - fallback if Gemini not available)
OPENAI_API_KEY=your_openai_api_key_here

# Optional: ElevenLabs API Key (for Text-to-Speech)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

**Getting API Keys:**
- **Gemini API Key**: Get a free key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **OpenAI API Key**: Get from [OpenAI Platform](https://platform.openai.com/api-keys) (optional, for image generation)
- **ElevenLabs API Key**: Get from [ElevenLabs](https://elevenlabs.io/) (optional, for TTS)

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

### 4. Build for Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
ai-fitness-coach/
├── app/
│   ├── api/              # API routes
│   │   ├── generate/      # Generate fitness plan (Gemini)
│   │   ├── analyze/       # Photo body analysis (Gemini Vision)
│   │   ├── image/         # Exercise/meal image generation
│   │   ├── tts/           # Text-to-Speech (ElevenLabs)
│   │   ├── voice-coach/   # Motivational speech generation
│   │   └── describe/      # Exercise descriptions
│   ├── page.tsx           # Home page (fitness form)
│   ├── plan/              # Fitness plan display
│   ├── exercise/[name]/   # Exercise detail page
│   ├── dashboard/         # Dashboard/landing page
│   └── not-found.tsx      # 404 page
├── components/            # React components
├── hooks/                 # Custom React hooks
└── types/                 # TypeScript types
```

## 🎯 Features

- ✅ **Photo-Based Body Analysis** - Upload a photo for AI-powered body metrics
- ✅ **Personalized Fitness Plans** - AI-generated workout and diet plans
- ✅ **Exercise Images** - AI-generated images for exercises and meals
- ✅ **Text-to-Speech** - Listen to your workout and diet plans
- ✅ **Voice Coach** - Motivational speeches powered by AI
- ✅ **PDF Export** - Download your fitness plan as PDF
- ✅ **Dark/Light Mode** - Theme switching support
- ✅ **Responsive Design** - Works on all devices

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## 📝 Notes

- The app uses **Gemini API** as the primary AI provider (free tier available)
- Photo analysis requires a valid `GEMINI_API_KEY`
- TTS features require `ELEVENLABS_API_KEY` (optional)
- All API routes are server-side only for security

## 🐛 Troubleshooting

**Port already in use?**
```bash
# Use a different port
npm run dev -- -p 3001
```

**API errors?**
- Check that your `.env.local` file exists and contains valid API keys
- Verify API keys are correct and have sufficient quota
- Check browser console and terminal for error messages

**Build errors?**
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```
