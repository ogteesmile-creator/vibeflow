/* VibeFlow PWA starter. Replace these two values with your existing Supabase project's URL and publishable/anon key. */
const SUPABASE_URL = "https://krvhdvfivudkxhasvfln.supabase.co";
const SUPABASE_KEY = "sb_publishable_ijJ8W24gnjDvfV05WXrZTQ_So-RwycV";
const VIDEO_BUCKET = "videos";

const $ = (id) => document.getElementById(id);
const authView = $("auth"), appView = $("app");
let supabaseClient = null, currentUser = null, installPrompt = null;

function toast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2800);
}
function message(id, text) { $(id).textContent = text || ""; }
function escapeHTML(value="") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function showApp(on) { authView.classList.toggle("hidden", on); appView.classList.toggle("hidden", !on); }
function showScreen(name) {
  document.querySelectorAll(".screen").forEach(el => el.classList.add("hidden"));
  const screen = $(name + "-screen"); if (screen) screen.classList.remove("hidden");
  document.querySelectorAll(".bottom-nav button").forEach(b => b.classList.toggle("active", b.dataset.screen === name));
  if (name === "feed") loadFeed();
  if (name === "profile") loadProfile();
}
function requireConfigured() {
  if (!window.supabase) throw new Error("Supabase library did not load. Check your internet connection.");
  if (SUPABASE_URL.includes("PASTE_") || SUPABASE_KEY.includes("PASTE_")) throw new Error("Add your Supabase project URL and publishable key in app.js first.");
  if (!supabaseClient) supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return supabaseClient;
}
async function ensureProfile(user) {
  const db = requireConfigured();
  const {data} = await db.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (!data) {
    const base = (user.email || "vibeflow_user").split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g,"").slice(0,20) || "vibeflow_user";
    const username = base + "_" + user.id.slice(0,5);
    const {error} = await db.from("profiles").insert({id:user.id, username});
    if (error && !String(error.message).includes("duplicate")) console.warn("Profile setup:", error.message);
  }
}
async function startApp(user) {
  currentUser = user; showApp(true); await ensureProfile(user); showScreen("feed");
}
async function loadFeed() {
  if (!currentUser) return;
  const db = requireConfigured(), feed = $("feed");
  feed.innerHTML = '<div class="empty">Loading videos…</div>';
  const {data, error} = await db.from("videos").select("id,user_id,video_url,caption,created_at").order("created_at",{ascending:false}).limit(30);
  if (error) { feed.innerHTML = `<div class="empty">${escapeHTML(error.message)}</div>`; return; }
  if (!data?.length) { feed.innerHTML = '<div class="empty">No videos yet. Be the first to share one!</div>'; return; }
  const userIds = [...new Set(data.map(v=>v.user_id))];
  const {data:profiles} = await db.from("profiles").select("id,username").in("id",userIds);
  const names = Object.fromEntries((profiles||[]).map(p=>[p.id,p.username]));
  feed.innerHTML = data.map(v => `<article class="video-card" data-video="${v.id}">
    <video src="${escapeHTML(v.video_url)}" controls playsinline preload="metadata"></video>
    <div class="video-overlay"><div class="video-caption"><b>@${escapeHTML(names[v.user_id]||"member")}</b><br>${escapeHTML(v.caption||"")}</div>
    <div class="video-actions"><button data-like="${v.id}" aria-label="Like video">♡ <span id="likes-${v.id}">Like</span></button><button data-comment="${v.id}">Comment</button></div></div></article>`).join("");
  for (const v of data) {
    const {count} = await db.from("likes").select("*",{count:"exact",head:true}).eq("video_id",v.id);
    const n = document.querySelector(`#likes-${v.id}`); if(n) n.textContent = count ?? 0;
  }
}
async function toggleLike(videoId) {
  const db=requireConfigured();
  const {data:existing,error:readError}=await db.from("likes").select("id").eq("video_id",videoId).eq("user_id",currentUser.id).maybeSingle();
  if(readError) return toast(readError.message);
  if(existing) { const {error}=await db.from("likes").delete().eq("id",existing.id); if(error) toast(error.message); }
  else { const {error}=await db.from("likes").insert({video_id:videoId,user_id:currentUser.id}); if(error) toast(error.message); }
  loadFeed();
}
async function commentPrompt(videoId) {
  const text = prompt("Write your comment (max 500 characters):"); if(!text?.trim()) return;
  const {error}=await requireConfigured().from("comments").insert({video_id:videoId,user_id:currentUser.id,comment_text:text.trim().slice(0,500)});
  toast(error ? error.message : "Comment posted.");
}
async function uploadVideo(event) {
  event.preventDefault(); const file=$("video-file").files[0], caption=$("caption").value.trim();
  if(!file) return;
  if(!file.type.startsWith("video/")) return message("upload-message","Choose a video file.");
  if(file.size > 100*1024*1024) return message("upload-message","This starter limits uploads to 100 MB. Choose a smaller video.");
  const db=requireConfigured(); message("upload-message","Uploading video…");
  const ext=(file.name.split(".").pop()||"mp4").toLowerCase().replace(/[^a-z0-9]/g,"") || "mp4";
  const path=`${currentUser.id}/${crypto.randomUUID()}.${ext}`;
  const {error:upErr}=await db.storage.from(VIDEO_BUCKET).upload(path,file,{contentType:file.type,upsert:false});
  if(upErr) return message("upload-message",upErr.message);
  const {data:urlData}=db.storage.from(VIDEO_BUCKET).getPublicUrl(path);
  const {error:rowErr}=await db.from("videos").insert({user_id:currentUser.id,video_url:urlData.publicUrl,caption});
  if(rowErr) { await db.storage.from(VIDEO_BUCKET).remove([path]); return message("upload-message",rowErr.message); }
  $("upload-form").reset(); message("upload-message","Your video is live!"); toast("Video posted."); showScreen("feed");
}
async function searchUsers(event) {
  event.preventDefault(); const q=$("search-input").value.trim();
  if(q.length<2) return $("search-results").innerHTML='<div class="empty">Enter at least two characters.</div>';
  const {data,error}=await requireConfigured().from("profiles").select("id,username,bio").ilike("username",`%${q}%`).limit(20);
  if(error) return $("search-results").textContent=error.message;
  $("search-results").innerHTML=(data||[]).filter(p=>p.id!==currentUser.id).map(p=>`<div class="user-result"><div><strong>@${escapeHTML(p.username)}</strong><small class="muted">${escapeHTML(p.bio||"")}</small></div><button class="small-btn" data-follow="${p.id}">Follow</button></div>`).join("") || '<div class="empty">No users found.</div>';
}
async function followUser(id) {
  const db=requireConfigured();
  const {error}=await db.from("follows").insert({follower_id:currentUser.id,following_id:id});
  toast(error ? (error.code==="23505"?"Already following this user.":error.message) : "Following!");
}
async function loadProfile() {
  if(!currentUser) return;
  const db=requireConfigured();
  const {data:p}=await db.from("profiles").select("username,bio").eq("id",currentUser.id).maybeSingle();
  $("profile-username").value=p?.username||""; $("profile-bio").value=p?.bio||"";
  const {data:videos,error}=await db.from("videos").select("video_url").eq("user_id",currentUser.id).order("created_at",{ascending:false}).limit(30);
  $("my-videos").innerHTML=error?`<p>${escapeHTML(error.message)}</p>`:(videos||[]).map(v=>`<video src="${escapeHTML(v.video_url)}" controls playsinline preload="metadata"></video>`).join("") || '<p class="muted">You have not posted any videos yet.</p>';
}
async function saveProfile() {
  const username=$("profile-username").value.trim().replace(/^@/,""), bio=$("profile-bio").value.trim();
  if(!/^[a-zA-Z0-9_]{3,30}$/.test(username)) return message("profile-message","Username must be 3–30 letters, numbers or underscores.");
  const {error}=await requireConfigured().from("profiles").upsert({id:currentUser.id,username,bio},{onConflict:"id"});
  message("profile-message",error?error.message:"Profile saved.");
}

