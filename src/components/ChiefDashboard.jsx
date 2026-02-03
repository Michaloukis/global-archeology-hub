export default function ChiefDashboard({ profile }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border-t-8 border-red-600">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-red-100 rounded-full text-red-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-800">Command Center</h2>
      </div>
      <p className="text-xl text-gray-600 mb-8">
        Welcome, Commander. You are logged in as a <span className="font-bold text-red-600 uppercase">{profile?.role}</span>.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
          <h3 className="font-bold text-lg mb-2 text-gray-700">Strategic Oversight</h3>
          <p className="text-gray-600 text-sm">Reviewing global excavation progress and budget allocations.</p>
        </div>
        <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
          <h3 className="font-bold text-lg mb-2 text-gray-700">Personnel Management</h3>
          <p className="text-gray-600 text-sm">Approving field permits and archaeological licenses.</p>
        </div>
      </div>
    </div>
  )
}

