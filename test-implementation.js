// Test script to verify error bar implementation
console.log('Testing error bar implementation...');

// Test 1: Check data structure
fetch('/api/coma-data?dailyAverage=true&limit=5')
  .then(response => response.json())
  .then(data => {
    console.log('✓ API Data Test:');
    console.log(`  - Total points: ${data.data.raw.length}`);
    const pointsWithUncertainty = data.data.raw.filter(point => point.uncertainty);
    console.log(`  - Points with uncertainty: ${pointsWithUncertainty.length}`);

    if (pointsWithUncertainty.length > 0) {
      console.log(`  - Sample uncertainty: ${pointsWithUncertainty[0].uncertainty}`);
      console.log(`  - Uncertainty range: ${Math.min(...pointsWithUncertainty.map(p => p.uncertainty))} - ${Math.max(...pointsWithUncertainty.map(p => p.uncertainty))}`);
    }
  })
  .catch(err => console.error('✗ API Test failed:', err));

// Test 2: Check if Chart.js plugins are registered
if (typeof Chart !== 'undefined') {
  console.log('✓ Chart.js is loaded');
  console.log(`  - Registered plugins: ${Chart.registry.plugins.items.map(p => p.id).join(', ')}`);
} else {
  console.log('✗ Chart.js not loaded');
}

// Test 3: Check for error bar plugin
setTimeout(() => {
  const charts = Chart.instances;
  if (Object.keys(charts).length > 0) {
    console.log(`✓ Active charts: ${Object.keys(charts).length}`);

    Object.values(charts).forEach((chart, index) => {
      console.log(`  Chart ${index + 1}:`);
      console.log(`    - Type: ${chart.config.type}`);
      console.log(`    - Datasets: ${chart.data.datasets.length}`);
      console.log(`    - Dataset labels: ${chart.data.datasets.map(d => d.label).join(', ')}`);

      // Check for error bar datasets
      const errorBarDatasets = chart.data.datasets.filter(d =>
        d.label && (d.label.includes('Uncertainty') || d.label.includes('Error'))
      );
      console.log(`    - Error bar datasets: ${errorBarDatasets.length}`);
    });
  } else {
    console.log('✗ No active charts found');
  }
}, 2000);

console.log('Error bar test completed. Check browser console for results.');