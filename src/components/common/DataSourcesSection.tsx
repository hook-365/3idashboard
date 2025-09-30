export default function DataSourcesSection() {
  return (
    <div className="bg-gray-800 rounded-lg p-4 mt-8">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">📊 Data Sources & Attribution</h3>
      <div className="text-xs text-gray-400 space-y-2">
        <p>
          <strong className="text-blue-400">🔭 COBS Database</strong> (Community observations, brightness data • <a href="https://www.cobs.si" className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">cobs.si</a> • CC BY-NC-SA 4.0) •
          <strong className="text-green-400"> 🛰️ JPL Horizons</strong> (Orbital mechanics, position data • NASA/JPL • Public domain) •
          <strong className="text-purple-400"> 🌌 TheSkyLive</strong> (Real-time coordinates, visibility • theskylive.com)
        </p>
        <p>
          This dashboard aggregates data from multiple astronomical sources to provide comprehensive 3I/ATLAS tracking with intelligent fallback mechanisms. All source attributions are preserved in API responses.
        </p>
      </div>
    </div>
  );
}