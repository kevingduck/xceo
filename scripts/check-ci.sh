#!/bin/bash

echo "🔍 Checking CI/CD readiness..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall status
OVERALL_STATUS=0

# Function to check command result
check_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2 passed${NC}"
    else
        echo -e "${RED}❌ $2 failed${NC}"
        OVERALL_STATUS=1
    fi
}

# Check if .env.test exists
echo "📋 Checking environment setup..."
if [ -f ".env.test" ]; then
    cp .env.test .env
    echo -e "${GREEN}✅ Environment file configured${NC}"
else
    echo -e "${RED}❌ .env.test file missing${NC}"
    OVERALL_STATUS=1
fi

# Check TypeScript
echo ""
echo "📋 Running TypeScript type check..."
npm run check > /dev/null 2>&1
check_result $? "TypeScript type checking"

# Check if database is accessible
echo ""
echo "📋 Checking database connection..."
if command -v psql &> /dev/null; then
    psql postgresql://postgres:postgres@localhost:5432/xceo_test -c '\q' > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database connection successful${NC}"
    else
        echo -e "${YELLOW}⚠️  Database not accessible (this is normal if not running locally)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  psql not installed, skipping database check${NC}"
fi

# Run frontend tests
echo ""
echo "📋 Running frontend tests..."
npm run test:run -- --reporter=verbose > test-frontend.log 2>&1
FRONTEND_STATUS=$?
if [ $FRONTEND_STATUS -ne 0 ]; then
    echo -e "${RED}❌ Frontend tests failed. Check test-frontend.log for details${NC}"
    echo "Last 10 lines of error:"
    tail -10 test-frontend.log
    OVERALL_STATUS=1
else
    echo -e "${GREEN}✅ Frontend tests passed${NC}"
    rm test-frontend.log
fi

# Run backend tests
echo ""
echo "📋 Running backend tests..."
npm run test:server:run -- --reporter=verbose > test-backend.log 2>&1
BACKEND_STATUS=$?
if [ $BACKEND_STATUS -ne 0 ]; then
    echo -e "${RED}❌ Backend tests failed. Check test-backend.log for details${NC}"
    echo "Last 10 lines of error:"
    tail -10 test-backend.log
    OVERALL_STATUS=1
else
    echo -e "${GREEN}✅ Backend tests passed${NC}"
    rm test-backend.log
fi

# Try to build
echo ""
echo "📋 Running build..."
npm run build > build.log 2>&1
BUILD_STATUS=$?
if [ $BUILD_STATUS -ne 0 ]; then
    echo -e "${RED}❌ Build failed. Check build.log for details${NC}"
    echo "Last 10 lines of error:"
    tail -10 build.log
    OVERALL_STATUS=1
else
    echo -e "${GREEN}✅ Build successful${NC}"
    rm build.log
fi

# Security audit
echo ""
echo "📋 Running security audit..."
npm audit --audit-level high > audit.log 2>&1
AUDIT_STATUS=$?
if [ $AUDIT_STATUS -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Security vulnerabilities found. Check audit.log for details${NC}"
else
    echo -e "${GREEN}✅ No high-severity vulnerabilities${NC}"
    rm audit.log
fi

# Summary
echo ""
echo "======================================"
if [ $OVERALL_STATUS -eq 0 ]; then
    echo -e "${GREEN}✅ All CI checks passed!${NC}"
    echo "Your code is ready for CI/CD"
else
    echo -e "${RED}❌ Some CI checks failed${NC}"
    echo "Please fix the issues above before pushing"
    echo ""
    echo "Tips:"
    echo "- For TypeScript errors: Run 'npm run check' to see detailed errors"
    echo "- For test failures: Check the generated log files"
    echo "- For build failures: Check build.log for details"
fi

exit $OVERALL_STATUS