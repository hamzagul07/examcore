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

type MarkAwarded = {
  mark_id: number
  type: string
  earned: boolean
  reasoning: string
}

type MarkingResult = {
  marks_earned: number
  total_marks: number
  ai_marking: {
    marks_awarded: MarkAwarded[]
    summary: string
    weak_topics: string[]
    what_to_study_next: string
    estimated_marks_explanation?: string
  }
  ocr_text?: string
  question_text?: string
}

export default function MarkPage() {
  const [mode, setMode] = useState<'past_paper' | 'other'>('past_paper')
  const [questions, setQuestions] = useState<MarkScheme[]>([])
  const [selectedQuestionId, setSelectedQuestionId] = useState('')
  const [answerPhoto, setAnswerPhoto] = useState<File | null>(null)
  const [questionPhoto, setQuestionPhoto] = useState<File | null>(null)
  const [questionTextInput, setQuestionTextInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MarkingResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [showOCR, setShowOCR] = useState(false)

  useEffect(() => {
    async function loadQuestions() {
      try {
        const res = await fetch('/api/mark/questions')
        const data = await res.json()
        if (res.ok) setQuestions(data.questions)
      } catch (err) {
        console.error('Failed to load questions:', err)
      }
    }
    loadQuestions()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!answerPhoto) {
      setErrorMsg('Upload a photo of your answer.')
      return
    }
    if (mode === 'past_paper' && !selectedQuestionId) {
      setErrorMsg('Select a question.')
      return
    }
    if (mode === 'other' && !questionPhoto && !questionTextInput.trim()) {
      setErrorMsg('Upload a question photo or type the question.')
      return
    }

    setLoading(true)
    setErrorMsg('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('mode', mode)
      formData.append('photo', answerPhoto)

      if (mode === 'past_paper') {
        formData.append('mark_scheme_id', selectedQuestionId)
      } else {
        if (questionPhoto) formData.append('question_photo', questionPhoto)
        if (questionTextInput.trim()) formData.append('question_text', questionTextInput)
      }

      const res = await fetch('/api/mark/process', { method: 'POST', body: formData })
      const data = await res.json()
      setLoading(false)

      if (!res.ok) {
        setErrorMsg(data.error || 'Marking failed.')
        return
      }

      setResult(data)
    } catch (err) {
      setLoading(false)
      setErrorMsg(err instanceof Error ? err.message : 'Network error')
    }
  }

  function resetForm() {
    setResult(null)
    setAnswerPhoto(null)
    setQuestionPhoto(null)
    setQuestionTextInput('')
    setShowOCR(false)
    setErrorMsg('')
  }

  const selectedQuestion = questions.find((q) => q.id === selectedQuestionId)
  const percentage = result ? Math.round((result.marks_earned / result.total_marks) * 100) : 0
  const scoreColor = result
    ? result.marks_earned === result.total_marks
      ? 'text-green-600'
      : result.marks_earned >= result.total_marks * 0.5
      ? 'text-amber-600'
      : 'text-red-600'
    : 'text-slate-900'

  return (
    <main className="min-h-screen bg-white px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Mark your answer</h1>
        <p className="text-slate-600 mb-8">A-Level Mathematics marking, examiner-grade.</p>

        {!result && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mode toggle */}
            <div>
              <Label>Where is this question from?</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('past_paper')}
                  className={`p-3 rounded-md border text-sm font-medium transition ${
                    mode === 'past_paper'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  Cambridge past paper
                </button>
                <button
                  type="button"
                  onClick={() => setMode('other')}
                  className={`p-3 rounded-md border text-sm font-medium transition ${
                    mode === 'other'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  Textbook / other source
                </button>
              </div>
            </div>

            {/* Past paper mode */}
            {mode === 'past_paper' && (
              <>
                <div>
                  <Label htmlFor="question">Which question?</Label>
                  <select
                    id="question"
                    value={selectedQuestionId}
                    onChange={(e) => setSelectedQuestionId(e.target.value)}
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
                    <p className="text-sm text-slate-700">{selectedQuestion.question_text}</p>
                  </div>
                )}
              </>
            )}

            {/* Other question mode */}
            {mode === 'other' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="question-photo">Upload a photo of the question</Label>
                  <input
                    id="question-photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setQuestionPhoto(e.target.files?.[0] || null)}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-md"
                  />
                  {questionPhoto && (
                    <p className="text-xs text-slate-500 mt-1">{questionPhoto.name}</p>
                  )}
                </div>

                <div className="text-center text-slate-400 text-sm">OR</div>

                <div>
                  <Label htmlFor="question-text">Type the question</Label>
                  <textarea
                    id="question-text"
                    value={questionTextInput}
                    onChange={(e) => setQuestionTextInput(e.target.value)}
                    rows={3}
                    placeholder="e.g., Find dy/dx if y = 3x^2 + 5x - 2"
                    className="mt-1 w-full p-2 border border-slate-300 rounded-md"
                  />
                </div>
              </div>
            )}

            {/* Answer upload (both modes) */}
            <div>
              <Label htmlFor="answer-photo">Upload a photo of your answer</Label>
              <input
                id="answer-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setAnswerPhoto(e.target.files?.[0] || null)}
                required
                className="mt-1 w-full p-2 border border-slate-300 rounded-md"
              />
              {answerPhoto && (
                <p className="text-xs text-slate-500 mt-1">
                  {answerPhoto.name} ({(answerPhoto.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                {errorMsg}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Marking... (up to 45 sec)' : 'Mark my answer'}
            </Button>
          </form>
        )}

        {result && (
          <div className="space-y-6">
            <div className="text-center py-8 border-b border-slate-200">
              <div className={`text-7xl font-bold ${scoreColor}`}>
                {result.marks_earned}
                <span className="text-slate-400">/{result.total_marks}</span>
              </div>
              <p className="mt-2 text-slate-600">marks earned</p>
              <div className="mt-4 max-w-md mx-auto">
                <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      percentage === 100
                        ? 'bg-green-500'
                        : percentage >= 50
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-slate-500">{percentage}%</p>
              </div>
            </div>

            {result.question_text && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
                <p className="text-sm font-semibold text-slate-700 mb-2">Question (as read):</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {result.question_text}
                </p>
              </div>
            )}

            <div>
              <h2 className="text-xl font-bold mb-2">Summary</h2>
              <p className="text-slate-700">{result.ai_marking.summary}</p>
            </div>

            {result.ai_marking.estimated_marks_explanation && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 text-sm">
                <strong>Marking note:</strong> {result.ai_marking.estimated_marks_explanation}
              </div>
            )}

            <div>
              <h2 className="text-xl font-bold mb-3">Mark-by-mark breakdown</h2>
              <div className="space-y-3">
                {result.ai_marking.marks_awarded.map((mark) => (
                  <div
                    key={mark.mark_id}
                    className={`p-4 rounded-md border ${
                      mark.earned ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 text-xs font-bold rounded ${
                          mark.earned ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                        }`}
                      >
                        {mark.type}
                      </span>
                      <span className="text-sm font-semibold text-slate-700">
                        {mark.earned ? 'Earned' : 'Not earned'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{mark.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>

            {result.ai_marking.weak_topics && result.ai_marking.weak_topics.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-3">Topics to work on</h2>
                <ul className="space-y-1">
                  {result.ai_marking.weak_topics.map((topic, i) => (
                    <li key={i} className="text-slate-700 flex items-start">
                      <span className="text-amber-500 mr-2">•</span>
                      {topic}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.ai_marking.what_to_study_next && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h3 className="font-bold text-blue-900 mb-2">Study next:</h3>
                <p className="text-blue-800">{result.ai_marking.what_to_study_next}</p>
              </div>
            )}

            {result.ocr_text && (
              <div>
                <button
                  onClick={() => setShowOCR(!showOCR)}
                  className="text-sm text-slate-500 hover:text-slate-700 underline"
                >
                  {showOCR ? 'Hide' : 'Show'} what the AI read from your handwriting
                </button>
                {showOCR && (
                  <pre className="mt-2 text-xs whitespace-pre-wrap bg-slate-50 p-3 rounded text-slate-700 border border-slate-200">
                    {result.ocr_text}
                  </pre>
                )}
              </div>
            )}

            <div className="pt-4">
              <Button onClick={resetForm} className="w-full">
                Mark another answer
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}