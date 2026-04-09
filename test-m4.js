const m4 = require('./m4')

async function test() {
  console.log('Testing M4 connection...')
  
  const result = await m4.calculateDriverScore(
    'fdb142fa-fdf5-4d1e-83ca-884b52870d2c'  // Suresh Babu
  )
  
  console.log('Result:', result)
}
// It probably looks like this:
const { data, error } = await supabase.rpc('calculate_driver_score', {
  p_driver_id: driverId
});

// Add this debug log:
console.log('data:', data, 'error:', error);
test()