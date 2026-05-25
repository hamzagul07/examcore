'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

type MarkScheme = {
  id: string
  question_number: string
  question_text: string
  total_marks: number
}

export default function MarkPage() {
  const [questions, setQuestions] = useState<MarkScheme[]>([])
  const [selectedQuestionId, setSelectedQuestionId] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Load available questions on mount
  useEffect(() => {
    async function loadQuestions() {
      try {
        const res = await fetch('/api/mark/questions')
        const data = await res.json()
        if (res.ok) {
          setQuestions(data.questions)
        }
      } catch (err) {
        console.error('Failed to load questions:', err)
      }
    }
    loadQuestions()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!photo || !selectedQuestionId) {
      setErrorMsg('Select a question and upload a photo of your answer.')
      return
    }

    setLoading(true)
    setErrorMsg('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('photo', photo)
      formData.append('mark_scheme_id', selectedQuestionId)

      const res = await fetch('/api/mark/process', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      setLoading(false)

      if (!res.ok) {
        setErrorMsg(data.error || 'Marking failed. Please try again.')
        return
      }

      setResult(data)
    } catch (err) {
      setLoading(false)
      const message = err instanceof Error ? err.message : 'Network error'
      setErrorMsg(message)
    }
  }

  const selectedQuestion = questions.find((q) => q.id === selectedQuestionId)

  return (
    <main className="min-h-screen bg-white px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Mark your answer</h1>
        <p className="text-slate-600 mb-8">
          Cambridge A-Level Math 9709/12, May/June 2024.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="question">Which question are you marking?</Label>
            <select
              id="question"
              value={selectedQuestionId}
              onChange={(e) => setSelectedQuestionId(e.target.value)}
              required
              className="mt-1 w-full p-2 border border-slate-300 rounded-md"
            >
              <option value="">Select a question...</option>
              {questions.map((q) => (
                <option key={q.id} value={q.id}>
                  Question {q.question_number} ({q.total_marks} marks)
                </option>
              ))}
            </select>
          </div>

          {selectedQuestion && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
              <p className="text-sm font-semibold text-slate-700 mb-2">
                Question {selectedQuestion.question_number}:
              </p>
              <p className="text-sm text-slate-700">
                {selectedQuestion.question_text}
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="photo">Upload a photo of your handwritten answer</Label>
            <input
              id="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              required
              className="mt-1 w-full p-2 border border-slate-300 rounded-md"
            />
            {photo && (
              <p className="text-xs text-slate-500 mt-1">
                {photo.name} ({(photo.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
              {errorMsg}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Marking... (30 sec)' : 'Mark my answer'}
          </Button>
        </form>

        {result && (
          <div className="mt-8 p-6 border border-slate-200 rounded-md">
            <h2 className="text-2xl font-bold mb-4">
              {result.marks_earned} / {result.total_marks} marks
            </h2>
            <pre className="text-sm whitespace-pre-wrap bg-slate-50 p-4 rounded">
              {JSON.stringify(result.ai_marking, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  )
}