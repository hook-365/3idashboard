export default function AppHeader() {
  return (
    <div className="bg-gray-900">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-5xl">☄️</span>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent">
                3I/ATLAS Comet Dashboard
              </h1>
              <p className="text-gray-400 text-sm italic mt-1">
                Tracking the third interstellar object visiting our solar system
              </p>
            </div>
          </div>
          <a
            href="https://buymeacoffee.com/anthonyhook"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-yellow-600/80 hover:bg-yellow-500/90 text-white text-sm font-medium px-3 py-1.5 rounded transition-colors border border-yellow-500/30"
          >
            <span className="text-base">☕</span>
            <span className="hidden sm:inline">Support</span>
          </a>
        </div>
      </div>
    </div>
  );
}