$("auth-form").addEventListener("submit",async e=>{
  e.preventDefault(); try {
    const db=requireConfigured(),email=$("email").value.trim(),password=$("password").value;
    message("auth-message","Signing in…");
    const {data,error}=await db.auth.signInWithPassword({email,password});
    if(error) throw error; await startApp(data.user);
  } catch(err){message("auth-message",err.message||"Unable to sign in.");}
});
$("signup-btn").addEventListener("click",async()=>{
  try {
    const db=requireConfigured(),email=$("email").value.trim(),password=$("password").value;
    if(!email||password.length<6) return message("auth-message","Enter an email and a password of at least 6 characters.");
    message("auth-message","Creating account…");
    const {data,error}=await db.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}});
    if(error) throw error;
    if(data.session) await startApp(data.user); else message("auth-message","Account created. Check your email to confirm it, then log in.");
  } catch(err){message("auth-message",err.message||"Unable to create account.");}
});
$("reset-btn").addEventListener("click",async()=>{
  try {const email=$("email").value.trim();if(!email)return message("auth-message","Enter your email first.");const {error}=await requireConfigured().auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});if(error)throw error;message("auth-message","Password reset email sent. Check your inbox.");}
  catch(err){message("auth-message",err.message);}
});
$("logout-btn").addEventListener("click",async()=>{await requireConfigured().auth.signOut();currentUser=null;showApp(false);});
$("refresh-feed").addEventListener("click",loadFeed);
$("upload-form").addEventListener("submit",uploadVideo);
$("search-form").addEventListener("submit",searchUsers);
$("save-profile").addEventListener("click",saveProfile);
document.querySelector(".bottom-nav").addEventListener("click",e=>{const b=e.target.closest("button[data-screen]");if(b)showScreen(b.dataset.screen);});
$("feed").addEventListener("click",e=>{const like=e.target.closest("[data-like]"),comment=e.target.closest("[data-comment]");if(like)toggleLike(like.dataset.like);if(comment)commentPrompt(comment.dataset.comment);});
$("search-results").addEventListener("click",e=>{const b=e.target.closest("[data-follow]");if(b)followUser(b.dataset.follow);});

window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;$("install-btn").classList.remove("hidden");});
$("install-btn").addEventListener("click",async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$("install-btn").classList.add("hidden");});
if("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./sw.js").catch(console.warn);

(async()=>{
  try {
    const db=requireConfigured();
    const {data:{session}}=await db.auth.getSession();
    if(session?.user) await startApp(session.user);
  } catch(err) { message("auth-message",err.message||"Setup required."); }
})();
