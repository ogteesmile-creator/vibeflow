VIBEFLOW — INSTALLABLE WEB APP STARTER

This package is the first runnable PWA foundation for VibeFlow. It is not yet a finished, production-ready TikTok replacement. It includes account login/signup, feed, video upload, likes, comments, username search, follow action, profile editing, PWA manifest and service worker.

1. KEEP YOUR OLD CODEPEN PROJECT AS A BACKUP.
2. Create a new folder/repository for this project and upload ALL files, keeping the folders:
   index.html
   styles.css
   app.js
   manifest.webmanifest
   sw.js
   icons/icon.svg
3. In app.js, replace:
   PASTE_YOUR_EXISTING_SUPABASE_PROJECT_URL_HERE
   PASTE_YOUR_EXISTING_SUPABASE_PUBLISHABLE_KEY_HERE
   with your existing Supabase Project URL and publishable (or legacy anon) key.
   Never put a service_role/secret key in browser code.
4. Supabase requirements:
   - Auth email/password enabled.
   - Public Storage bucket named "videos".
   - Tables: profiles, videos, likes, comments, follows as described in the supplied schema file.
   - Enable RLS and policies. Do not disable RLS.
5. Deploy the folder to an HTTPS static host (for example, a static hosting provider). CodePen preview alone is not the final PWA install URL.
6. Open the HTTPS URL on Android Chrome and choose Install app / Add to Home screen.
   On iPhone, open the URL in Safari > Share > Add to Home Screen.
7. Test with two accounts and small test videos before sharing widely.

IMPORTANT LIMITATIONS BEFORE PUBLIC LAUNCH:
- The app currently has no production moderation/report/block/appeal workflow, no secure friend-request or direct-message implementation, no account deletion workflow, no realtime messaging, and no ad network integration.
- Legal pages are starter text and need your real operator contact details and legal review.
- Add proper image icons in PNG sizes for broad compatibility before public launch.
- Review Supabase Storage limits, database RLS and upload policies. The app assumes the "videos" bucket allows public reads and authenticated uploads only into a folder named with the user's auth UUID.
- A PWA can be installed from a website but is not identical to a native store app. Browser capabilities differ by device.
- Do not advertise it as fully secure or production-ready until security, privacy, moderation and device testing are complete.
