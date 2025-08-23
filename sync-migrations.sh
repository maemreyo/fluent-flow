#!/bin/bash

echo "🔄 Syncing Supabase migrations from remote..."

# Step 1: Link to your remote Supabase project
echo "📡 Linking to remote project..."
npx supabase link --project-ref fxawystovhtbuqhllswl

# Step 2: Pull all migrations from remote
echo "⬇️  Pulling migrations from remote database..."
npx supabase db pull

# Step 3: Generate updated TypeScript types
echo "🔄 Generating TypeScript types..."
npx supabase gen types typescript --project-id fxawystovhtbuqhllswl > lib/supabase/types.ts

# Step 4: Show status
echo "✅ Migration sync complete!"
echo "📁 Check the supabase/migrations/ folder for new migration files"
echo "📝 TypeScript types updated in lib/supabase/types.ts"

echo ""
echo "Next steps:"
echo "1. Review the downloaded migrations in supabase/migrations/"
echo "2. Run 'pnpm typecheck' to verify TypeScript types"
echo "3. Test your application to ensure everything works"