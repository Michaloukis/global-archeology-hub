import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { chatWithGroq } from '../services/groqApi';
import AIAssistant from './AIAssistant';

// ——— Sample archaeology courses (CCNA Academy–style structure) ———
const COURSES = [
  {
    id: 'stratigraphy',
    title: 'Introduction to Stratigraphy',
    shortTitle: 'Stratigraphy',
    description: 'Master the laws of soil layers and chronological dating. Learn superposition, context, and relative vs. absolute dating methods used in the field.',
    duration: '~2 hours',
    skills: ['Law of Superposition', 'Context & Association', 'Relative & Absolute Dating'],
    modules: [
      { id: '1.0', title: 'Module 1: Foundations', sections: [
        { id: '1.1', title: 'What is Stratigraphy?', content: 'Stratigraphy is the study of rock and soil layers (strata) and their sequence. In archaeology, it helps us understand the order of deposition and the relative age of artifacts and features.' },
        { id: '1.2', title: 'The Law of Superposition', content: 'In an undisturbed sequence, the oldest layers are at the bottom and the youngest at the top. This principle is fundamental to interpreting excavation profiles.' },
        { id: '1.3', title: 'Context and Association', content: 'Artifacts found in the same layer are considered contemporary—the principle of association. Context (provenience) is everything: record it precisely.' },
      ]},
      { id: '2.0', title: 'Module 2: Dating Methods', sections: [
        { id: '2.1', title: 'Relative Dating', content: 'Relative dating tells us if something is older or younger than something else (e.g. stratigraphic position, typology), but not calendar age.' },
        { id: '2.2', title: 'Absolute Dating', content: 'Absolute dating gives calendar years: radiocarbon (C-14), dendrochronology, potassium-argon, and others. Each has a range and material requirements.' },
      ]},
    ],
    moduleQuizzes: [
      [
        { question: 'In an undisturbed sequence, where is the oldest layer?', options: ['At the top', 'In the middle', 'At the bottom'], answer: 2 },
        { question: 'An artifact in a specific soil layer is considered ___ that layer.', options: ['Older than', 'Younger than', 'Contemporary with'], answer: 2 },
        { question: 'Which is an example of relative dating?', options: ['Carbon-14', 'Stratigraphic analysis', 'Dendrochronology'], answer: 1 },
      ],
      [
        { question: 'Relative dating provides exact calendar years.', options: ['True', 'False'], answer: 1 },
        { question: 'Radiocarbon dating is best for materials up to about ___ years old.', options: ['1,000', '50,000', '1 million'], answer: 1 },
      ],
    ],
    test: [ // Mid-course check
      { question: 'Stratigraphy helps archaeologists determine ___ of deposits.', options: ['color', 'sequence and relative age', 'weight'], answer: 1 },
      { question: 'The principle of association states that items in the same context are ___.', options: ['from different periods', 'contemporary', 'always ceramics'], answer: 1 },
      { question: 'Which dating method gives calendar years?', options: ['Stratigraphy only', 'Radiocarbon dating', 'Typology only'], answer: 1 },
    ],
    exam: [ // Final exam
      { question: 'In superposition, the layer at the bottom of a section is:', options: ['youngest', 'oldest', 'undated'], answer: 1 },
      { question: 'Recording precise context (provenience) is critical because:', options: ['it looks professional', 'it preserves chronological and spatial meaning', 'it is required by law only'], answer: 1 },
      { question: 'Relative dating can be done using:', options: ['only C-14', 'stratigraphy and typology', 'only dendrochronology'], answer: 1 },
      { question: 'Absolute dating methods include:', options: ['superposition only', 'radiocarbon and dendrochronology', 'association only'], answer: 1 },
      { question: 'Stratigraphy is the study of:', options: ['stars', 'rock and soil layers and their sequence', 'pottery only'], answer: 1 },
    ],
  },
  {
    id: 'ceramic-typology',
    title: 'Ceramic Typology & Classification',
    shortTitle: 'Ceramic Typology',
    description: 'Learn to classify pottery shards by form, fabric, and decoration. Essential for dating and understanding trade and technology across sites.',
    duration: '~2 hours',
    skills: ['Form & Function', 'Fabric & Temper', 'Decoration & Chronology'],
    modules: [
      { id: '1.0', title: 'Module 1: Basics of Pottery', sections: [
        { id: '1.1', title: 'Why Pottery Matters', content: 'Pottery is abundant, durable, and changes style over time. Typologies help date sites and link cultures. Fabric (clay + temper) and form reveal technology and trade.' },
        { id: '1.2', title: 'Form and Function', content: 'Vessels are classified by shape: bowls, jars, amphorae, etc. Form often reflects function (storage, cooking, serving) and cultural preference.' },
      ]},
      { id: '2.0', title: 'Module 2: Fabric and Decoration', sections: [
        { id: '2.1', title: 'Fabric and Temper', content: 'Fabric is the clay body; temper (sand, grit, shell) was added to reduce shrinkage. Different regions used different tempers—useful for sourcing.' },
        { id: '2.2', title: 'Decoration and Chronology', content: 'Decoration (incised, painted, stamped) changes over time. Building a typology from dated contexts allows undated sherds to be placed in sequence.' },
      ]},
    ],
    moduleQuizzes: [
      [
        { question: 'Pottery is useful in archaeology because it is:', options: ['rare', 'abundant and style changes over time', 'always inscribed'], answer: 1 },
        { question: 'Temper in pottery is used to:', options: ['add color', 'reduce shrinkage and improve firing', 'make it heavier'], answer: 1 },
      ],
      [
        { question: 'Decoration on pottery can help with:', options: ['weight only', 'chronology and cultural attribution', 'nothing'], answer: 1 },
        { question: 'Form of a vessel often reflects:', options: ['only color', 'function and culture', 'only size'], answer: 1 },
      ],
    ],
    test: [
      { question: 'Fabric in pottery refers to:', options: ['cloth', 'the clay body and temper', 'paint'], answer: 1 },
      { question: 'A typology helps archaeologists:', options: ['count sherds only', 'date and compare assemblages', 'ignore context'], answer: 1 },
    ],
    exam: [
      { question: 'Temper is added to clay to:', options: ['decorate', 'reduce shrinkage', 'increase weight'], answer: 1 },
      { question: 'Pottery typologies are built from:', options: ['guesswork', 'dated contexts and stratified assemblages', 'single sherds only'], answer: 1 },
      { question: 'Form of a vessel can indicate:', options: ['nothing', 'function and culture', 'only age'], answer: 1 },
      { question: 'Decoration on ceramics can be:', options: ['only painted', 'incised, painted, or stamped', 'only modern'], answer: 1 },
      { question: 'Different tempers in fabric can suggest:', options: ['only color preference', 'different sources or regions', 'nothing'], answer: 1 },
    ],
  },
  {
    id: 'field-methods',
    title: 'Archaeological Field Methods',
    shortTitle: 'Field Methods',
    description: 'Excavation ethics, grid systems, recording, and documentation. How to work in the field without destroying the very record you seek.',
    duration: '~2.5 hours',
    skills: ['Grid & Provenience', 'Recording', 'Ethics of Excavation'],
    modules: [
      { id: '1.0', title: 'Module 1: Before You Dig', sections: [
        { id: '1.1', title: 'Survey and Research Design', content: 'Define research questions. Use survey (walkover, geophysics, remote sensing) to decide where to dig. Excavation is destructive—plan carefully.' },
        { id: '1.2', title: 'Grid and Provenience', content: 'Sites are laid out on a grid. Every find is recorded with coordinates (X, Y, Z) and context number. Provenience is the 3D location of an artifact.' },
      ]},
      { id: '2.0', title: 'Module 2: Recording', sections: [
        { id: '2.1', title: 'Context Sheets and Plans', content: 'Each context (layer, feature) gets a sheet: description, dimensions, finds. Draw plans and sections to scale. Photos with scale and north arrow.' },
        { id: '2.2', title: 'Finds Handling', content: 'Label bags with site, context, date. Small finds get individual numbers. Never mix contexts. Conservation may be needed for fragile items.' },
      ]},
    ],
    moduleQuizzes: [
      [
        { question: 'Excavation is destructive, so we should:', options: ['dig everywhere', 'plan carefully and define research questions', 'skip recording'], answer: 1 },
        { question: 'Provenience is:', options: ['a type of pottery', 'the 3D location of an artifact', 'a dating method'], answer: 1 },
      ],
      [
        { question: 'Context sheets record:', options: ['only photos', 'description, dimensions, finds', 'nothing'], answer: 1 },
        { question: 'Finds from different contexts should:', options: ['be mixed in one bag', 'never be mixed; label by context', 'be thrown away'], answer: 1 },
      ],
    ],
    test: [
      { question: 'A site grid is used to:', options: ['decorate', 'record precise locations', 'hide finds'], answer: 1 },
      { question: 'Plans and sections should be:', options: ['rough sketches', 'to scale with north and scale bar', 'optional'], answer: 1 },
    ],
    exam: [
      { question: 'Research design should be defined:', options: ['after digging', 'before excavation', 'never'], answer: 1 },
      { question: 'Provenience includes:', options: ['only depth', 'X, Y, Z and context', 'only site name'], answer: 1 },
      { question: 'Context sheets are for:', options: ['only artifacts', 'each layer or feature', 'only photos'], answer: 1 },
      { question: 'Finds should be labeled with:', options: ['only date', 'site, context, date', 'nothing'], answer: 1 },
      { question: 'Excavation is destructive, so:', options: ['we do not need to record', 'recording is essential', 'we never dig'], answer: 1 },
    ],
  },
];

