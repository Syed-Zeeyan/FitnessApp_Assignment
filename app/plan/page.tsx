"use client"

import { Suspense } from "react"
import PlanPageContent from "./plan-content"

export default function PlanPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">Loading...</div>
      </div>
    }>
      <PlanPageContent />
    </Suspense>
  )
}
