import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const EducationZone = ({ profile }) => {
  const [activeModule, setActiveModule] = useState(null); // 'quiz' or 'records'
  const [xp, setXp] = useState(profile?.education_xp || 0);
  
  // Archive/Records State
  const [records, setRecords] = useState([]);
  const [isRecordsLoading, setIsRecordsLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Quiz State
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowScore] = useState(false);
  const [isXpUpdating, setIsXpUpdating] = useState(false);

  const stratigraphyQuiz = [
    {
      title: "The Law of Superposition",
      question: "In an undisturbed sequence of rocks, where is the oldest layer located?",
      options: ["At the top", "In the middle", "At the bottom", "It depends on the soil type"],
      answer: 2, // At the bottom
      fact: "Oldest layers are deposited first, and newer layers accumulate on top of them!"
    },
    {
      title: "Context and Association",
      question: "An artifact found within a specific soil layer is considered to be...",
      options: ["Older than the layer", "Younger than the layer", "Contemporary with the layer", "Unrelated to the layer"],
      answer: 2, // Contemporary
      fact: "This is the principle of association—items found together in the same context are likely from the same time period."
    },
    {
      title: "Relative vs Absolute Dating",
      question: "Which of these is an example of 'Relative Dating'?",
      options: ["Carbon-14 Testing", "Stratigraphic Analysis", "Dendrochronology", "Potassium-Argon Dating"],
      answer: 1, // Stratigraphic Analysis
      fact: "Stratigraphy tells us if something is older or younger than something else, but not its exact calendar age."
    }
  ];

  const handleAnswer = async (index) => {
    if (index === stratigraphyQuiz[currentQuestion].answer) {
      setScore(score + 1);
    }

    const nextQuestion = currentQuestion + 1;
    if (nextQuestion < stratigraphyQuiz.length) {
      setCurrentQuestion(nextQuestion);
    } else {
      setShowScore(true);
      if (score + (index === stratigraphyQuiz[currentQuestion].answer ? 1 : 0) === stratigraphyQuiz.length) {
        await awardXp(50);
      }
    }
  };

  const awardXp = async (amount) => {
    setIsXpUpdating(true);
    const newXp = xp + amount;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ education_xp: newXp })
        .eq('id', profile.id);

      if (error) throw error;
      setXp(newXp);
    } catch (error) {
      console.error('Error awarding XP:', error);
    } finally {
      setIsXpUpdating(false);
    }
  };

  const fetchRecords = async () => {
    setIsRecordsLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_journals')
        .select(`
          *,
          sites (name)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching declassified records:', error);
    } finally {
      setIsRecordsLoading(false);
    }
  };

  useEffect(() => {
    if (activeModule === 'records') {
      fetchRecords();
    }
  }, [activeModule]);

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setScore(0);
    setShowScore(false);
  };

  return (
    <div className="space-y-12">
      {/* Header & Stats */}
      <div className="border-b-4 border-black pb-6 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter italic text-indigo-600 text-left">EDU LAB // ACADEMIC PORTAL</h2>
          <p className="text-[10px] font-black text-gray-400 mt-2 uppercase tracking-widest text-left">Academic Clearance: Student Tier 1</p>
        </div>
        <div className="bg-indigo-600 text-white p-4 border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] text-right">
          <div className="text-[8px] font-black uppercase tracking-widest opacity-80">Accumulated Experience</div>
          <div className="text-2xl font-black italic">{xp} XP</div>
        </div>
      </div>

      {!activeModule ? (
        /* Module Selection */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div 
            onClick={() => setActiveModule('quiz')}
            className="border-2 border-black p-8 bg-white hover:bg-indigo-50 cursor-pointer group transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 bg-indigo-600 text-white px-2 py-1 text-[8px] font-black uppercase">+50 XP AVAILABLE</div>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 block text-left">SIMULATION_01</span>
            <h3 className="text-2xl font-black uppercase mt-2 group-hover:underline text-left">Stratigraphy Quiz</h3>
            <p className="text-xs font-bold text-gray-500 mt-4 uppercase text-left">Master the laws of soil layers and chronological dating.</p>
          </div>

          <div className="border-2 border-black p-8 bg-gray-100 opacity-50 cursor-not-allowed text-left">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">SIMULATION_02</span>
            <h3 className="text-2xl font-black uppercase mt-2">Ceramic Typology</h3>
            <p className="text-xs font-bold text-gray-500 mt-4 uppercase">Classification of pottery shards. [LOCKED]</p>
          </div>

          <div 
            onClick={() => setActiveModule('records')}
            className="border-2 border-black p-8 bg-white hover:bg-indigo-50 cursor-pointer group transition-all relative overflow-hidden text-left"
          >
            <div className="absolute top-0 right-0 bg-black text-white px-2 py-1 text-[8px] font-black uppercase">PUBLIC_ACCESS_V1</div>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">DATA_ARCHIVE</span>
            <h3 className="text-2xl font-black uppercase mt-2 group-hover:underline">Field Records</h3>
            <p className="text-xs font-bold text-gray-500 mt-4 uppercase">Read declassified field journals from active digs.</p>
          </div>
        </div>
      ) : activeModule === 'quiz' ? (
        /* Quiz Interface */
        <div className="max-w-2xl mx-auto border-4 border-black bg-white p-10 shadow-[12px_12px_0px_rgba(79,70,229,0.2)]">
          <div className="flex justify-between items-center mb-10 border-b-2 border-black pb-4">
            <span className="text-xs font-black uppercase text-indigo-600">Module: Stratigraphy Analysis</span>
            <button 
              onClick={() => setActiveModule(null)}
              className="text-[10px] font-black uppercase hover:underline"
            >
              EXIT_TO_MENU [X]
            </button>
          </div>

          {!showResult ? (
            <div className="space-y-8">
              <div className="space-y-2 text-left">
                <span className="text-[10px] font-black text-gray-400 uppercase">Question {currentQuestion + 1} of {stratigraphyQuiz.length}</span>
                <h3 className="text-2xl font-black uppercase leading-tight italic">{stratigraphyQuiz[currentQuestion].question}</h3>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {stratigraphyQuiz[currentQuestion].options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    className="w-full border-2 border-black p-4 text-left font-bold uppercase text-xs hover:bg-black hover:text-white transition-all flex justify-between items-center group"
                  >
                    <span>{idx + 1}. {option}</span>
                    <span className="opacity-0 group-hover:opacity-100 text-[8px] font-black">SELECT_OPTION</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center space-y-8 py-10">
              <div className="inline-block bg-black text-white p-6">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 text-indigo-400">FINAL_EVALUATION</div>
                <div className="text-6xl font-black italic">{Math.round((score / stratigraphyQuiz.length) * 100)}%</div>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-2xl font-black uppercase tracking-tight">
                  {score === stratigraphyQuiz.length 
                    ? "EXCEPTIONAL ACCURACY. XP AWARDED." 
                    : "EVALUATION COMPLETE. REVIEW DATA."}
                </h4>
                <p className="text-xs font-bold text-gray-500 uppercase px-10">
                  {score === stratigraphyQuiz.length 
                    ? "You have demonstrated a mastery of stratigraphic principles. Your profile has been credited with 50 XP."
                    : `You identified ${score} out of ${stratigraphyQuiz.length} correctly. Review the field facts and retry for maximum XP.`}
                </p>
              </div>

              <div className="flex gap-4 justify-center pt-6">
                <button 
                  onClick={resetQuiz}
                  className="border-2 border-black px-6 py-3 text-xs font-black uppercase hover:bg-gray-100"
                >
                  RETRY_SIMULATION
                </button>
                <button 
                  onClick={() => setActiveModule(null)}
                  className="bg-black text-white px-6 py-3 text-xs font-black uppercase hover:bg-indigo-600 transition-all"
                >
                  RETURN_TO_PORTAL
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Declassified Records Interface */
        <div className="space-y-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter">Declassified Field Archives</h3>
            <button 
              onClick={() => { setActiveModule(null); setSelectedRecord(null); }}
              className="text-[10px] font-black uppercase hover:underline border-2 border-black px-3 py-1 bg-white"
            >
              CLOSE_ARCHIVE [X]
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Index List */}
            <div className="lg:col-span-1 space-y-4 max-h-[600px] overflow-y-auto pr-2">
              <div className="bg-black text-white p-3 text-[10px] font-black uppercase tracking-widest">Available Dispatches</div>
              {isRecordsLoading ? (
                <div className="p-10 text-center font-black uppercase text-[10px] animate-pulse">Syncing archives...</div>
              ) : records.length === 0 ? (
                <div className="p-10 border-2 border-black border-dashed text-center font-black uppercase text-[10px] text-gray-400">No public dispatches found.</div>
              ) : (
                records.map(record => (
                  <div 
                    key={record.id} 
                    onClick={() => setSelectedRecord(record)}
                    className={`border-2 border-black p-4 cursor-pointer hover:bg-indigo-50 transition-all ${selectedRecord?.id === record.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 border ${selectedRecord?.id === record.id ? 'border-white bg-indigo-500' : 'border-black bg-gray-100'}`}>
                        {record.sites?.name}
                      </span>
                      <span className="text-[7px] font-black opacity-50">{new Date(record.created_at).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-black uppercase text-xs truncate">{record.findings || 'SITE DISPATCH'}</h4>
                  </div>
                ))
              )}
            </div>

            {/* Content Viewer */}
            <div className="lg:col-span-2 border-4 border-black bg-white min-h-[500px] p-8 shadow-[12px_12px_0px_rgba(0,0,0,0.1)]">
              {!selectedRecord ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30 p-20">
                  <div className="w-16 h-16 border-4 border-black rounded-full flex items-center justify-center font-black text-2xl">?</div>
                  <p className="font-black uppercase text-[10px] tracking-widest">Select a dispatch from the index to begin analysis.</p>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="border-b-2 border-black pb-4 flex justify-between items-end">
                    <div>
                      <span className="text-[8px] font-black text-indigo-500 uppercase">DOCUMENT_REF: ID_{selectedRecord.id}</span>
                      <h4 className="text-3xl font-black uppercase italic tracking-tighter mt-1">{selectedRecord.sites?.name}</h4>
                    </div>
                    <div className="text-right">
                      <div className="text-[8px] font-black uppercase text-gray-400">Timestamped Dispatch</div>
                      <div className="text-[10px] font-black uppercase">{new Date(selectedRecord.created_at).toLocaleString()}</div>
                    </div>
                  </div>

                  {selectedRecord.image_url && (
                    <div className="border-4 border-black bg-gray-100 overflow-hidden group">
                      <img 
                        src={selectedRecord.image_url} 
                        alt="Field dispatch" 
                        className="w-full h-80 object-cover grayscale hover:grayscale-0 transition-all"
                      />
                    </div>
                  )}

                  <div className="space-y-6">
                    <div>
                      <span className="bg-black text-white px-2 py-0.5 text-[8px] font-black uppercase">Field Findings:</span>
                      <p className="mt-3 text-xl font-black uppercase leading-tight italic text-indigo-600">
                        "{selectedRecord.findings || 'NO TEXT SUMMARY PROVIDED'}"
                      </p>
                    </div>

                    {selectedRecord.notes && (
                      <div className="bg-gray-50 border-2 border-black p-4 border-dashed">
                        <span className="text-[8px] font-black text-gray-400 uppercase block mb-2">Observations (Declassified):</span>
                        <p className="text-xs font-bold uppercase leading-relaxed text-gray-600">
                          {selectedRecord.notes}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-4 pt-4 border-t border-gray-100">
                      {selectedRecord.mapping_data && (
                        <button 
                          onClick={() => window.open(selectedRecord.mapping_data, '_blank')}
                          className="bg-indigo-600 text-white px-4 py-2 text-[10px] font-black uppercase hover:bg-black transition-all flex items-center gap-2"
                        >
                          Access 3D Mapping Data [↗]
                        </button>
                      )}
                      <button 
                        onClick={() => window.print()} 
                        className="border-2 border-black px-4 py-2 text-[10px] font-black uppercase hover:bg-gray-100 transition-all"
                      >
                        Print for Dossier
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EducationZone;


