#!/bin/bash

# Local CI Test Script
# Full validation including unit tests and integration tests

set -e

echo "🚀 Running Local CI Tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Linting
echo "📋 Step 1/6: Running Linter..."
bun run lint
echo "✅ Linting passed"
echo ""

# 2. Type Checking
echo "🔍 Step 2/6: Running Type Check..."
bun run typecheck
echo "✅ Type checking passed"
echo ""

# 3. Unit & Integration Tests with Coverage
echo "🧪 Step 3/6: Running Test Suite with Coverage..."
bun run test:coverage
echo "✅ All tests passed"
echo ""

# 4. Build
echo "🔨 Step 4/6: Building Project..."
bun run build
echo "✅ Build completed"
echo ""

# 5. Test Profile Manager
echo "🧪 Step 5/6: Testing Profile Manager..."
bun run profiles list > /dev/null
echo "✅ Profile manager working"
echo ""

# 6. Test User-Guided Login Service (smoke test)
echo "🎯 Step 6/6: Testing User-Guided Login System..."
node -e "
import { UserGuidedLoginService } from './dist/infrastructure/browser/user-guided-login.service.js';
const service = new UserGuidedLoginService();
const profiles = await service.listSavedProfiles();
console.log(\`Found \${profiles.length} saved profile(s)\`);
await service.cleanup();
"
echo "✅ User-Guided Login system working"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All Local CI Tests Passed!"
echo ""
echo "📊 Summary:"
echo "   ✅ Linting: PASSED"
echo "   ✅ Type Checking: PASSED"
echo "   ✅ Tests: PASSED"
echo "   ✅ Build: PASSED"
echo "   ✅ Profile Manager: PASSED"
echo "   ✅ User-Guided Login: PASSED"
echo ""
echo "🎉 Ready for deployment!"