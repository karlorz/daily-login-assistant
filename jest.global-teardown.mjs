// Global teardown for Jest tests
export default async () => {
  console.log('🧹 Cleaning up Jest environment...');

  // Wait a moment for any remaining async operations
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('✅ Jest global teardown complete');
};