const PASSING_PERCENT = 70;
const STORAGE_KEY = 'edu_lab_progress';
const STORAGE_KEY_NOTEPAD = 'edu_lab_notepad';

function siteVisibility(site) {
  return site?.visibility ?? (site?.is_public === false ? 'private' : 'public');
}

function buildStudentAssistantPrompt(role) {
  const base = `You are the AI assistant for the Global Archaeology Hub. You help users with archaeology-related questions, fieldwork, research, and education. Be concise, professional, and accurate.`;
  const roleHint = {
    Director: 'The user is a Director: help with site oversight, team coordination, approvals, reports, and strategy.',
    'Field Archeologist': 'The user is a Field Archeologist: help with fieldwork, documentation, stratigraphy, finds, journals, and expedition logistics.',
    Student: 'The user is a Student: teach clearly, define terms, and help them learn from student-visible sites and declassified archives.'
  };
  return `${base} ${roleHint[role] || ''}`.trim();
}

function StudentAssistantCard({ profile }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);
  const role = profile?.role || 'Student';
  const hasKey = !!import.meta.env.VITE_GROQ_API_KEY;

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages.length, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setError(null);
    setLoading(true);
    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    try {
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const reply = await chatWithGroq({
        systemPrompt: buildStudentAssistantPrompt(role),
        messages: history,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (e) {
      setError(e?.message || 'Request failed');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${e?.message || 'Request failed'}. Set VITE_GROQ_API_KEY in .env.` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-ink/10 bg-white shadow-sm overflow-hidden flex flex-col min-h-[360px]">
      <div className="shrink-0 px-4 py-3 border-b border-ink/10">
        <p className="text-sm font-semibold text-ink">AI study assistant</p>
        <p className="text-xs text-ink/60">Ask about archaeology methods, terms, or your course material.</p>
      </div>
      {!hasKey && (
        <div className="shrink-0 px-4 py-2 bg-amber-50 border-b border-ink/10 text-xs text-ink/80">
          Set <span className="font-semibold">VITE_GROQ_API_KEY</span> in <span className="font-semibold">.env</span> to enable the assistant.
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !loading && (
          <div className="text-sm text-ink/60">
            Try: “Explain stratigraphy in simple terms”, “What is provenience?”, or “Help me study for the ceramic typology exam.”
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`text-sm ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
            <div
              className={`inline-block max-w-[90%] px-3 py-2 rounded-2xl ${
                m.role === 'user'
                  ? 'bg-ink text-white'
                  : 'bg-parchment-100 border border-ink/10 text-ink'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-left text-sm">
            <div className="inline-block px-3 py-2 rounded-2xl bg-parchment-100 border border-ink/10 text-ink/60 animate-pulse">
              Thinking…
            </div>
          </div>
        )}
        {error && <p className="text-xs text-rose-700">{error}</p>}
        <div ref={endRef} />
      </div>
      <div className="shrink-0 p-3 border-t border-ink/10 bg-white flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) send();
          }}
          placeholder="Ask a question…"
          className="flex-1 min-h-[44px] rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink placeholder-ink/40 outline-none focus:border-ink/30"
          disabled={!hasKey || loading}
        />
        <button
          type="button"
          onClick={send}
          disabled={!hasKey || loading || !input.trim()}
          className="min-h-[44px] rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function getStoredProgress(profileId) {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${profileId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setStoredProgress(profileId, data) {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${profileId}`, JSON.stringify(data));
  } catch (e) {
    console.warn('Edu Lab: could not save progress', e);
  }
}

/** Pure helper for widgets: compute course progress from stored progress object. */
export function getCourseProgressFromStored(courseId, progressObj) {
  const c = COURSES.find((x) => x.id === courseId);
  if (!c) return { percent: 0, label: 'Not started' };
  const p = progressObj[courseId] || {};
  let steps = 0;
  const totalModules = c.modules?.length ?? 0;
  steps += p.completedModules?.length ?? 0;
  if (p.testPassed) steps += 1;
  if (p.examPassed) steps += 1;
  const total = totalModules + 2;
  const percent = total ? Math.round((steps / total) * 100) : 0;
  let label = 'Not started';
  if (steps > 0) label = steps >= total ? 'Complete' : `${percent}%`;
  return { percent, label };
}

export { COURSES, getStoredProgress, STORAGE_KEY_NOTEPAD };

export default function EducationZone({ profile, onNavigateToMap }) {
  const [view, setView] = useState('catalog'); // 'catalog' | 'course' | 'assessment' | 'certificate'
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [assessmentType, setAssessmentType] = useState(null); // 'moduleQuiz' | 'test' | 'exam'
  const [assessmentIndex, setAssessmentIndex] = useState(0); // for module quiz: which module
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [showAssessmentResult, setShowAssessmentResult] = useState(false);
  const [xp, setXp] = useState(profile?.education_xp || 0);
  const [progress, setProgress] = useState(() => getStoredProgress(profile?.id));
  const [showCertificateForCourseId, setShowCertificateForCourseId] = useState(null);

  const [studentSites, setStudentSites] = useState([]);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [studentArchives, setStudentArchives] = useState([]);
  const [archivesLoading, setArchivesLoading] = useState(false);
  const [catalogTab, setCatalogTab] = useState('overview'); // overview | courses | archives | tools
  const [archiveQuery, setArchiveQuery] = useState('');
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [notepad, setNotepad] = useState(() => {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_NOTEPAD}_${profile?.id || 'anon'}`);
      return raw || '';
    } catch {
      return '';
    }
  });

  const course = useMemo(() => COURSES.find(c => c.id === selectedCourseId), [selectedCourseId]);
  const currentModule = course?.modules?.[activeModuleIndex];
  const currentSection = currentModule?.sections?.[activeSectionIndex];

  // Persist progress when it changes
  useEffect(() => {
    if (profile?.id) setStoredProgress(profile.id, progress);
  }, [profile?.id, progress]);

  // Persist notepad (local, per user)
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY_NOTEPAD}_${profile?.id || 'anon'}`, notepad || '');
    } catch (_) {}
  }, [profile?.id, notepad]);

  // Load student-visible sites + archives for the Edu Lab dashboard
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    const isStudent = profile?.role === 'Student';

    const fetchSites = async () => {
      setSitesLoading(true);
      try {
        const { data, error } = await supabase.from('sites').select('id, name, status, visibility, is_public, region, created_at');
        if (error) throw error;
        const filtered = (data || []).filter((s) => {
          const v = siteVisibility(s);
          if (v === 'public') return true;
          if (v === 'student') return isStudent;
          return false;
        });
        if (!cancelled) setStudentSites(filtered.slice(0, 6));
      } catch (e) {
        if (!cancelled) setStudentSites([]);
        console.error('Edu Lab: fetch sites error', e);
      } finally {
        if (!cancelled) setSitesLoading(false);
      }
    };

    const fetchArchives = async () => {
      setArchivesLoading(true);
      try {
        const { data, error } = await supabase
          .from('site_journals')
          .select('id, site_id, findings, notes, created_at, visibility, is_public, sites(name)')
          .or('visibility.eq.public,visibility.eq.student,is_public.eq.true')
          .order('created_at', { ascending: false })
          .limit(10);
        if (error) throw error;
        if (!cancelled) setStudentArchives(data || []);
      } catch (e) {
        if (!cancelled) setStudentArchives([]);
        console.error('Edu Lab: fetch archives error', e);
      } finally {
        if (!cancelled) setArchivesLoading(false);
      }
    };

    fetchSites();
    fetchArchives();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, profile?.role]);

  const isCourseComplete = (courseId) => {
    const p = progress[courseId];
    if (!p) return false;
    const c = COURSES.find(x => x.id === courseId);
    if (!c) return false;
    const modulesDone = (p.completedModules?.length ?? 0) >= (c.modules?.length ?? 0);
    const testPassed = p.testPassed === true;
    const examPassed = p.examPassed === true;
    return modulesDone && testPassed && examPassed;
  };

  const getCourseProgress = (courseId) => {
    const c = COURSES.find(x => x.id === courseId);
    if (!c) return { percent: 0, label: 'Not started' };
    const p = progress[courseId] || {};
    let steps = 0;
    const totalModules = c.modules?.length ?? 0;
    steps += (p.completedModules?.length ?? 0);
    if (p.testPassed) steps += 1;
    if (p.examPassed) steps += 1;
    const total = totalModules + 2; // modules + test + exam
    const percent = total ? Math.round((steps / total) * 100) : 0;
    let label = 'Not started';
    if (steps > 0) label = steps >= total ? 'Complete' : `${percent}%`;
    return { percent, label };
  };

  const markSectionViewed = (courseId, moduleIdx, sectionIdx) => {
    setProgress(prev => {
      const next = { ...prev };
      const key = `${moduleIdx}-${sectionIdx}`;
      next[courseId] = {
        ...next[courseId],
        completedModules: [...new Set([...(next[courseId]?.completedModules ?? []), key])],
      };
      return next;
    });
  };

  const getQuestionsForAssessment = () => {
    if (!course) return [];
    if (assessmentType === 'moduleQuiz' && course.moduleQuizzes?.[assessmentIndex]) return course.moduleQuizzes[assessmentIndex];
    if (assessmentType === 'test') return course.test || [];
    if (assessmentType === 'exam') return course.exam || [];
    return [];
  };

  const questions = getQuestionsForAssessment();
  const currentQ = questions[questionIndex];
  const totalQuestions = questions.length;
  const isLastQuestion = questionIndex >= totalQuestions - 1;

  const handleAnswer = (choiceIndex) => {
    const newAnswers = [...answers, choiceIndex];
    setAnswers(newAnswers);
    if (isLastQuestion) {
      const correct = questions.reduce((acc, q, i) => acc + (newAnswers[i] === q.answer ? 1 : 0), 0);
      const pct = totalQuestions ? Math.round((correct / totalQuestions) * 100) : 0;
      const passed = pct >= PASSING_PERCENT;

      setProgress(prev => {
        const next = { ...prev };
        next[selectedCourseId] = {
          ...next[selectedCourseId],
          ...(assessmentType === 'moduleQuiz' && { moduleQuizScores: { ...next[selectedCourseId]?.moduleQuizScores, [assessmentIndex]: pct } }),
          ...(assessmentType === 'test' && { testPassed: passed }),
          ...(assessmentType === 'exam' && { examPassed: passed, completedAt: new Date().toISOString() }),
        };
        return next;
      });

      if (passed && (assessmentType === 'test' || assessmentType === 'exam')) {
        awardXp(assessmentType === 'exam' ? 100 : 30);
      }
      setShowAssessmentResult(true);
    } else {
      setQuestionIndex(questionIndex + 1);
    }
  };

  const awardXp = async (amount) => {
    const newXp = xp + amount;
    setXp(newXp);
    try {
      if (profile?.id && supabase) {
        await supabase.from('profiles').update({ education_xp: newXp }).eq('id', profile.id);
      }
    } catch (e) {
      console.warn('Edu Lab: could not update XP', e);
    }
  };

  const exitAssessment = () => {
    setAssessmentType(null);
    setAssessmentIndex(0);
    setQuestionIndex(0);
    setAnswers([]);
    setShowAssessmentResult(false);
    setView('course');
  };

  const openCertificate = (courseId) => {
    setShowCertificateForCourseId(courseId);
  };

  const closeCertificate = () => {
    setShowCertificateForCourseId(null);
  };

  // ——— Certificate modal ———
  if (showCertificateForCourseId) {
    const certCourse = COURSES.find(c => c.id === showCertificateForCourseId);
    const studentName = profile?.full_name || profile?.username || 'Student';
    const completedAt = progress[showCertificateForCourseId]?.completedAt
      ? new Date(progress[showCertificateForCourseId].completedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center pb-3">
          <h2 className="text-2xl font-bold text-ink">Edu Lab certificate</h2>
          <button
            type="button"
            onClick={closeCertificate}
            className="inline-flex items-center rounded-lg border border-ink/20 bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-parchment-200"
          >
            Close
          </button>
        </div>
        <div
          className="max-w-2xl mx-auto rounded-2xl border border-amber-700/40 bg-[#fef9e7] p-6 shadow-lg print:shadow-none"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          <div className="text-center border border-amber-700/60 rounded-xl p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-amber-800 mb-2">Global Archaeology Hub · Edu Lab</p>
            <h3 className="text-2xl font-bold text-amber-900 mb-1">Certificate of completion</h3>
            <p className="text-sm text-amber-800/90 mb-6">This is to certify that</p>
            <p className="text-2xl font-bold text-amber-900 mb-6">{studentName}</p>
            <p className="text-sm text-amber-800/90 mb-2">has successfully completed the course</p>
            <p className="text-lg font-semibold text-amber-900 mb-6">{certCourse?.title}</p>
            <p className="text-xs text-amber-800/80">Completed on {completedAt}</p>
            <div className="mt-8 pt-4 border-t border-amber-700/40 flex justify-center gap-6">
              <button
                type="button"
                onClick={() => window.print()}
                className="text-sm font-medium text-amber-900 hover:text-amber-700"
              >
                Print certificate
              </button>
              <button
                type="button"
                onClick={closeCertificate}
                className="text-sm font-medium text-amber-900 hover:text-amber-700"
              >
                Back to Edu Lab
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ——— Assessment (quiz / test / exam) ———
  if (view === 'assessment' && questions.length > 0) {
    const correctCount = questions.reduce((acc, q, i) => acc + (answers[i] === q.answer ? 1 : 0), 0);
    const pct = Math.round((correctCount / totalQuestions) * 100);
    const passed = pct >= PASSING_PERCENT;
    const assessmentLabel = assessmentType === 'moduleQuiz' ? `Module ${assessmentIndex + 1} Quiz` : assessmentType === 'test' ? 'Mid-Course Test' : 'Final Exam';

    if (showAssessmentResult) {
      return (
        <div className="space-y-6">
          <div className="max-w-2xl mx-auto rounded-2xl border border-ink/10 bg-white p-8 shadow-xl">
            <div className="text-center space-y-5">
              <div className="inline-flex flex-col items-center justify-center rounded-xl bg-ink text-white px-6 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-200 mb-1">
                  {assessmentLabel}
                </div>
                <div className="text-4xl font-bold">{pct}%</div>
                <div className="text-xs font-medium mt-1">{passed ? 'Passed' : 'Not passed yet'}</div>
              </div>
              <p className="text-sm text-ink/70">
                {correctCount} of {totalQuestions} correct.{' '}
                {passed ? 'You can move on to the next step.' : `You need ${PASSING_PERCENT}% to pass — review the material and try again.`}
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                {!passed && (
                  <button
                    type="button"
                    onClick={() => { setQuestionIndex(0); setAnswers([]); setShowAssessmentResult(false); }}
                    className="inline-flex items-center rounded-lg border border-ink/20 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-parchment-200"
                  >
                    Retry assessment
                  </button>
                )}
                <button
                  type="button"
                  onClick={exitAssessment}
                  className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Back to course
                </button>
              </div>
              {assessmentType === 'exam' && passed && (
                <button
                  type="button"
                  onClick={() => { setShowCertificateForCourseId(selectedCourseId); setView('catalog'); setSelectedCourseId(null); }}
                  className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
                >
                  View certificate
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="max-w-2xl mx-auto rounded-2xl border border-ink/10 bg-white p-6 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-medium text-ink/70">
              {course?.shortTitle} · {assessmentLabel}
            </span>
            <span className="text-xs font-medium text-ink/70">
              Question {questionIndex + 1} of {totalQuestions}
            </span>
          </div>
          <div className="space-y-4 text-left">
            <h3 className="text-lg font-semibold text-ink leading-snug">{currentQ?.question}</h3>
            <div className="grid gap-3">
              {currentQ?.options?.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAnswer(idx)}
                  className="w-full rounded-xl border border-ink/15 bg-parchment-100 px-4 py-3 text-left text-sm font-medium text-ink hover:bg-ink hover:text-white transition-colors"
                >
                  {idx + 1}. {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ——— Inside course: module/section content (CCNA-style) ———
  if (view === 'course' && course) {
    const hasNextSection = currentModule?.sections?.[activeSectionIndex + 1];
    const hasNextModule = course.modules?.[activeModuleIndex + 1];
    const isLastSectionOfModule = !hasNextSection;
    const canTakeModuleQuiz = currentModule && course.moduleQuizzes?.[activeModuleIndex];
    const testPassed = progress[selectedCourseId]?.testPassed;
    const examPassed = progress[selectedCourseId]?.examPassed;
    const completed = isCourseComplete(selectedCourseId);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <button
              type="button"
              onClick={() => { setView('catalog'); setSelectedCourseId(null); }}
              className="text-sm font-medium text-ink/70 hover:text-ink hover:underline"
            >
              ← Back to courses
            </button>
            <h2 className="mt-1 text-2xl font-bold text-ink">{course.title}</h2>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-ink/10 bg-white px-4 py-2 shadow-sm">
            <span className="text-[11px] font-medium text-ink/60">Progress</span>
            <span className="text-lg font-semibold text-ink">{getCourseProgress(selectedCourseId).percent}%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar: modules (CCNA-style) */}
          <aside className="lg:col-span-4 xl:col-span-3 rounded-2xl border border-ink/10 bg-white p-4 max-h-[70vh] overflow-y-auto">
            <div className="text-[11px] font-medium text-ink/60 mb-3">Course content</div>
            {course.modules.map((mod, mi) => (
              <div key={mod.id} className="mb-4">
                <div className="text-sm font-semibold text-ink mb-1">
                  {mod.id} {mod.title}
                </div>
                <div className="pl-3 space-y-1">
                  {mod.sections.map((sec, si) => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => { setActiveModuleIndex(mi); setActiveSectionIndex(si); markSectionViewed(selectedCourseId, mi, si); }}
                      className={`block w-full rounded-lg border px-2 py-1.5 text-left text-xs font-medium transition-colors ${
                        activeModuleIndex === mi && activeSectionIndex === si
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                          : 'border-ink/10 bg-white hover:bg-parchment-100'
                      }`}
                    >
                      {sec.id} {sec.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {/* Assessments in sidebar */}
            <div className="mt-4 pt-4 border-t border-ink/10">
              <div className="text-[11px] font-medium text-ink/60 mb-2">Assessments</div>
              {course.moduleQuizzes?.map((_, qi) => (
                <button
                  key={qi}
                  type="button"
                  onClick={() => { setAssessmentType('moduleQuiz'); setAssessmentIndex(qi); setQuestionIndex(0); setAnswers([]); setShowAssessmentResult(false); setView('assessment'); }}
                  className="mb-1 block w-full rounded-lg border border-ink/10 bg-white px-2 py-2 text-left text-xs font-medium text-ink hover:bg-indigo-50"
                >
                  Module {qi + 1} quiz{' '}
                  {progress[selectedCourseId]?.moduleQuizScores?.[qi] != null
                    ? `(${progress[selectedCourseId].moduleQuizScores[qi]}%)`
                    : ''}
                </button>
              ))}
              <button
                type="button"
                onClick={() => { setAssessmentType('test'); setQuestionIndex(0); setAnswers([]); setShowAssessmentResult(false); setView('assessment'); }}
                className="mb-1 block w-full rounded-lg border border-ink/10 bg-white px-2 py-2 text-left text-xs font-medium text-ink hover:bg-indigo-50"
              >
                Mid‑course test {testPassed ? '✓' : ''}
              </button>
              <button
                type="button"
                onClick={() => { setAssessmentType('exam'); setQuestionIndex(0); setAnswers([]); setShowAssessmentResult(false); setView('assessment'); }}
                className="block w-full rounded-lg border border-ink/10 bg-white px-2 py-2 text-left text-xs font-medium text-ink hover:bg-indigo-50"
              >
                Final exam {examPassed ? '✓' : ''}
              </button>
            </div>
          </aside>

          {/* Main content */}
          <div className="lg:col-span-8 xl:col-span-9 rounded-2xl border border-ink/10 bg-white p-6 shadow-md">
            {currentSection ? (
              <>
                <div className="mb-5">
                  <span className="text-[11px] font-medium text-indigo-600">
                    {currentModule?.id} · {currentModule?.title}
                  </span>
                  <h3 className="mt-1 text-xl font-semibold text-ink">{currentSection.title}</h3>
                </div>
                <div className="text-sm text-ink/80 leading-relaxed">
                  <p>{currentSection.content}</p>
                </div>
                <div className="mt-6 pt-4 flex flex-wrap gap-3 border-t border-ink/10">
                  {hasNextSection && (
                    <button
                      type="button"
                      onClick={() => { setActiveSectionIndex(activeSectionIndex + 1); markSectionViewed(selectedCourseId, activeModuleIndex, activeSectionIndex + 1); }}
                      className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                      Next: {currentModule?.sections?.[activeSectionIndex + 1]?.title}
                    </button>
                  )}
                  {isLastSectionOfModule && hasNextModule && (
                    <button
                      type="button"
                      onClick={() => { setActiveModuleIndex(activeModuleIndex + 1); setActiveSectionIndex(0); }}
                      className="inline-flex items-center rounded-lg border border-ink/20 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-parchment-200"
                    >
                      Next module: {course.modules[activeModuleIndex + 1]?.title}
                    </button>
                  )}
                  {canTakeModuleQuiz && isLastSectionOfModule && (
                    <button
                      type="button"
                      onClick={() => { setAssessmentType('moduleQuiz'); setAssessmentIndex(activeModuleIndex); setQuestionIndex(0); setAnswers([]); setShowAssessmentResult(false); setView('assessment'); }}
                      className="inline-flex items-center rounded-lg border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
                    >
                      Check your understanding · module quiz
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-ink/60">Select a section from the sidebar to start reading.</p>
            )}

            {completed && (
              <div className="mt-6 rounded-xl border border-amber-400 bg-amber-50 px-4 py-4 text-center">
                <p className="font-semibold text-amber-900 mb-1">Course complete</p>
                <p className="text-sm text-amber-800 mb-3">
                  You have passed all modules, the test, and the final exam.
                </p>
                <button
                  type="button"
                  onClick={() => openCertificate(selectedCourseId)}
                  className="inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
                >
                  View certificate
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ——— Catalog (CCNA Academy–inspired: course cards with progress) ———
  return (
    <div className="space-y-6">
      {assistantOpen && (
        <AIAssistant
          profile={profile}
          embedded
          open
          onClose={() => setAssistantOpen(false)}
        />
      )}

      <div className="border-b-2 border-ink/10 pb-3 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-ink">Edu Lab</h2>
          <p className="mt-1 text-sm text-ink/70">
            Student lab for courses, dig sites, archives, and study tools.
          </p>
        </div>
        {profile && (
          <div className="rounded-xl bg-white border border-ink/10 px-4 py-2 shadow-sm text-right">
            <p className="text-[11px] font-medium text-ink/60">Signed in as</p>
            <p className="text-sm font-semibold text-ink">
              {profile.full_name || profile.username || 'Student'}
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="rounded-2xl border border-ink/10 bg-white shadow-sm p-1.5 flex flex-wrap gap-1">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'courses', label: 'Courses' },
          { id: 'archives', label: 'Archives' },
          { id: 'tools', label: 'Tools' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setCatalogTab(t.id)}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              catalogTab === t.id ? 'bg-parchment-200 text-ink border border-ink/10 shadow-sm' : 'text-ink/70 hover:bg-parchment-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {catalogTab === 'overview' && (
        <div className="rounded-3xl border border-ink/20 bg-white/80 shadow-[0_8px_24px_rgba(44,40,37,0.08)] p-4 md:p-6 space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/50">Student lab overview</p>
              <h3 className="mt-1 text-xl font-bold text-ink">Learning & field activity</h3>
            </div>
            {onNavigateToMap && (
              <button
                type="button"
                onClick={onNavigateToMap}
                className="inline-flex items-center rounded-2xl border border-ink/15 bg-parchment-200/60 px-4 py-2 text-sm font-medium text-ink hover:bg-parchment-200"
              >
                Open student map →
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-ink/10 bg-parchment-100/70 px-3 py-3">
              <p className="text-[10px] font-semibold text-ink/60 uppercase tracking-[0.16em]">Courses in progress</p>
              <p className="mt-1 text-2xl font-semibold text-ink">
                {COURSES.filter((c) => {
                  const { percent } = getCourseProgress(c.id);
                  return percent > 0 && percent < 100;
                }).length}
              </p>
            </div>
            <div className="rounded-2xl border border-ink/10 bg-parchment-100/70 px-3 py-3">
              <p className="text-[10px] font-semibold text-ink/60 uppercase tracking-[0.16em]">Courses completed</p>
              <p className="mt-1 text-2xl font-semibold text-ink">{COURSES.filter((c) => isCourseComplete(c.id)).length}</p>
            </div>
            <div className="rounded-2xl border border-ink/10 bg-parchment-100/70 px-3 py-3">
              <p className="text-[10px] font-semibold text-ink/60 uppercase tracking-[0.16em]">Student dig sites</p>
              <p className="mt-1 text-2xl font-semibold text-ink">{sitesLoading ? '–' : studentSites.length}</p>
            </div>
            <div className="rounded-2xl border border-ink/10 bg-parchment-100/70 px-3 py-3">
              <p className="text-[10px] font-semibold text-ink/60 uppercase tracking-[0.16em]">Archive entries</p>
              <p className="mt-1 text-2xl font-semibold text-ink">{archivesLoading ? '–' : studentArchives.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-ink/10 bg-parchment-100/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-ink">Student dig sites</h4>
                <button type="button" onClick={() => setCatalogTab('archives')} className="text-xs font-medium text-ink/60 hover:text-ink hover:underline">
                  View archives →
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {sitesLoading ? (
                  <p className="text-sm text-ink/50">Loading sites…</p>
                ) : studentSites.length === 0 ? (
                  <p className="text-sm text-ink/50">No student-visible sites yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {studentSites.slice(0, 5).map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/70 border border-ink/10 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-ink truncate" title={s.name}>{s.name}</p>
                          <p className="text-[10px] text-ink/50">{(s.region || '').replace(/_/g, ' ') || 'Region: n/a'}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-medium text-ink/70">{s.status || '—'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-ink/10 bg-parchment-100/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-ink">Declassified archives</h4>
                <button type="button" onClick={() => setCatalogTab('archives')} className="text-xs font-medium text-ink/60 hover:text-ink hover:underline">
                  Open →
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {archivesLoading ? (
                  <p className="text-sm text-ink/50">Loading archives…</p>
                ) : studentArchives.length === 0 ? (
                  <p className="text-sm text-ink/50">No declassified entries yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {studentArchives.slice(0, 5).map((e) => (
                      <li key={e.id} className="rounded-xl bg-white/80 border border-ink/10 px-3 py-2">
                        <p className="text-xs font-semibold text-ink truncate">{e.sites?.name || 'Unknown site'}</p>
                        <p className="text-[10px] text-ink/60 line-clamp-2 mt-0.5">{(e.findings || e.notes || 'No summary provided').toString()}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {catalogTab === 'courses' && (
        <div className="rounded-2xl bg-white p-4 md:p-6 shadow-md border border-ink/10 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-ink">Courses</h3>
            <p className="text-sm text-ink/60 mt-1">Finish a course to earn a completion certificate.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {COURSES.map(c => {
              const { percent, label } = getCourseProgress(c.id);
              const complete = isCourseComplete(c.id);
              return (
                <div key={c.id} className="rounded-2xl border border-ink/10 bg-parchment-100/60 hover:bg-parchment-100 transition-colors shadow-sm">
                  <div className="p-4 flex flex-col h-full">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className="text-[11px] font-medium text-ink/60">{c.duration}</span>
                      {complete && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">Certificate ready</span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-ink mb-1">{c.title}</h3>
                    <p className="mb-3 text-xs text-ink/70 line-clamp-3">{c.description}</p>
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full bg-ink/5 overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${percent}%` }} />
                      </div>
                      <span className="text-[11px] font-medium text-ink/70 shrink-0">{label}</span>
                    </div>
                    <div className="mt-auto space-y-2">
                      <button
                        type="button"
                        onClick={() => { setSelectedCourseId(c.id); setActiveModuleIndex(0); setActiveSectionIndex(0); setView('course'); }}
                        className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                      >
                        {complete ? 'Review course' : percent > 0 ? 'Continue course' : 'Start course'}
                      </button>
                      {complete && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openCertificate(c.id); }}
                          className="inline-flex w-full items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900 hover:bg-amber-100"
                        >
                          View certificate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {catalogTab === 'archives' && (
        <div className="rounded-2xl border border-ink/10 bg-white shadow-md p-4 md:p-6 space-y-4">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-lg font-semibold text-ink">Student archives</h3>
              <p className="text-sm text-ink/60 mt-1">Declassified records that are public or student-visible.</p>
            </div>
            <input
              value={archiveQuery}
              onChange={(e) => setArchiveQuery(e.target.value)}
              placeholder="Search archives…"
              className="min-h-[44px] w-full sm:w-72 rounded-xl border border-ink/15 bg-parchment-100/60 px-3 py-2 text-sm outline-none focus:border-ink/30"
            />
          </div>
          <div className="space-y-2">
            {archivesLoading ? (
              <p className="text-sm text-ink/50">Loading archives…</p>
            ) : studentArchives.length === 0 ? (
              <p className="text-sm text-ink/50">No declassified entries yet.</p>
            ) : (
              <ul className="space-y-2">
                {studentArchives
                  .filter((e) => {
                    const q = (archiveQuery || '').trim().toLowerCase();
                    if (!q) return true;
                    const site = (e.sites?.name || '').toLowerCase();
                    const f = (e.findings || '').toLowerCase();
                    const n = (e.notes || '').toLowerCase();
                    return site.includes(q) || f.includes(q) || n.includes(q);
                  })
                  .slice(0, 10)
                  .map((e) => (
                    <li key={e.id} className="rounded-2xl border border-ink/10 bg-parchment-100/50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">{e.sites?.name || 'Unknown site'}</p>
                          <p className="text-xs text-ink/60 mt-1 whitespace-pre-wrap">
                            {(e.findings || e.notes || 'No summary provided').toString()}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] text-ink/50">
                          {e.created_at ? new Date(e.created_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {catalogTab === 'tools' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-ink/10 bg-white shadow-md overflow-hidden">
              <div className="px-4 py-3 border-b border-ink/10">
                <p className="text-sm font-semibold text-ink">Study calendar</p>
                <p className="text-xs text-ink/60">Plan study days and course milestones.</p>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-ink/60 mb-1">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                    <div key={d}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {Array.from({ length: 28 }).map((_, idx) => {
                    const day = idx + 1;
                    const isWeekend = (idx % 7 === 5) || (idx % 7 === 6);
                    const isStudy = [2, 4, 8, 11, 15, 18, 22, 25].includes(day);
                    return (
                      <div
                        key={day}
                        className={`aspect-square flex items-center justify-center rounded-lg border text-[11px] ${
                          isStudy
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : isWeekend
                            ? 'border-ink/10 bg-parchment-100 text-ink/70'
                            : 'border-ink/10 bg-white text-ink/70'
                        }`}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-ink/10 bg-white shadow-md overflow-hidden">
              <div className="px-4 py-3 border-b border-ink/10">
                <p className="text-sm font-semibold text-ink">Notepad</p>
                <p className="text-xs text-ink/60">Saved locally for this account.</p>
              </div>
              <div className="p-4">
                <textarea
                  value={notepad}
                  onChange={(e) => setNotepad(e.target.value)}
                  rows={10}
                  placeholder="Write field notes, definitions, or study questions…"
                  className="w-full rounded-xl border border-ink/15 bg-parchment-100/60 px-3 py-3 text-sm text-ink placeholder-ink/40 outline-none focus:border-ink/30 resize-y min-h-[240px]"
                />
              </div>
            </div>
          </div>
          <div className="lg:col-span-7">
            <div className="space-y-3">
              <div className="rounded-2xl border border-ink/10 bg-white shadow-sm p-4">
                <p className="text-sm font-semibold text-ink">AI assistant</p>
                <p className="text-xs text-ink/60 mt-1">
                  Use the floating <span className="font-semibold">AI</span> button (bottom-left) from any tab, or chat here.
                </p>
                <button
                  type="button"
                  onClick={() => setAssistantOpen(true)}
                  className="mt-3 inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Open assistant
                </button>
              </div>
              <StudentAssistantCard profile={profile} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
