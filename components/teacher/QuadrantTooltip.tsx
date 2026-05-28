import type { StudentQuadrantMetric } from '@/lib/teacher-analytics'

export function QuadrantTooltip({ student }: { student: StudentQuadrantMetric }) {
  return (
    <div className="absolute right-2 top-2 z-20 min-w-[240px] rounded-xl border border-white/10 bg-[#0a0c12]/95 p-4 shadow-2xl backdrop-blur-xl">
      <h4 className="mb-1 font-bold text-white">{student.name}</h4>
      <div className="mb-3 text-xs text-slate-400">
        Accuracy {student.accuracy.toFixed(0)}% ·{' '}
        {student.timePerMark.toFixed(1)} min/mark
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Predicted grade:</span>
          <span className="font-bold text-white">{student.predictedGrade}</span>
        </div>
        {student.biggestDeficit && (
          <div className="border-t border-white/5 pt-2">
            <div className="mb-1 text-xs text-slate-400">Biggest deficit</div>
            <div className="font-mono text-xs text-red-400">
              {student.biggestDeficit.code}
            </div>
            <div className="text-sm text-white">{student.biggestDeficit.name}</div>
            <div className="text-xs text-slate-400">
              {student.biggestDeficit.percentage.toFixed(0)}% mastery
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
