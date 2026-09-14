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
    <div className="w-full mb-6 pb-4 border-b border-white/[0.06] flex items-center justify-between sm:justify-start sm:gap-6 font-mono text-[11px] select-none">
      {stages.map((stage, idx) => {
        const isCompleted = completedStages.includes(stage.key);
        const isCurrent = currentStage === stage.key && !isCompleted;

        return (
          <React.Fragment key={stage.key}>
            <div className="flex items-center gap-2">
              {isCompleted ? (
                <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-cyan-500/20 text-cyan-400 text-[10px] font-bold border border-cyan-500/40">
                  ✓
                </span>
              ) : (
                <span
                  className={`font-semibold ${
                    isCurrent
                      ? 'text-cyan-400'
                      : 'text-neutral-500'
                  }`}
                >
                  {stage.num}
                </span>
              )}

              <span
                className={`tracking-wider uppercase ${
                  isCurrent
                    ? 'text-white font-bold'
                    : isCompleted
                    ? 'text-neutral-300'
                    : 'text-neutral-500 font-normal'
                }`}
              >
                {stage.label}
              </span>
            </div>

            {idx < stages.length - 1 && (
              <span className="hidden sm:inline-block text-neutral-700">
                ───
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
