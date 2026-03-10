import { useState, useRef } from 'react';

const REPORT_TEMPLATES = [
  {
    id: 'daily-trench',
    name: 'Daily Trench Report',
    description: 'Daily summary for a single trench or area: weather, personnel, activities, and finds.',
    fields: [
      { key: 'site_name', label: 'Site name', type: 'text' },
      { key: 'trench_id', label: 'Trench / area ID', type: 'text' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'weather', label: 'Weather conditions', type: 'text' },
      { key: 'personnel', label: 'Personnel on site', type: 'textarea' },
      { key: 'activities', label: 'Activities undertaken', type: 'textarea' },
      { key: 'contexts_opened', label: 'Contexts opened', type: 'text' },
      { key: 'finds_summary', label: 'Finds summary', type: 'textarea' },
      { key: 'notes', label: 'Notes / issues', type: 'textarea' },
    ],
  },
  {
    id: 'site-summary',
    name: 'Site Summary Report',
    description: 'High-level overview of a site: location, chronology, objectives, and progress.',
    fields: [
      { key: 'site_name', label: 'Site name', type: 'text' },
      { key: 'location', label: 'Location (coordinates / region)', type: 'text' },
      { key: 'report_date', label: 'Report date', type: 'date' },
      { key: 'project_lead', label: 'Project / field director', type: 'text' },
      { key: 'chronology', label: 'Chronological period(s)', type: 'text' },
      { key: 'objectives', label: 'Season / project objectives', type: 'textarea' },
      { key: 'progress', label: 'Progress summary', type: 'textarea' },
      { key: 'key_finds', label: 'Key finds to date', type: 'textarea' },
      { key: 'next_steps', label: 'Next steps', type: 'textarea' },
    ],
  },
  {
    id: 'finds-inventory',
    name: 'Finds Inventory',
    description: 'Structured log of artifacts: context, material, quantity, and notes.',
    fields: [
      { key: 'site_name', label: 'Site name', type: 'text' },
      { key: 'context_id', label: 'Context / locus', type: 'text' },
      { key: 'date', label: 'Date recorded', type: 'date' },
      { key: 'material', label: 'Material (e.g. ceramic, lithic, metal)', type: 'text' },
      { key: 'quantity', label: 'Quantity', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'find_number', label: 'Find / small find number', type: 'text' },
      { key: 'storage_location', label: 'Storage / box location', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    id: 'stratigraphy-unit',
    name: 'Stratigraphy Unit Form',
    description: 'Single stratigraphic unit: dimensions, matrix, inclusions, and interpretation.',
    fields: [
      { key: 'site_name', label: 'Site name', type: 'text' },
      { key: 'unit_id', label: 'Unit / context number', type: 'text' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'above', label: 'Above (overlying unit)', type: 'text' },
      { key: 'below', label: 'Below (underlying unit)', type: 'text' },
      { key: 'dimensions', label: 'Dimensions (L × W × D)', type: 'text' },
      { key: 'matrix', label: 'Matrix (soil type, colour, texture)', type: 'textarea' },
      { key: 'inclusions', label: 'Inclusions', type: 'textarea' },
      { key: 'interpretation', label: 'Interpretation', type: 'textarea' },
    ],
  },
  {
    id: 'field-journal',
    name: 'Field Journal Entry',
    description: 'Free-form field diary: observations, sketches reference, and decisions.',
    fields: [
      { key: 'site_name', label: 'Site name', type: 'text' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'author', label: 'Author', type: 'text' },
      { key: 'entry_title', label: 'Entry title', type: 'text' },
      { key: 'observations', label: 'Observations', type: 'textarea' },
      { key: 'sketches_ref', label: 'Sketches / plans reference', type: 'text' },
      { key: 'decisions', label: 'Decisions / follow-up', type: 'textarea' },
    ],
  },
  {
    id: 'survey-report',
    name: 'Survey Report',
    description: 'Survey or walkover: methodology, coverage, and surface finds.',
    fields: [
      { key: 'site_or_region', label: 'Site / survey region', type: 'text' },
      { key: 'date', label: 'Survey date', type: 'date' },
      { key: 'method', label: 'Method (walkover, gridded, etc.)', type: 'text' },
      { key: 'coverage', label: 'Coverage (area / transects)', type: 'textarea' },
      { key: 'conditions', label: 'Ground / visibility conditions', type: 'text' },
      { key: 'surface_finds', label: 'Surface finds summary', type: 'textarea' },
      { key: 'recommendations', label: 'Recommendations', type: 'textarea' },
    ],
  },
  {
    id: 'conservation',
    name: 'Conservation / Lifting Record',
    description: 'Record of in-situ conservation or lifting of fragile finds.',
    fields: [
      { key: 'site_name', label: 'Site name', type: 'text' },
      { key: 'context_id', label: 'Context', type: 'text' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'find_description', label: 'Find description', type: 'textarea' },
      { key: 'condition', label: 'Condition before treatment', type: 'textarea' },
      { key: 'treatment', label: 'Treatment / lifting method', type: 'textarea' },
      { key: 'materials_used', label: 'Materials used', type: 'text' },
      { key: 'storage', label: 'Post-lift storage', type: 'text' },
    ],
  },
  {
    id: 'photo-log',
    name: 'Photo / Media Log',
    description: 'Log of photographs or media: subject, context, and scale.',
    fields: [
      { key: 'site_name', label: 'Site name', type: 'text' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'photo_id', label: 'Photo / media ID', type: 'text' },
      { key: 'subject', label: 'Subject', type: 'text' },
      { key: 'context', label: 'Context / locus', type: 'text' },
      { key: 'scale', label: 'Scale (e.g. scale bar, north)', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
];

function getDefaultValues(fields) {
  return fields.reduce((acc, f) => {
    acc[f.key] = '';
    return acc;
  }, {});
}

export default function ReportSyntaxTemplates({ onBack, profile }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formValues, setFormValues] = useState({});
  const printRef = useRef(null);

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setFormValues(getDefaultValues(template.fields));
  };

  const handleChange = (key, value) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleExport = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${selectedTemplate?.name || 'Report'} — Export</title>
          <style>
            body { font-family: Georgia, serif; padding: 24px; max-width: 800px; margin: 0 auto; color: #2c2825; }
            h1 { font-size: 1.5rem; border-bottom: 2px solid #2c2825; padding-bottom: 8px; margin-bottom: 16px; }
            .meta { font-size: 0.75rem; color: #666; margin-bottom: 20px; }
            .field { margin-bottom: 16px; }
            .field-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #666; margin-bottom: 4px; }
            .field-value { min-height: 20px; border-bottom: 1px solid #ddd; padding: 4px 0; white-space: pre-wrap; }
            .field-value.empty { color: #999; }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const handleBackToList = () => {
    setSelectedTemplate(null);
    setFormValues({});
  };

  const authorName = profile?.full_name || profile?.username || 'Field team';

  if (selectedTemplate) {
    return (
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-ink/20 flex-wrap">
          <button
            type="button"
            onClick={handleBackToList}
            className="flex items-center gap-2 text-ink font-medium text-sm min-h-[44px]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All templates
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="min-h-[44px] rounded-xl bg-ink text-white px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              Export / Print
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-2xl mx-auto space-y-4">
            <div
              ref={printRef}
              className="bg-white border border-ink/20 rounded-2xl p-6 shadow-sm print:shadow-none print:border-0"
            >
              <h1 className="text-xl font-bold text-ink border-b-2 border-ink/20 pb-2 mb-4">
                {selectedTemplate.name}
              </h1>
              <p className="text-xs text-ink/60 mb-6">
                Global Archaeology Hub — Report Syntax · {new Date().toLocaleDateString()} · {authorName}
              </p>
              <div className="space-y-4">
                {selectedTemplate.fields.map((field) => (
                  <div key={field.key} className="field">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-ink/60 mb-1">
                      {field.label}
                    </div>
                    {field.type === 'textarea' ? (
                      <div className="field-value min-h-[60px] border-b border-ink/10 py-2 text-sm text-ink whitespace-pre-wrap">
                        {formValues[field.key] || '\u00A0'}
                      </div>
                    ) : (
                      <div className="field-value border-b border-ink/10 py-2 text-sm text-ink">
                        {formValues[field.key] || '\u00A0'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-ink/10 bg-parchment-100/60 p-4 space-y-4">
              <p className="text-sm font-semibold text-ink">Fill the form</p>
              {selectedTemplate.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-ink/70 mb-1">{field.label}</label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={formValues[field.key] ?? ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-ink/20 p-3 text-sm text-ink placeholder-ink/40 outline-none focus:ring-2 focus:ring-ink/20"
                      placeholder={field.label}
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={formValues[field.key] ?? ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full rounded-xl border border-ink/20 p-3 text-sm text-ink placeholder-ink/40 outline-none focus:ring-2 focus:ring-ink/20"
                      placeholder={field.label}
                    />
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleExport}
                className="w-full min-h-[44px] rounded-xl bg-ink text-white font-medium text-sm hover:opacity-90"
              >
                Export / Print report
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="shrink-0 px-4 py-3 border-b border-ink/20">
        <h2 className="text-lg font-bold text-ink">Report Syntax</h2>
        <p className="text-sm text-ink/60 mt-1">
          Choose an archaeology report template, fill it in, and export or print.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {REPORT_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => handleSelectTemplate(template)}
              className="text-left rounded-2xl border-2 border-ink/20 bg-white p-5 shadow-[0_2px_12px_rgba(44,40,37,0.08)] hover:bg-ink/5 hover:border-ink/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-ink/10 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-ink/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-ink text-sm leading-tight">{template.name}</h3>
              <p className="text-xs text-ink/60 mt-1 line-clamp-3">{template.description}</p>
              <span className="inline-block mt-3 text-xs font-medium text-ink/70">Use template →</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
