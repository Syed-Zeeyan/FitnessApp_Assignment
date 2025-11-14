"use client"

import { useState } from "react"
import { Volume2, FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()

  const handleTTS = () => {
    toast({
      title: "Text-to-Speech",
      description: "TTS feature is available! Use the 'Read Workout' or 'Read Diet' buttons on the plan page.",
    })
  }

  const handlePDF = () => {
    toast({
      title: "Export to PDF",
      description: "Use the 'Export PDF' button on the plan page to download your fitness plan.",
    })
  }

  return (
    <div className="fixed bottom-8 right-8 z-50">
      {/* Action buttons - appear when open */}
      <div 
        className={`flex flex-col gap-3 mb-4 transition-all duration-300 ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <Button
          onClick={handleTTS}
          variant="hero"
          size="icon"
          className="w-14 h-14 rounded-full shadow-glow-cyan hover:shadow-glow-pink animate-fade-in"
        >
          <Volume2 className="w-5 h-5" />
        </Button>
        <Button
          onClick={handlePDF}
          variant="hero"
          size="icon"
          className="w-14 h-14 rounded-full shadow-glow-green hover:shadow-glow-cyan animate-fade-in"
        >
          <FileText className="w-5 h-5" />
        </Button>
      </div>

      {/* Main FAB */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="neon"
        size="icon"
        className="w-16 h-16 rounded-full shadow-2xl shadow-primary/50 hover:scale-110 transition-all duration-300 animate-glow-pulse"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <div className="flex items-center justify-center">
            <div className="absolute w-3 h-3 bg-foreground rounded-full animate-ping" />
            <div className="relative w-2 h-2 bg-foreground rounded-full" />
          </div>
        )}
      </Button>
    </div>
  )
}

