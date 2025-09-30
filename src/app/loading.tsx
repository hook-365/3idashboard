export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-pulse text-6xl mb-6">☄️</div>
        <div className="text-2xl font-semibold mb-2">Loading...</div>
        <div className="mt-4">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-cyan-400 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}