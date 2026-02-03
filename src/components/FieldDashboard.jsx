export default function FieldDashboard({ profile }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border-t-8 border-amber-600">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-amber-100 rounded-full text-amber-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-800">Field Operations</h2>
      </div>
      <p className="text-xl text-gray-600 mb-8">
        Reports coming in from the trenches. You are logged in as a <span className="font-bold text-amber-600 uppercase">{profile?.role}</span>.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
          <h3 className="font-bold text-lg mb-2 text-gray-700">Site Log</h3>
          <p className="text-gray-600 text-sm">Recording stratigraphy and artifact coordinates in real-time.</p>
        </div>
        <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
          <h3 className="font-bold text-lg mb-2 text-gray-700">Equipment Status</h3>
          <p className="text-gray-600 text-sm">Monitoring drone surveys and ground-penetrating radar data.</p>
        </div>
      </div>
    </div>
  )
}

