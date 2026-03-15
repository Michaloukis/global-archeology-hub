import { useMemo } from 'react';
import { COURSES, getStoredProgress, getCourseProgressFromStored } from './EducationZone';

export default function CoursesWidget({ profile, onOpenEduLab }) {
  const progress = useMemo(() => getStoredProgress(profile?.id), [profile?.id]);

  const coursesWithProgress = useMemo(() => {
    return COURSES.map((c) => {
      const { percent, label } = getCourseProgressFromStored(c.id, progress);
      return { ...c, percent, label };
    }).sort((a, b) => b.percent - a.percent);
  }, [progress]);

  const inProgress = coursesWithProgress.filter((c) => c.percent > 0 && c.percent < 100);
  const completed = coursesWithProgress.filter((c) => c.percent === 100);

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between gap-2 shrink-0 border-b border-ink/30 pb-1.5 mb-2">
        <h3 className="text-xs font-bold text-ink">Courses</h3>
        {onOpenEduLab && (
          <button
            type="button"
            onClick={onOpenEduLab}
            className="text-[10px] font-medium text-ink/70 hover:text-ink whitespace-nowrap"
          >
            Open Edu Lab →
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
        {inProgress.length === 0 && completed.length === 0 && (
          <p className="text-[11px] text-ink/60">No progress yet. Open Edu Lab to start a course.</p>
        )}
        {inProgress.slice(0, 3).map((c) => (
          <div
            key={c.id}
            className="rounded-lg border border-ink/15 bg-parchment-100/60 px-2.5 py-2"
          >
            <p className="text-[11px] font-semibold text-ink truncate" title={c.title}>
              {c.shortTitle || c.title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1 rounded-full bg-ink/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-600"
                  style={{ width: `${c.percent}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-ink/70 shrink-0">{c.label}</span>
            </div>
          </div>
        ))}
        {completed.slice(0, 2).map((c) => (
          <div
            key={c.id}
            className="rounded-lg border border-amber-200/80 bg-amber-50/60 px-2.5 py-1.5 flex items-center justify-between gap-2"
          >
            <p className="text-[11px] font-semibold text-ink truncate">{c.shortTitle || c.title}</p>
            <span className="text-[9px] font-medium text-amber-800 shrink-0">Done</span>
          </div>
        ))}
      </div>
    </div>
  );
}
