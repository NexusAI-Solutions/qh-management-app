# Checken errors
yarn lint

# Dev mode
yarn run dev

# DB types opnieuw genereren
npx supabase gen types typescript --project-id xlrzbfnheqpszgtyhdkh > src/lib/supabase/types.ts

# Channel credential management
http://localhost:3000/api/channel/1/credentials
{
  "api_key": "as",
  "api_secret": "as"
}

# Authenticatie 
## Vanuit front-end
Niet nodig, cookies wordne gecheckt in backend API via middleware.ts
