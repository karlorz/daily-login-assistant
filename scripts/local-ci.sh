#!/bin/bash

# Local CI Test Script
# Quick validation of core functionality without long-running integration tests

set -e

echo "🚀 Running Local CI Tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Linting
echo "📋 Step 1/5: Running Linter..."
bun run lint
echo "✅ Linting passed"
echo ""

# 2. Type Checking
echo "🔍 Step 2/5: Running Type Check..."
bun run typecheck
echo "✅ Type checking passed"
echo ""

# 3. Build
echo "🔨 Step 3/5: Building Project..."
bun run build
echo "✅ Build completed"
echo ""

# 4. Test Profile Manager
echo "🧪 Step 4/5: Testing Profile Manager..."
bun run profiles list > /dev/null
echo "✅ Profile manager working"
echo ""

# 5. Test User-Guided Login Service (smoke test)
echo "🎯 Step 5/5: Testing User-Guided Login System..."
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
echo "   ✅ Build: PASSED"
echo "   ✅ Profile Manager: PASSED"
echo "   ✅ User-Guided Login: PASSED"
echo ""
echo "🎉 Ready for deployment!"