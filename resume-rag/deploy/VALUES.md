# Deploy values (copy/paste-ready)

This file lists the exact environment variable keys and example placeholder values to paste into provider dashboards (Render for backend, Netlify/Vercel for frontend).

## Backend (Render) - environment variables

Key: MONGODB_URI
Value: mongodb+srv://yogesh:<PASSWORD_ENCODED>@resume-rag.zs7xaiw.mongodb.net/<DBNAME>?retryWrites=true&w=majority

Key: JWT_SECRET
Value: replace_with_a_strong_secret_here

Key: JWT_EXPIRES_IN
Value: 7d

Key: UPLOAD_PATH
Value: /tmp/uploads

Key: REDIS_URL
Value: (optional) redis://:password@redis-host:6379

Key: NODE_ENV
Value: production

## Frontend (Netlify or Vercel) - environment variables

Key: REACT_APP_API_URL
Value: https://<your-backend-domain>/api


## Notes
- Replace `<PASSWORD_ENCODED>` with your URL-encoded Atlas password.
- Do NOT commit real secrets to the repository. Use the provider's secret manager.
- For Netlify, set the Base directory to `frontend` and the Publish directory to `frontend/build`.
- For Vercel, set the Root Directory to `frontend` and the Build Command to `npm run build`.

*** End of file ***
