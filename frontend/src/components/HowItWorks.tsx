'use client';

import React from 'react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Upload File',
      desc: 'Upload a single JPEG, PNG, or PDF file up to 25 MB. Raw binaries stay safely in temporary local storage.',
      badge: 'Single File',
    },
    {
      step: '02',
      title: 'Verified Extraction',
      desc: 'Native parsers (Pillow & pypdf) inspect binary structure and extract factual metadata tags locally.',
      badge: 'Zero Hallucination',
    },
    {
      step: '03',
      title: 'Privacy Intelligence',
      desc: 'Structured facts are classified by severity (CRITICAL, HIGH, MEDIUM, LOW) across Location, Hardware, and Identity.',
      badge: 'Rule-Based AI',
    },
    {
      step: '04',
      title: 'Selective Selection',
      desc: 'You choose which exposed metadata tags to strip. Safe technical fields can be retained if desired.',
      badge: 'User Controlled',
    },
    {
      step: '05',
      title: 'Surgical Sanitization',
      desc: 'Targeted tags are purged while image pixels, layout dimensions, and document pages remain untouched.',
      badge: 'Lossless Visuals',
    },
    {
      step: '06',
      title: 'Verified Verification & Score',
      desc: 'Metadata is re-extracted from the sanitized binary to confirm removal and compute a deterministic 0–100 score.',
      badge: 'Guaranteed Score',
    },
  ];

  return (
    <section id="how-it-works-section" className="py-16 border-t border-slate-800/80">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400">
            Engine Pipeline
          </h3>
          <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            How SecureX Protects Your Privacy
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            A transparent 6-step privacy verification lifecycle designed for verifiable file security.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((item) => (
            <div
              key={item.step}
              className="relative rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm transition-all hover:border-slate-700 hover:bg-slate-900/80"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-extrabold text-cyan-400/80 font-mono">
                  {item.step}
                </span>
                <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-semibold text-slate-300 border border-slate-700">
                  {item.badge}
                </span>
              </div>
              <h4 className="text-base font-bold text-white mb-2">{item.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
