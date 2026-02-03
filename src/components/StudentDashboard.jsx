export default function StudentDashboard({ profile }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border-t-8 border-emerald-600">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.168.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.168.477-4.5 1.253" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-800">Learning Portal</h2>
      </div>
      <p className="text-xl text-gray-600 mb-8">
        The library is open. You are logged in as a <span className="font-bold text-emerald-600 uppercase">{profile?.role}</span>.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
          <h3 className="font-bold text-lg mb-2 text-gray-700">Research Archives</h3>
          <p className="text-gray-600 text-sm">Accessing digitized manuscripts and excavation reports.</p>
        </div>
        <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
          <h3 className="font-bold text-lg mb-2 text-gray-700">Open Lectures</h3>
          <p className="text-gray-600 text-sm">Watching live seminars from site leads around the world.</p>
        </div>
      </div>
    </div>
  )
}

