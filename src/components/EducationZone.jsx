import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const EducationZone = ({ profile }) => {
  const [activeModule, setActiveModule] = useState(null); // 'quiz' or 'records'
  const [xp, setXp] = useState(profile?.education_xp || 0);
  
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

          <div className="border-2 border-black p-8 bg-gray-100 opacity-50 cursor-not-allowed text-left">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">DATA_ARCHIVE</span>
            <h3 className="text-2xl font-black uppercase mt-2">Field Records</h3>
            <p className="text-xs font-bold text-gray-500 mt-4 uppercase">Read declassified field journals. [COMING SOON]</p>
          </div>
        </div>
      ) : (
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
      )}
    </div>
  );
};

export default EducationZone;

