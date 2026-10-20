#!/bin/bash
# DMCFS Bulk Distribution - File Copy Script
# This script organizes all generated files into the correct project structure

#!/bin/bash
set -e

echo "🚀 DMCFS Bulk Distribution - Project Setup"
echo "==========================================="
echo ""

# Create directories
echo "📁 Creating project directories..."
mkdir -p src/lib
mkdir -p supabase/functions
mkdir -p .github/workflows
mkdir -p public

# Copy source files
echo "📄 Copying source files..."
cp dmcfs-bulk-app.tsx src/App.tsx
cp src-main.tsx src/main.tsx
cp src-index.css src/index.css
cp src-components.tsx src/components.tsx
cp src-hooks.ts src/hooks.ts
cp src-constants.ts src/constants.ts

# Copy library files
echo "📚 Copying library files..."
cp src-lib-supabase.ts src/lib/supabase.ts
cp src-lib-utils.ts src/lib/utils.ts
cp src-lib-errors.ts src/lib/errors.ts

# Copy configuration files
echo "⚙️  Copying configuration files..."
cp setup-package.json package.json
cp vite.config.ts vite.config.ts
cp tsconfig.json tsconfig.json
cp tsconfig.node.json tsconfig.node.json
cp tailwind.config.js tailwind.config.js
cp postcss.config.js postcss.config.js
cp index.html index.html

# Copy backend files
echo "🛠️  Copying backend files..."
mkdir -p supabase/functions/send-emails
cp database-schema.sql database-schema.sql

# Copy documentation
echo "📖 Copying documentation..."
cp README.md README.md
cp DEPLOYMENT.md DEPLOYMENT.md
cp DEV_GUIDE.md DEV_GUIDE.md
cp API_REFERENCE.md API_REFERENCE.md
cp PROJECT_FILES.md PROJECT_FILES.md
cp PROJECT_MANIFEST.md PROJECT_MANIFEST.md
cp COMPLETE.md COMPLETE.md

# Copy other files
echo "🔧 Copying other files..."
cp .env.example .env.example
cp .gitignore .gitignore
cp .github-workflows-ci.yml .github/workflows/ci.yml

echo ""
echo "✅ File organization complete!"
echo ""
echo "📋 Next steps:"
echo "1. npm install"
echo "2. cp .env.example .env.local"
echo "3. Edit .env.local with your credentials"
echo "4. npm run dev"
echo ""
echo "📚 Documentation:"
echo "- README.md: Get started"
echo "- DEV_GUIDE.md: Development"
echo "- DEPLOYMENT.md: Deploy to production"
echo "- API_REFERENCE.md: Function reference"
echo ""
echo "🎉 Setup complete! Happy coding!"
