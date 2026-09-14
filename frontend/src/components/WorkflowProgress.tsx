'use client';

import React from 'react';

export type WorkflowStage = 'ANALYZE' | 'REVIEW' | 'PROTECT' | 'VERIFY';

interface WorkflowProgressProps {
  currentStage: WorkflowStage;
  completedStages: WorkflowStage[];
}

export const WorkflowProgress: React.FC<WorkflowProgressProps> = ({
  currentStage,
  completedStages,
}) => {
  const stages: { key: WorkflowStage; num: string; label: string }[] = [
    { key: 'ANALYZE', num: '01', label: 'ANALYZE' },
    { key: 'REVIEW', num: '02', label: 'REVIEW' },
    { key: 'PROTECT', num: '03', label: 'PROTECT' },
    { key: 'VERIFY', num: '04', label: 'VERIFY' },
  ];

  return (
    <div className="w-full mb-6 pb-4 border-b border-slate-200 flex items-center justify-between sm:justify-start sm:gap-6 font-mono text-[11px] select-none">
      {stages.map((stage, idx) => {
        const isCompleted = completedStages.includes(stage.key);
        const isCurrent = currentStage === stage.key && !isCompleted;

        return (
          <React.Fragment key={stage.key}>
            <div className="flex items-center gap-2">
              {isCompleted ? (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                  ✓
                </span>
              ) : (
                <span
                  className={`font-semibold ${
                    isCurrent
                      ? 'text-red-600'
                      : 'text-slate-400'
                  }`}
                >
                  {stage.num}
                </span>
              )}

              <span
                className={`tracking-wider uppercase ${
                  isCurrent
                    ? 'text-slate-900 font-bold'
                    : isCompleted
                    ? 'text-slate-700'
                    : 'text-slate-400 font-normal'
                }`}
              >
                {stage.label}
              </span>
            </div>

            {idx < stages.length - 1 && (
              <span className="hidden sm:inline-block text-slate-300">
                ───
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
