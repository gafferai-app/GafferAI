import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase ───────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "https://xjesiuerxrnmopeaevyk.supabase.co";
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Constants ──────────────────────────────────────────────────────────────
const SPORTS      = ["⚽ Football","🏉 Rugby Union","🏉 Rugby League","🏐 Netball","🏑 Hockey","🏏 Cricket","🏀 Basketball","🏃 Athletics","🎾 Tennis","🏐 Volleyball"];
const AGE_GROUPS  = ["U6s","U7s","U8s","U9s","U10s","U11s","U12s","U13s","U14s","U15s","U16s","U18s","Adults","Mixed Age"];
const LEVELS      = ["🌱 Beginner","📈 Developing","⚡ Intermediate","🔥 Advanced","🏆 Elite"];
const DURATIONS   = ["⏱ 30 mins","⏱ 45 mins","⏱ 60 mins","⏱ 75 mins","⏱ 90 mins","⏱ 2 hours"];
const FOCUS_AREAS = ["🎯 Passing & Movement","🥅 Shooting & Finishing","🛡 Defending","📐 Set Pieces","💪 Fitness","🤝 Teamwork","⚽ Ball Control","🧠 Game Understanding"];
const PLATFORMS   = ["📸 Instagram","👥 Facebook","🐦 X (Twitter)","🌐 All Platforms"];
const POST_TYPES  = ["🏆 Match Result","📅 Training Reminder","⭐ Player Spotlight","📆 Upcoming Fixture","📢 Club Announcement"];
const POSITIONS   = {
  Football: ["GK","RB","CB","CB","LB","RM","CM","CM","LW","ST","ST"],
  Netball:  ["GS","GA","WA","C","WD","GD","GK"],
  default:  ["P1","P2","P3","P4","P5","P6","P7","P8","P9","P10","P11"],
};

const TOOLS = [
  { id:"training",    emoji:"🗂️", label:"Training Session", tagline:"Full drill-by-drill session plan", color:"#22d3ee" },
  { id:"matchreport", emoji:"📰", label:"Match Report",      tagline:"Pro write-up ready to publish",   color:"#4ade80" },
  { id:"feedback",    emoji:"⭐", label:"Player Feedback",   tagline:"Personalised player assessment",  color:"#fbbf24" },
  { id:"social",      emoji:"📲", label:"Social Media",      tagline:"Posts for every platform",        color:"#f472b6" },
  { id:"newsletter",  emoji:"✉️", label:"Parent Newsletter", tagline:"Weekly update in one click",      color:"#a78bfa" },
  { id:"drills",      emoji:"⚙️", label:"Drill Builder",     tagline:"Create and save custom drills",   color:"#fb923c" },
  { id:"teamsheet",   emoji:"📋", label:"Team Sheet",        tagline:"Build and save your lineup",      color:"#34d399" },
];

// ── API calls ──────────────────────────────────────────────────────────────
const callClaude = async (prompt) => {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content.map(b => b.text || "").join("");
};

const startCheckout = async (plan, userId, email) => {
  const res = await fetch("/api/create-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan, userId, email }),
  });
  const data = await res.json();
  if (data.url) window.location.href = data.url;
  else throw new Error(data.error || "Checkout failed");
};

// ── Prompt builder ─────────────────────────────────────────────────────────
const clean = s => (s || "").replace(/^[^\w]+/, "").trim();
const buildPrompt = (toolId, f) => {
  switch (toolId) {
    case "training":
      return `Create a detailed ${clean(f.duration)} ${clean(f.sport)} training session for ${f.ageGroup} at ${clean(f.level)} level. Focus: ${clean(f.focus)}.${f.sessionType === "individual" ? ` This is a 1-on-1 session for ${f.playerName} who plays ${f.playerPosition}.` : ""} Include warmup, 3 main drills with setup and coaching points, a game scenario, and cool-down. Make it practical and immediately usable.`;
    case "matchreport":
      return `Write a professional 220-word ${clean(f.sport)} match report. ${f.homeTeam} ${f.homeScore}-${f.awayScore} ${f.awayTeam}. Scorers: ${f.scorers || "N/A"}. Highlights: ${f.highlights || "competitive match"}. Include an invented manager quote. Upbeat community tone.`;
    case "feedback":
      return `Write 180-word player feedback for ${f.playerName}, ${f.position}, ${f.ageGroup} ${clean(f.sport)}. Strengths: ${f.strengths}. Improve: ${f.improvements}. Use sections: Overall Assessment, Key Strengths, Development Areas, Goals for Next Month, Coach's Message. Warm and professional.`;
    case "social":
      return `Create ${clean(f.platform)} social media content for a ${clean(f.sport)} club. Post type: ${clean(f.postType)}. Club: ${f.clubName || "the club"}. Details: ${f.highlights || "general post"}. ${f.platform?.includes("Twitter") ? "Under 280 characters." : "120-160 words with emojis and hashtags."}`;
    case "newsletter":
      return `Write a 220-word weekly parent newsletter for ${f.clubName || "the club"} ${f.ageGroup} ${clean(f.sport)}. Highlights: ${f.weekHighlights}. Fixtures: ${f.upcomingFixtures || "TBC"}. Include player of the week, training reminder, and coach's note.`;
    default: return "";
  }
};

// ── Validation ─────────────────────────────────────────────────────────────
const canGenerate = (toolId, inputs) => {
  switch (toolId) {
    case "training":    return !!(inputs.sport && inputs.ageGroup && inputs.level && inputs.duration && inputs.focus);
    case "matchreport": return !!(inputs.sport && inputs.homeTeam && inputs.awayTeam && inputs.homeScore !== "" && inputs.awayScore !== "");
    case "feedback":    return !!(inputs.sport && inputs.ageGroup && inputs.playerName && inputs.position && inputs.strengths && inputs.improvements);
    case "social":      return !!(inputs.sport && inputs.platform && inputs.postType);
    case "newsletter":  return !!(inputs.sport && inputs.ageGroup && inputs.weekHighlights);
    default:            return false;
  }
};

// ── Shared input styles ────────────────────────────────────────────────────
const IS = { width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.05)", color:"#f1f5f9", fontFamily:"'Barlow',sans-serif", fontSize:14, outline:"none", boxSizing:"border-box" };
const fo = e => e.target.style.borderColor = "rgba(255,255,255,0.3)";
const bl = e => e.target.style.borderColor = "rgba(255,255,255,0.1)";

function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#94a3b8", letterSpacing:"1.2px", textTransform:"uppercase", marginBottom:6 }}>
        {label}{required && <span style={{ color:"#f472b6", marginLeft:3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}
const Inp = ({ value, onChange, placeholder }) => <input value={value||""} onChange={onChange} placeholder={placeholder} style={IS} onFocus={fo} onBlur={bl}/>;
const Sel = ({ value, onChange, options, placeholder }) =>
  <select value={value||""} onChange={onChange} style={{...IS, cursor:"pointer"}} onFocus={fo} onBlur={bl}>
    <option value="" disabled>{placeholder}</option>
    {options.map(o => <option key={o} value={o} style={{background:"#1e293b"}}>{o}</option>)}
  </select>;
const Txt = ({ value, onChange, placeholder, rows=3 }) =>
  <textarea value={value||""} onChange={onChange} placeholder={placeholder} rows={rows} style={{...IS, resize:"vertical", lineHeight:1.6}} onFocus={fo} onBlur={bl}/>;

// ── Auth ───────────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode,     setMode]     = useState("login");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const submit = async () => {
    if (!email || !password) { setError("Please fill in both fields"); return; }
    setLoading(true); setError("");
    try {
      if (mode === "signup") {
        const { data, error: e } = await supabase.auth.signUp({ email, password });
        if (e) throw e;
        if (data.user) {
          await supabase.from("profiles").insert({ id:data.user.id, email, generations_used:0, generations_limit:5, plan:"free", created_at:new Date().toISOString() });
          onAuth(data.user);
        } else {
          setError("Check your email to confirm your account, then log in.");
        }
      } else {
        const { data, error: e } = await supabase.auth.signInWithPassword({ email, password });
        if (e) throw e;
        if (data.user) onAuth(data.user);
      }
    } catch (e) { setError(e.message || "Something went wrong"); }
    setLoading(false);
  };

  const sendReset = async () => {
    if (!email) { setError("Please enter your email address first"); return; }
    setLoading(true); setError("");
    try {
      const { error: e } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://gaffer-ai-eight.vercel.app"
      });
      if (e) throw e;
      setResetSent(true);
    } catch (e) { setError(e.message || "Could not send reset email"); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:20, background:"#0a0f14" }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:48, fontWeight:900, color:"#f1f5f9" }}>⚽ Gaffer<span style={{ color:"#4ade80" }}>AI</span></div>
          <div style={{ fontSize:14, color:"#64748b", marginTop:8 }}>🧠 AI toolkit for grassroots coaches</div>
        </div>
        <div style={{ background:"#16202b", border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, padding:28 }}>
          {showReset ? (
            <div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:800, textTransform:"uppercase", color:"#f1f5f9", marginBottom:16 }}>Reset Password</div>
              {resetSent ? (
                <div style={{ textAlign:"center", padding:"20px 0" }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>📧</div>
                  <div style={{ fontWeight:700, color:"#4ade80", marginBottom:8 }}>Email sent!</div>
                  <div style={{ fontSize:13, color:"#64748b" }}>Check your inbox for a password reset link.</div>
                  <button onClick={() => { setShowReset(false); setResetSent(false); }}
                    style={{ marginTop:16, padding:"10px 20px", borderRadius:8, border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:"#94a3b8", fontFamily:"'Barlow',sans-serif", fontSize:14, cursor:"pointer" }}>
                    Back to Login
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize:13, color:"#64748b", marginBottom:16 }}>Enter your email and we will send you a reset link.</div>
                  <Field label="📧 Email"><Inp value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com"/></Field>
                  {error && <div style={{ color:"#f87171", fontSize:13, marginBottom:12, padding:"8px 12px", background:"rgba(248,113,113,0.06)", borderRadius:6 }}>⚠️ {error}</div>}
                  <button onClick={sendReset} disabled={loading}
                    style={{ width:"100%", padding:13, borderRadius:8, border:"none", background:"linear-gradient(135deg,#16a34a,#4ade80)", color:"#052e16", fontFamily:"'Barlow Condensed',sans-serif", fontSize:17, fontWeight:800, textTransform:"uppercase", letterSpacing:1, cursor:"pointer", marginTop:8, opacity:loading?0.7:1 }}>
                    {loading ? "Sending..." : "Send Reset Link"}
                  </button>
                  <button onClick={() => { setShowReset(false); setError(""); }}
                    style={{ width:"100%", padding:10, borderRadius:8, border:"none", background:"transparent", color:"#64748b", fontFamily:"'Barlow',sans-serif", fontSize:13, cursor:"pointer", marginTop:8 }}>
                    Back to Login
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ display:"flex", marginBottom:20, background:"rgba(255,255,255,0.04)", borderRadius:8, padding:4 }}>
                {["login","signup"].map(m =>
                  <button key={m} onClick={() => { setMode(m); setError(""); }}
                    style={{ flex:1, padding:8, borderRadius:6, border:"none", background:mode===m?"#1c2a38":"transparent", color:mode===m?"#f1f5f9":"#64748b", fontFamily:"'Barlow',sans-serif", fontSize:14, fontWeight:600, cursor:"pointer" }}>
                    {m === "login" ? "🔑 Log In" : "✨ Sign Up"}
                  </button>
                )}
              </div>
              <Field label="📧 Email"><Inp value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com"/></Field>
              <Field label="🔒 Password">
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="........" style={IS} onFocus={fo} onBlur={bl}/>
              </Field>
              {mode === "login" && (
                <div style={{ textAlign:"right", marginBottom:8, marginTop:-6 }}>
                  <button onClick={() => { setShowReset(true); setError(""); }}
                    style={{ background:"none", border:"none", color:"#4ade80", fontSize:12, cursor:"pointer", padding:0 }}>
                    Forgot password?
                  </button>
                </div>
              )}
              {error && <div style={{ color:"#f87171", fontSize:13, marginBottom:12, padding:"8px 12px", background:"rgba(248,113,113,0.06)", borderRadius:6 }}>⚠️ {error}</div>}
              <button onClick={submit} disabled={loading}
                style={{ width:"100%", padding:13, borderRadius:8, border:"none", background:"linear-gradient(135deg,#16a34a,#4ade80)", color:"#052e16", fontFamily:"'Barlow Condensed',sans-serif", fontSize:17, fontWeight:800, textTransform:"uppercase", letterSpacing:1, cursor:loading?"not-allowed":"pointer", marginTop:8, opacity:loading?0.7:1 }}>
                {loading ? "Please wait..." : mode==="login" ? "Log In" : "Create Account"}
              </button>
              {mode==="signup"&&<div style={{ fontSize:12, color:"#475569", textAlign:"center", marginTop:14 }}>🎁 Free plan: 5 AI generations per month</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Gen counter ────────────────────────────────────────────────────────────
function GenCounter({ used, limit, plan }) {
  const remaining = Math.max(0, limit-used);
  const pct   = Math.min(100, (used/limit)*100);
  const color = remaining===0?"#f87171":remaining<=3?"#fbbf24":"#4ade80";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 12px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8 }}>
      <div style={{ flex:1, minWidth:100 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
          <span style={{ fontSize:10, fontWeight:700, color:"#64748b", letterSpacing:"1px", textTransform:"uppercase" }}>⚡ Generations</span>
          <span style={{ fontSize:11, fontWeight:700, color }}>{remaining} left</span>
        </div>
        <div style={{ height:3, background:"rgba(255,255,255,0.08)", borderRadius:2, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:2 }}/>
        </div>
      </div>
      <div style={{ fontSize:10, color:"#64748b", textAlign:"center" }}>
        <div style={{ fontWeight:700, color:"#4ade80" }}>{plan==="pro"?"⭐ Pro":plan==="trial"?"🎯 Trial":"🆓 Free"}</div>
        <div>{used}/{limit}</div>
      </div>
    </div>
  );
}

// ── Upgrade modal with real Stripe ─────────────────────────────────────────
function UpgradeModal({ onClose, user, profile }) {
  const [loading, setLoading] = useState(null);
  const [error,   setError]   = useState("");

  const handleUpgrade = async (plan) => {
    if (!user) return;
    setLoading(plan); setError("");
    try {
      await startCheckout(plan, user.id, user.email);
    } catch (e) {
      setError(e.message || "Something went wrong");
      setLoading(null);
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(8px)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ width:"100%", maxWidth:480, background:"#111820", border:"1px solid rgba(255,255,255,0.12)", borderRadius:20, padding:32 }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>⚡</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:26, fontWeight:900, textTransform:"uppercase", marginBottom:8 }}>Unlock More Generations</div>
          <div style={{ fontSize:14, color:"#64748b" }}>Choose a plan to keep generating content</div>
        </div>
        {error && <div style={{ color:"#f87171", fontSize:13, marginBottom:16, padding:"8px 12px", background:"rgba(248,113,113,0.06)", borderRadius:6, textAlign:"center" }}>⚠️ {error}</div>}
        <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:20 }}>
          {/* Starter */}
          <div style={{ padding:20, borderRadius:12, border:"2px solid #f59e0b", background:"rgba(245,158,11,0.08)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:800, color:"#f59e0b", textTransform:"uppercase" }}>🚀 Starter Week</div>
                <div style={{ fontSize:13, color:"#94a3b8", marginTop:2 }}>✅ 10 generations · 📅 First week only · 💳 One-time</div>
              </div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:32, fontWeight:900, color:"#f59e0b" }}>£1</div>
            </div>
            <button onClick={() => handleUpgrade("starter")} disabled={!!loading}
              style={{ width:"100%", padding:11, borderRadius:8, border:"none", background:loading==="starter"?"#92400e":"linear-gradient(135deg,#d97706,#f59e0b)", color:"#fff", fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:800, textTransform:"uppercase", letterSpacing:1, cursor:loading?"not-allowed":"pointer" }}>
              {loading==="starter" ? "⏳ Redirecting…" : "💳 Get Starter Week — £1"}
            </button>
          </div>
          {/* Pro */}
          <div style={{ padding:20, borderRadius:12, border:"2px solid #4ade80", background:"rgba(74,222,128,0.08)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:800, color:"#4ade80", textTransform:"uppercase" }}>⭐ Pro Plan</div>
                <div style={{ fontSize:13, color:"#94a3b8", marginTop:2 }}>✅ 35 generations/month · 🔄 Cancel anytime · 🏆 Best value</div>
              </div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:32, fontWeight:900, color:"#4ade80" }}>£4.99<span style={{ fontSize:14, fontWeight:400 }}>/mo</span></div>
            </div>
            <button onClick={() => handleUpgrade("pro")} disabled={!!loading}
              style={{ width:"100%", padding:11, borderRadius:8, border:"none", background:loading==="pro"?"#14532d":"linear-gradient(135deg,#16a34a,#4ade80)", color:"#052e16", fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:800, textTransform:"uppercase", letterSpacing:1, cursor:loading?"not-allowed":"pointer" }}>
              {loading==="pro" ? "⏳ Redirecting…" : "⭐ Get Pro Plan — £4.99/mo"}
            </button>
          </div>
          <div style={{ fontSize:11, color:"#334155", textAlign:"center" }}>🔒 Secure payment via Stripe · No card stored on our servers</div>
        </div>
        <button onClick={onClose} style={{ width:"100%", padding:12, borderRadius:8, border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:"#64748b", fontFamily:"'Barlow',sans-serif", fontSize:14, cursor:"pointer" }}>
          Maybe later
        </button>
      </div>
    </div>
  );
}

// ── Success banner after Stripe redirect ───────────────────────────────────
function SuccessBanner({ plan, onClose }) {
  return (
    <div style={{ background:"linear-gradient(135deg,#14532d,#16a34a)", borderBottom:"1px solid #4ade80", padding:"12px 24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:700, color:"#f0fdf4" }}>
        🎉 {plan==="pro" ? "Welcome to Pro! You now have 35 generations/month." : "Starter Week activated! You have 10 generations."}
      </div>
      <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#86efac", fontSize:18, cursor:"pointer" }}>✕</button>
    </div>
  );
}

// ── Drill Builder ──────────────────────────────────────────────────────────
function DrillBuilder({ userId, showToast }) {
  const [drills,  setDrills]  = useState([]);
  const [form,    setForm]    = useState({ name:"", sport:"", description:"", duration:"", players:"", equipment:"" });
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(true);
  const setF = (k,v) => setForm(p=>({...p,[k]:v}));

  const loadDrills = async () => {
    setLoading(true);
    const { data } = await supabase.from("drills").select("*").eq("user_id",userId).order("created_at",{ascending:false});
    setDrills(data||[]); setLoading(false);
  };
  useEffect(()=>{ loadDrills(); },[userId]); // eslint-disable-line

  const saveDrill = async () => {
    if (!form.name||!form.sport) return;
    setSaving(true);
    await supabase.from("drills").insert({ user_id:userId, name:form.name, sport:form.sport, description:form.description, duration:form.duration, players_needed:form.players, equipment:form.equipment, created_at:new Date().toISOString() });
    showToast("✅ Drill saved!");
    setForm({ name:"", sport:"", description:"", duration:"", players:"", equipment:"" });
    loadDrills(); setSaving(false);
  };
  const deleteDrill = async (id) => { await supabase.from("drills").delete().eq("id",id); loadDrills(); };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, alignItems:"start", paddingTop:40 }}>
      <div>
        <div style={{ marginBottom:24 }}>
          <span style={{ fontSize:32 }}>⚙️</span>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:32, fontWeight:900, textTransform:"uppercase", color:"#fb923c", marginTop:8 }}>Drill Builder</div>
          <div style={{ fontSize:14, color:"#64748b", marginTop:4 }}>🛠 Create and save your own drills</div>
        </div>
        <div style={{ background:"#16202b", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:24 }}>
          <Field label="🏷 Drill Name" required><Inp value={form.name} onChange={e=>setF("name",e.target.value)} placeholder="e.g. Rondo 4v2"/></Field>
          <Field label="🏅 Sport" required><Sel value={form.sport} onChange={e=>setF("sport",e.target.value)} options={SPORTS} placeholder="Select sport"/></Field>
          <Field label="📝 Description"><Txt value={form.description} onChange={e=>setF("description",e.target.value)} placeholder="Setup and instructions…" rows={4}/></Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="⏱ Duration"><Inp value={form.duration} onChange={e=>setF("duration",e.target.value)} placeholder="e.g. 10 mins"/></Field>
            <Field label="👥 Players"><Inp value={form.players} onChange={e=>setF("players",e.target.value)} placeholder="e.g. 8-12"/></Field>
          </div>
          <Field label="🎽 Equipment"><Inp value={form.equipment} onChange={e=>setF("equipment",e.target.value)} placeholder="e.g. Bibs, cones, 1 ball"/></Field>
          <button onClick={saveDrill} disabled={saving||!form.name||!form.sport}
            style={{ width:"100%", padding:14, borderRadius:8, border:"none", background:form.name&&form.sport?"linear-gradient(135deg,#ea580c,#fb923c)":"#1c2a38", color:form.name&&form.sport?"#fff":"#64748b", fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:800, textTransform:"uppercase", letterSpacing:1, cursor:form.name&&form.sport?"pointer":"not-allowed", marginTop:8 }}>
            {saving?"⏳ Saving…":"✅ Save Drill"}
          </button>
        </div>
      </div>
      <div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:800, textTransform:"uppercase", color:"#94a3b8", letterSpacing:1, marginBottom:16 }}>📚 Saved Drills</div>
        {loading ? <div style={{ color:"#64748b", fontSize:14 }}>⏳ Loading…</div>
          : drills.length===0 ? <div style={{ color:"#64748b", fontSize:14, textAlign:"center", padding:32, border:"1px dashed rgba(255,255,255,0.1)", borderRadius:12 }}>🏗 No drills yet — create your first!</div>
          : <div style={{ display:"flex", flexDirection:"column", gap:10, maxHeight:500, overflowY:"auto" }}>
              {drills.map(d=>(
                <div key={d.id} style={{ background:"#16202b", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:15, color:"#f1f5f9" }}>⚙️ {d.name}</div>
                      <div style={{ fontSize:12, color:"#fb923c", marginTop:2 }}>{d.sport}{d.duration&&` · ⏱ ${d.duration}`}</div>
                    </div>
                    <button onClick={()=>deleteDrill(d.id)} style={{ background:"transparent", border:"1px solid rgba(248,113,113,0.3)", color:"#f87171", borderRadius:6, padding:"4px 10px", fontSize:12, cursor:"pointer" }}>🗑 Delete</button>
                  </div>
                  {d.description&&<div style={{ fontSize:13, color:"#94a3b8", lineHeight:1.6 }}>{d.description}</div>}
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );
}

// ── Team Sheet ─────────────────────────────────────────────────────────────
function TeamSheet({ userId, showToast }) {
  const [sheets,          setSheets]          = useState([]);
  const [sport,           setSport]           = useState("Football");
  const [sheetName,       setSheetName]       = useState("");
  const [formation,       setFormation]       = useState("4-4-2");
  const [customFormation, setCustomFormation] = useState("");
  const [players,         setPlayers]         = useState([]);
  const [notes,           setNotes]           = useState("");
  const [saving,          setSaving]          = useState(false);
  const [loading,         setLoading]         = useState(true);
  const [viewing,         setViewing]         = useState(null);

  const FORMATIONS = ["4-4-2","4-3-3","4-2-3-1","3-5-2","5-3-2","4-5-1","3-4-3","Custom"];

  const parseFormation = (f) => {
    if (!f || f === "Custom") return [];
    const nums = f.split("-").map(Number);
    if (nums.some(isNaN) || nums.length < 2) return [];
    const positions = ["GK"];
    const lineNames = ["DEF","MID","ATT","FWD","WG"];
    nums.forEach((count, li) => {
      const lineName = lineNames[li] || ("L" + (li+1));
      for (let i = 1; i <= count; i++) {
        positions.push(count === 1 ? lineName : (lineName + i));
      }
    });
    return positions;
  };

  const activeFormation = formation === "Custom" ? customFormation : formation;
  const positions = parseFormation(activeFormation);

  const loadSheets = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("team_sheets").select("*").eq("user_id",userId).order("created_at",{ascending:false});
    if (error) console.error("loadSheets:", error.message);
    setSheets(data||[]); setLoading(false);
  };
  useEffect(()=>{ loadSheets(); },[userId]); // eslint-disable-line

  useEffect(()=>{ setPlayers(Array(positions.length).fill("")); },[formation, customFormation]); // eslint-disable-line

  const saveSheet = async () => {
    if (!sheetName) return;
    setSaving(true);
    const { error } = await supabase.from("team_sheets").insert({
      user_id:userId, name:sheetName, sport,
      formation:activeFormation, players:JSON.stringify(players),
      notes, created_at:new Date().toISOString()
    });
    if (error) { showToast("Error saving sheet"); setSaving(false); return; }
    showToast("Team sheet saved!");
    setSheetName(""); setNotes("");
    setPlayers(Array(positions.length).fill(""));
    loadSheets(); setSaving(false);
  };

  const deleteSheet = async (id) => {
    await supabase.from("team_sheets").delete().eq("id",id);
    loadSheets(); if(viewing?.id===id) setViewing(null);
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, alignItems:"start", paddingTop:40 }}>
      <div>
        <div style={{ marginBottom:24 }}>
          <span style={{ fontSize:32 }}>📋</span>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:32, fontWeight:900, textTransform:"uppercase", color:"#34d399", marginTop:8 }}>Team Sheet</div>
          <div style={{ fontSize:14, color:"#64748b", marginTop:4 }}>Build and save your lineups</div>
        </div>
        <div style={{ background:"#16202b", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:24 }}>
          <Field label="Sheet Name" required><Inp value={sheetName} onChange={e=>setSheetName(e.target.value)} placeholder="e.g. U12s vs Town FC - Sat"/></Field>
          <Field label="Sport"><Sel value={sport} onChange={e=>setSport(e.target.value)} options={["Football","Rugby Union","Rugby League","Netball","Hockey","Cricket","Basketball","Athletics","Tennis","Volleyball"]} placeholder="Sport"/></Field>
          <Field label="Formation">
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, marginBottom:formation==="Custom"?10:0 }}>
              {FORMATIONS.map(f=>(
                <button key={f} onClick={()=>setFormation(f)}
                  style={{ padding:"8px 4px", borderRadius:6, border:"1.5px solid " + (formation===f?"#34d399":"rgba(255,255,255,0.1)"), background:formation===f?"rgba(52,211,153,0.1)":"rgba(255,255,255,0.05)", color:formation===f?"#34d399":"#94a3b8", fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                  {f}
                </button>
              ))}
            </div>
            {formation==="Custom" && (
              <input value={customFormation} onChange={e=>setCustomFormation(e.target.value)}
                placeholder="e.g. 4-1-2-1-2" style={{...IS, marginTop:6}} onFocus={fo} onBlur={bl}/>
            )}
          </Field>
          {positions.length > 0 && (
            <div style={{ marginBottom:14, padding:12, background:"rgba(52,211,153,0.05)", border:"1px solid rgba(52,211,153,0.1)", borderRadius:8 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#34d399", letterSpacing:"1px", textTransform:"uppercase", marginBottom:8 }}>
                {activeFormation} - {positions.length} players
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                {positions.map((pos,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:"#34d399", width:60, flexShrink:0, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:1, textTransform:"uppercase" }}>{pos}</span>
                    <input value={players[i]||""} onChange={e=>{const p=[...players];p[i]=e.target.value;setPlayers(p);}}
                      placeholder="Player name" style={{...IS,padding:"7px 10px",fontSize:13}} onFocus={fo} onBlur={bl}/>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Field label="Notes"><Txt value={notes} onChange={e=>setNotes(e.target.value)} placeholder="e.g. Jamie captain, press high..." rows={2}/></Field>
          <button onClick={saveSheet} disabled={saving||!sheetName}
            style={{ width:"100%", padding:14, borderRadius:8, border:"none", background:sheetName?"linear-gradient(135deg,#059669,#34d399)":"#1c2a38", color:sheetName?"#052e16":"#64748b", fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:800, textTransform:"uppercase", letterSpacing:1, cursor:sheetName?"pointer":"not-allowed", marginTop:8 }}>
            {saving?"Saving...":"Save Team Sheet"}
          </button>
        </div>
      </div>
      <div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:800, textTransform:"uppercase", color:"#94a3b8", letterSpacing:1, marginBottom:16 }}>Saved Sheets</div>
        {loading ? <div style={{ color:"#64748b", fontSize:14 }}>Loading...</div>
          : sheets.length===0 ? <div style={{ color:"#64748b", fontSize:14, textAlign:"center", padding:32, border:"1px dashed rgba(255,255,255,0.1)", borderRadius:12 }}>No sheets yet!</div>
          : <div style={{ display:"flex", flexDirection:"column", gap:10, maxHeight:600, overflowY:"auto" }}>
              {sheets.map(s=>(
                <div key={s.id} style={{ background:"#16202b", border:"1px solid " + (viewing?.id===s.id?"#34d399":"rgba(255,255,255,0.08)"), borderRadius:12, padding:16, cursor:"pointer" }} onClick={()=>setViewing(viewing?.id===s.id?null:s)}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:15, color:"#f1f5f9" }}>{s.name}</div>
                      <div style={{ fontSize:12, color:"#34d399", marginTop:2 }}>{s.sport}{s.formation ? " - " + s.formation : ""}</div>
                    </div>
                    <button onClick={e=>{e.stopPropagation();deleteSheet(s.id);}} style={{ background:"transparent", border:"1px solid rgba(248,113,113,0.3)", color:"#f87171", borderRadius:6, padding:"4px 10px", fontSize:12, cursor:"pointer" }}>Delete</button>
                  </div>
                  {viewing?.id===s.id&&<SheetDetail sheet={s}/>}
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );
}

function SheetDetail({ sheet }) {
  try {
    const ps=JSON.parse(sheet.players); const poss=POSITIONS[sheet.sport]||POSITIONS.default;
    return (
      <div style={{ marginTop:10, borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:10 }}>
        {ps.map((name,i)=>name&&<div key={i} style={{ display:"flex", gap:12, padding:"3px 0", fontSize:13 }}><span style={{ color:"#34d399", fontWeight:700, width:110, fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, textTransform:"uppercase" }}>{poss[i]}</span><span style={{ color:"#f1f5f9" }}>👤 {name}</span></div>)}
        {sheet.notes&&<div style={{ fontSize:12, color:"#64748b", marginTop:6 }}>📝 {sheet.notes}</div>}
      </div>
    );
  } catch { return null; }
}

// ── Reviews ────────────────────────────────────────────────────────────────
function ReviewsPage({ user, profile, showToast }) {
  const [reviews,     setReviews]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [form,        setForm]        = useState({ name:"", club:"", rating:5, review:"" });
  const [saving,      setSaving]      = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const isPaid = profile?.plan === "pro" || profile?.plan === "trial";

  const loadReviews = async () => {
    setLoading(true);
    const { data } = await supabase.from("reviews").select("*").order("created_at", { ascending:false });
    setReviews(data || []);
    if (user) {
      const mine = (data || []).find(r => r.user_id === user.id);
      if (mine) setHasReviewed(true);
    }
    setLoading(false);
  };

  useEffect(() => { loadReviews(); }, []); // eslint-disable-line

  const submitReview = async () => {
    if (!form.name || !form.review) return;
    setSaving(true);
    const { error } = await supabase.from("reviews").insert({
      user_id:user.id, name:form.name, club:form.club,
      rating:form.rating, review:form.review,
      created_at:new Date().toISOString()
    });
    if (error) { showToast("Error submitting review"); setSaving(false); return; }
    showToast("Review submitted! Thank you!");
    setHasReviewed(true);
    setForm({ name:"", club:"", rating:5, review:"" });
    loadReviews();
    setSaving(false);
  };

  const avgRating = reviews.length ? (reviews.reduce((a,r) => a + r.rating, 0) / reviews.length).toFixed(1) : null;

  return (
    <div style={{ maxWidth:800, margin:"0 auto", paddingTop:40 }}>
      <div style={{ textAlign:"center", marginBottom:40 }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:48, fontWeight:900, textTransform:"uppercase", color:"#f1f5f9", marginBottom:8 }}>
          What Coaches Say
        </div>
        {avgRating && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            <span style={{ fontSize:28, color:"#fbbf24" }}>{"*".repeat(Math.round(avgRating))}</span>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:24, fontWeight:700, color:"#fbbf24" }}>{avgRating}</span>
            <span style={{ fontSize:14, color:"#64748b" }}>({reviews.length} reviews)</span>
          </div>
        )}
      </div>

      {user && isPaid && !hasReviewed && (
        <div style={{ background:"#16202b", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:24, marginBottom:32 }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:800, textTransform:"uppercase", color:"#4ade80", marginBottom:16 }}>
            Leave a Review
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <Field label="Your Name" required><Inp value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Jamie Smith"/></Field>
            <Field label="Club Name"><Inp value={form.club} onChange={e=>setForm(f=>({...f,club:e.target.value}))} placeholder="e.g. Riverside FC"/></Field>
          </div>
          <Field label="Rating">
            <div style={{ display:"flex", gap:4, marginTop:4 }}>
              {[1,2,3,4,5].map(i => (
                <span key={i} onClick={() => setForm(f=>({...f,rating:i}))}
                  style={{ fontSize:28, cursor:"pointer", color: i <= form.rating ? "#fbbf24" : "#334155" }}>
                  {i <= form.rating ? "★" : "☆"}
                </span>
              ))}
            </div>
          </Field>
          <Field label="Your Review" required>
            <Txt value={form.review} onChange={e=>setForm(f=>({...f,review:e.target.value}))} placeholder="Tell other coaches what you think..." rows={4}/>
          </Field>
          <button onClick={submitReview} disabled={saving||!form.name||!form.review}
            style={{ width:"100%", padding:13, borderRadius:8, border:"none", background:form.name&&form.review?"linear-gradient(135deg,#16a34a,#4ade80)":"#1c2a38", color:form.name&&form.review?"#052e16":"#64748b", fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:800, textTransform:"uppercase", letterSpacing:1, cursor:form.name&&form.review?"pointer":"not-allowed", marginTop:8 }}>
            {saving ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      )}

      {user && !isPaid && (
        <div style={{ background:"rgba(251,191,36,0.06)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:12, padding:20, marginBottom:32, textAlign:"center" }}>
          <div style={{ fontSize:24, marginBottom:8 }}>★</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:700, color:"#fbbf24" }}>Upgrade to leave a review</div>
          <div style={{ fontSize:13, color:"#64748b", marginTop:4 }}>Only Pro and Starter Week members can submit reviews</div>
        </div>
      )}

      {hasReviewed && (
        <div style={{ background:"rgba(74,222,128,0.06)", border:"1px solid rgba(74,222,128,0.2)", borderRadius:12, padding:20, marginBottom:32, textAlign:"center" }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:700, color:"#4ade80" }}>Thanks for your review!</div>
        </div>
      )}

      {loading
        ? <div style={{ color:"#64748b", textAlign:"center", padding:40 }}>Loading reviews...</div>
        : reviews.length === 0
          ? <div style={{ color:"#64748b", textAlign:"center", padding:40, border:"1px dashed rgba(255,255,255,0.1)", borderRadius:12 }}>No reviews yet - be the first!</div>
          : <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {reviews.map(r => (
                <div key={r.id} style={{ background:"#16202b", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:20 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:15, color:"#f1f5f9" }}>{r.name}</div>
                      {r.club && <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{r.club}</div>}
                    </div>
                    <div style={{ color:"#fbbf24", fontSize:18, letterSpacing:2 }}>
                      {"★".repeat(r.rating)}{"☆".repeat(5-r.rating)}
                    </div>
                  </div>
                  <div style={{ fontSize:14, color:"#94a3b8", lineHeight:1.7 }}>{r.review}</div>
                  <div style={{ fontSize:11, color:"#334155", marginTop:8 }}>
                    {new Date(r.created_at).toLocaleDateString("en-GB")}
                  </div>
                </div>
              ))}
            </div>
      }
    </div>
  );
}

// ── Main app ───────────────────────────────────────────────────────────────
export default function GafferAI() {
  const [user,        setUser]        = useState(null);
  const [profile,     setProfile]     = useState(null);
  const [screen,      setScreen]      = useState("home");
  const [activeTool,  setActiveTool]  = useState(null);
  const [inputs,      setInputs]      = useState({ sessionType:"team" });
  const [output,      setOutput]      = useState("");
  const [loading,     setLoading]     = useState(false);
  const [loadMsg,     setLoadMsg]     = useState(0);
  const [error,       setError]       = useState("");
  const [copied,      setCopied]      = useState(false);
  const [history,     setHistory]     = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [toast,       setToast]       = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [successPlan, setSuccessPlan] = useState(null);

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(""),2500); };

  // Handle Stripe redirect
  useEffect(()=>{
    const params = new URLSearchParams(window.location.search);
    const upgraded = params.get("upgraded");
    const cancelled = params.get("cancelled");
    if (upgraded) {
      setSuccessPlan(upgraded);
      supabase.auth.getUser().then(({data:{user}})=>{
        if (user) {
          const updates = upgraded==="pro" ? {plan:"pro",generations_limit:35} : {plan:"trial",generations_limit:10};
          supabase.from("profiles").update(updates).eq("id",user.id);
          loadProfile(user.id);
        }
      });
      window.history.replaceState({},"",window.location.pathname);
    }
    if (cancelled) { showToast("❌ Payment cancelled"); window.history.replaceState({},"",window.location.pathname); }
  },[]); // eslint-disable-line

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{ if(session?.user){setUser(session.user);loadProfile(session.user.id);loadHistory(session.user.id);} setAuthLoading(false); });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_,session)=>{ if(session?.user){setUser(session.user);loadProfile(session.user.id);loadHistory(session.user.id);}else{setUser(null);setProfile(null);setHistory([]);} });
    return ()=>subscription.unsubscribe();
  },[]);

  const loadProfile = async (uid) => {
    const {data} = await supabase.from("profiles").select("*").eq("id",uid).single();
    if(data) setProfile(data);
    loadHistory(uid);
  };

  const loadHistory = async (uid) => {
    const {data} = await supabase.from("history").select("*").eq("user_id",uid).order("created_at",{ascending:false}).limit(30);
    if (data) setHistory(data.map(h=>({
      id: h.id,
      toolId: h.tool_id,
      label: h.label,
      emoji: h.emoji,
      color: h.color,
      preview: h.preview,
      full: h.full_content,
      date: new Date(h.created_at).toLocaleDateString("en-GB"),
    })));
  };


  const MSGS = ["🧠 Drawing up tactics…","📋 Building your session…","✍️ Writing the report…","⭐ Crafting feedback…","📲 Creating your post…"];
  useEffect(()=>{ if(!loading) return; const iv=setInterval(()=>setLoadMsg(m=>(m+1)%MSGS.length),1600); return()=>clearInterval(iv); },[loading]); // eslint-disable-line

  const set      = (k,v) => setInputs(p=>({...p,[k]:v}));
  const goHome   = () => { setScreen("home"); setActiveTool(null); setOutput(""); setError(""); };
  const openTool = tool => { setActiveTool(tool); setInputs({sessionType:"team"}); setOutput(""); setError(""); setScreen("tool"); };

  const generate = async () => {
    if (!profile) return;
    if (profile.generations_used>=profile.generations_limit) { setShowUpgrade(true); return; }
    setLoading(true); setError(""); setLoadMsg(0);
    try {
      const result  = await callClaude(buildPrompt(activeTool.id, inputs));
      const newUsed = profile.generations_used+1;
      await supabase.from("profiles").update({generations_used:newUsed}).eq("id",user.id);
      setProfile(p=>({...p,generations_used:newUsed}));
      setOutput(result);
      const historyItem = {
        tool_id: activeTool.id,
        label: activeTool.label,
        emoji: activeTool.emoji,
        color: activeTool.color,
        preview: result.replace(/\*\*/g,"").slice(0,80)+"...",
        full_content: result,
        user_id: user.id,
      };
      await supabase.from("history").insert(historyItem);
      loadHistory(user.id);
      setScreen("output");
    } catch(e) { setError(`⚠️ Generation failed: ${e.message||"check your connection and try again."}`); }
    setLoading(false);
  };

  const copy   = async () => { await navigator.clipboard.writeText(output); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  const logout = async () => { await supabase.auth.signOut(); setUser(null); setProfile(null); setHistory([]); goHome(); };

  const renderOutput = text => text.split("\n").map((line,i)=>{
    const parts=line.split(/\*\*(.*?)\*\*/g);
    return <div key={i} style={{minHeight:line===""?"12px":"auto"}}>{parts.map((pt,j)=>j%2===1?<span key={j} style={{color:"#f1f5f9",fontWeight:700}}>{pt}</span>:<span key={j}>{pt}</span>)}</div>;
  });

  const ready = activeTool && canGenerate(activeTool.id, inputs);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@300;400;500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html,body{height:100%;background:#0a0f14;color:#f1f5f9;font-family:'Barlow',sans-serif}
    .app{min-height:100vh;background:radial-gradient(ellipse 120% 60% at 50% -10%,rgba(34,211,238,0.06) 0%,transparent 60%),#0a0f14}
    .nav{position:sticky;top:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 24px;height:60px;background:rgba(10,15,20,0.92);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,0.08)}
    .nav-logo{font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:900;letter-spacing:1px;cursor:pointer}
    .nav-logo span{color:#4ade80}
    .chip{padding:6px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.08);background:transparent;color:#94a3b8;font-family:'Barlow',sans-serif;font-size:13px;cursor:pointer;transition:all .18s}
    .chip:hover{border-color:rgba(255,255,255,0.15);color:#f1f5f9}
    .hero{padding:60px 0 40px;text-align:center}
    .hero-title{font-family:'Barlow Condensed',sans-serif;font-size:clamp(52px,9vw,88px);font-weight:900;line-height:.9;letter-spacing:-1px;text-transform:uppercase;margin-bottom:16px}
    .green{color:#4ade80;text-shadow:0 0 40px rgba(74,222,128,0.3)}
    .tool-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:40px}
    @media(max-width:680px){.tool-grid{grid-template-columns:1fr 1fr}}
    .tcard{position:relative;overflow:hidden;padding:22px 18px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:#16202b;cursor:pointer;transition:all .2s;text-align:left}
    .tcard:hover{transform:translateY(-2px)}
    .form-wrap{max-width:1000px;margin:0 auto;padding-top:32px;display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start}
    @media(max-width:720px){.form-wrap{grid-template-columns:1fr}}
    .panel{background:#16202b;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:24px}
    .gen-btn{width:100%;padding:14px;border-radius:8px;border:none;font-family:'Barlow Condensed',sans-serif;font-size:17px;font-weight:800;text-transform:uppercase;letter-spacing:1px;cursor:pointer;transition:all .2s;margin-top:8px}
    .output-wrap{max-width:1000px;margin:0 auto;padding-top:32px;display:grid;grid-template-columns:1fr 1.6fr;gap:24px;align-items:start}
    @media(max-width:720px){.output-wrap{grid-template-columns:1fr}}
    .out-panel{background:#16202b;border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden}
    .out-topbar{display:flex;justify-content:space-between;align-items:center;padding:12px 18px;border-bottom:1px solid rgba(255,255,255,0.08);background:#1c2a38}
    .out-content{padding:22px 18px;max-height:580px;overflow-y:auto;font-size:14px;line-height:1.8;color:#cbd5e1;white-space:pre-wrap}
    .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);z-index:200;display:flex;align-items:flex-end;justify-content:center;padding:20px}
    .hist-panel{width:100%;max-width:600px;max-height:70vh;overflow-y:auto;background:#111820;border:1px solid rgba(255,255,255,0.12);border-radius:16px 16px 0 0;padding:24px}
    .error-box{padding:10px 14px;border-radius:7px;border:1px solid rgba(248,113,113,0.3);background:rgba(248,113,113,0.06);color:#f87171;font-size:13px;margin-bottom:12px}
    .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1c2a38;border:1px solid rgba(74,222,128,0.3);color:#4ade80;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;z-index:500}
    .bc{display:flex;align-items:center;gap:8px;padding:16px 0 0;font-size:13px;color:#64748b}
    .bc button{background:none;border:none;color:#94a3b8;cursor:pointer;font-family:'Barlow',sans-serif;font-size:13px;padding:0}
    ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#1c2a38;border-radius:2px}
    @keyframes load{0%{width:0%}50%{width:70%}100%{width:95%}}
  `;

  if (authLoading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0a0f14",color:"#4ade80",fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:700,letterSpacing:2}}>⏳ LOADING…</div>;
  if (!user) return <><style>{css}</style><AuthScreen onAuth={u=>{setUser(u);loadProfile(u.id);}}/></>;

  return (
    <>
      <style>{css}</style>
      <div className="app">
        {successPlan&&<SuccessBanner plan={successPlan} onClose={()=>setSuccessPlan(null)}/>}
        {toast&&<div className="toast">{toast}</div>}
        {showUpgrade&&<UpgradeModal onClose={()=>setShowUpgrade(false)} user={user} profile={profile}/>}

        <nav className="nav">
          <div className="nav-logo" onClick={goHome}>⚽ Gaffer<span>AI</span></div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            {profile&&<GenCounter used={profile.generations_used} limit={profile.generations_limit} plan={profile.plan}/>}
            {screen!=="home"&&<button className="chip" onClick={goHome}>🏠 Home</button>}
            {screen==="output"&&<button className="chip" onClick={()=>{setScreen("tool");setOutput("");}}>✏️ Edit</button>}
            <button className="chip" onClick={()=>setShowHistory(true)}>📜 History{history.length>0&&` (${history.length})`}</button>
            <button className="chip" onClick={()=>setShowReviews(true)}>⭐ Reviews</button>
            <button className="chip" onClick={()=>setShowUpgrade(true)}>⚡ Upgrade</button>
            <button className="chip" onClick={logout}>🚪 Log Out</button>
          </div>
        </nav>

        <div style={{maxWidth:1100,margin:"0 auto",padding:"0 20px 60px"}}>

          {screen==="home"&&(
            <div>
              <div className="hero">
                <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"5px 14px",borderRadius:4,border:"1px solid rgba(74,222,128,0.2)",background:"rgba(74,222,128,0.06)",fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,color:"#4ade80",letterSpacing:"2px",textTransform:"uppercase",marginBottom:20}}>⚽ AI-POWERED COACH TOOLKIT</div>
                <h1 className="hero-title"><span style={{display:"block"}}>Every Tool</span><span className="green">The Gaffer Needs</span></h1>
                <p style={{fontSize:16,color:"#94a3b8",maxWidth:460,margin:"0 auto 32px",lineHeight:1.65,fontWeight:300}}>🚀 Generate training plans, match reports, player feedback, and social posts in under 30 seconds.</p>
                <div style={{display:"flex",justifyContent:"center",gap:32,flexWrap:"wrap",padding:"18px 28px",borderRadius:10,border:"1px solid rgba(255,255,255,0.08)",background:"#16202b",maxWidth:500,margin:"0 auto"}}>
                  {[["40k+","🏟 UK clubs"],["7","🛠 AI tools"],["~30s","⚡ per gen"],["£4.99","📅 /month"]].map(([v,l])=>(
                    <div key={l} style={{textAlign:"center"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:26,fontWeight:800,color:"#4ade80"}}>{v}</div><div style={{fontSize:12,color:"#64748b",marginTop:2}}>{l}</div></div>
                  ))}
                </div>
              </div>
              <div className="tool-grid">
                {TOOLS.map(t=>(
                  <button key={t.id} className="tcard" onClick={()=>openTool(t)} style={{borderColor:"rgba(255,255,255,0.08)"}} onMouseEnter={e=>e.currentTarget.style.borderColor=t.color} onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.08)"}>
                    <span style={{fontSize:26,marginBottom:10,display:"block"}}>{t.emoji}</span>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,fontWeight:800,textTransform:"uppercase",letterSpacing:.5,color:"#f1f5f9",marginBottom:4}}>{t.label}</div>
                    <div style={{fontSize:13,color:"#64748b"}}>{t.tagline}</div>
                    <span style={{position:"absolute",top:18,right:18,fontSize:16,color:"#334155"}}>↗</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {screen==="tool"&&activeTool?.id==="drills"    &&<DrillBuilder userId={user.id} showToast={showToast}/>}
          {screen==="tool"&&activeTool?.id==="teamsheet" &&<TeamSheet    userId={user.id} showToast={showToast}/>}

          {screen==="tool"&&activeTool&&activeTool.id!=="drills"&&activeTool.id!=="teamsheet"&&(
            <div>
              <div className="bc"><button onClick={goHome}>🏠 Home</button><span>/</span><span style={{color:activeTool.color}}>{activeTool.emoji} {activeTool.label}</span></div>
              <div className="form-wrap">
                <div>
                  <div style={{marginBottom:24}}>
                    <span style={{fontSize:34,filter:`drop-shadow(0 0 12px ${activeTool.color}60)`}}>{activeTool.emoji}</span>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:32,fontWeight:900,textTransform:"uppercase",color:activeTool.color,marginTop:8}}>{activeTool.label}</div>
                    <div style={{fontSize:14,color:"#64748b",marginTop:4}}>{activeTool.tagline}</div>
                  </div>
                  <div className="panel">
                    {activeTool.id==="training"&&<>
                      <Field label="👥 Session Type" required>
                        <div style={{display:"flex",gap:8}}>
                          {["team","individual"].map(type=><button key={type} onClick={()=>set("sessionType",type)} style={{flex:1,padding:10,borderRadius:8,border:`1.5px solid ${inputs.sessionType===type?"#4ade80":"rgba(255,255,255,0.1)"}`,background:inputs.sessionType===type?"rgba(74,222,128,0.1)":"rgba(255,255,255,0.05)",color:inputs.sessionType===type?"#4ade80":"#94a3b8",fontFamily:"'Barlow',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",textTransform:"uppercase"}}>{type==="team"?"👥 Team":"👤 Individual"}</button>)}
                        </div>
                      </Field>
                      {inputs.sessionType==="individual"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="👤 Player Name" required><Inp value={inputs.playerName} onChange={e=>set("playerName",e.target.value)} placeholder="e.g. Jamie"/></Field><Field label="🎽 Position" required><Inp value={inputs.playerPosition} onChange={e=>set("playerPosition",e.target.value)} placeholder="e.g. Striker"/></Field></div>}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                        <Field label="🏅 Sport" required><Sel value={inputs.sport} onChange={e=>set("sport",e.target.value)} options={SPORTS} placeholder="Select sport"/></Field>
                        <Field label="🎂 Age Group" required><Sel value={inputs.ageGroup} onChange={e=>set("ageGroup",e.target.value)} options={AGE_GROUPS} placeholder="Age group"/></Field>
                        <Field label="📊 Level" required><Sel value={inputs.level} onChange={e=>set("level",e.target.value)} options={LEVELS} placeholder="Level"/></Field>
                        <Field label="⏱ Duration" required><Sel value={inputs.duration} onChange={e=>set("duration",e.target.value)} options={DURATIONS} placeholder="Duration"/></Field>
                      </div>
                      <Field label="🎯 Focus Area" required><Sel value={inputs.focus} onChange={e=>set("focus",e.target.value)} options={FOCUS_AREAS} placeholder="Select focus"/></Field>
                    </>}
                    {activeTool.id==="matchreport"&&<>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                        <Field label="🏅 Sport" required><Sel value={inputs.sport} onChange={e=>set("sport",e.target.value)} options={SPORTS} placeholder="Select sport"/></Field>
                        <Field label="🎂 Age Group"><Sel value={inputs.ageGroup} onChange={e=>set("ageGroup",e.target.value)} options={AGE_GROUPS} placeholder="Age group"/></Field>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
                        <Field label="🏠 Home Team" required><Inp value={inputs.homeTeam} onChange={e=>set("homeTeam",e.target.value)} placeholder="e.g. Riverside FC"/></Field>
                        <Field label="⚽ Score" required><Inp value={inputs.homeScore} onChange={e=>set("homeScore",e.target.value)} placeholder="3"/></Field>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
                        <Field label="✈️ Away Team" required><Inp value={inputs.awayTeam} onChange={e=>set("awayTeam",e.target.value)} placeholder="e.g. Town Athletic"/></Field>
                        <Field label="⚽ Score" required><Inp value={inputs.awayScore} onChange={e=>set("awayScore",e.target.value)} placeholder="1"/></Field>
                      </div>
                      <Field label="🥅 Scorers"><Inp value={inputs.scorers} onChange={e=>set("scorers",e.target.value)} placeholder="e.g. Jamie (12'), Alex (67')"/></Field>
                      <Field label="✨ Highlights"><Txt value={inputs.highlights} onChange={e=>set("highlights",e.target.value)} placeholder="Key moments…" rows={3}/></Field>
                    </>}
                    {activeTool.id==="feedback"&&<>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                        <Field label="🏅 Sport" required><Sel value={inputs.sport} onChange={e=>set("sport",e.target.value)} options={SPORTS} placeholder="Select sport"/></Field>
                        <Field label="🎂 Age Group" required><Sel value={inputs.ageGroup} onChange={e=>set("ageGroup",e.target.value)} options={AGE_GROUPS} placeholder="Age group"/></Field>
                        <Field label="👤 Player Name" required><Inp value={inputs.playerName} onChange={e=>set("playerName",e.target.value)} placeholder="e.g. Jamie"/></Field>
                        <Field label="🎽 Position" required><Inp value={inputs.position} onChange={e=>set("position",e.target.value)} placeholder="e.g. Midfielder"/></Field>
                      </div>
                      <Field label="💪 Strengths" required><Txt value={inputs.strengths} onChange={e=>set("strengths",e.target.value)} placeholder="What they do well…"/></Field>
                      <Field label="📈 Areas to Improve" required><Txt value={inputs.improvements} onChange={e=>set("improvements",e.target.value)} placeholder="What to work on…"/></Field>
                    </>}
                    {activeTool.id==="social"&&<>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                        <Field label="🏅 Sport" required><Sel value={inputs.sport} onChange={e=>set("sport",e.target.value)} options={SPORTS} placeholder="Select sport"/></Field>
                        <Field label="📱 Platform" required><Sel value={inputs.platform} onChange={e=>set("platform",e.target.value)} options={PLATFORMS} placeholder="Platform"/></Field>
                      </div>
                      <Field label="📢 Post Type" required><Sel value={inputs.postType} onChange={e=>set("postType",e.target.value)} options={POST_TYPES} placeholder="Post type"/></Field>
                      <Field label="🏟 Club Name"><Inp value={inputs.clubName} onChange={e=>set("clubName",e.target.value)} placeholder="e.g. Riverside FC"/></Field>
                      <Field label="✨ Details"><Txt value={inputs.highlights} onChange={e=>set("highlights",e.target.value)} placeholder="Context…" rows={3}/></Field>
                    </>}
                    {activeTool.id==="newsletter"&&<>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                        <Field label="🏅 Sport" required><Sel value={inputs.sport} onChange={e=>set("sport",e.target.value)} options={SPORTS} placeholder="Select sport"/></Field>
                        <Field label="🎂 Age Group" required><Sel value={inputs.ageGroup} onChange={e=>set("ageGroup",e.target.value)} options={AGE_GROUPS} placeholder="Age group"/></Field>
                      </div>
                      <Field label="🏟 Club Name"><Inp value={inputs.clubName} onChange={e=>set("clubName",e.target.value)} placeholder="e.g. Riverside FC"/></Field>
                      <Field label="✨ Week's Highlights" required><Txt value={inputs.weekHighlights} onChange={e=>set("weekHighlights",e.target.value)} placeholder="What happened this week…" rows={3}/></Field>
                      <Field label="📅 Upcoming Fixtures"><Inp value={inputs.upcomingFixtures} onChange={e=>set("upcomingFixtures",e.target.value)} placeholder="e.g. Home vs Town FC, Sat 10am"/></Field>
                    </>}
                    {error&&<div className="error-box">{error}</div>}
                    <button className="gen-btn" onClick={generate} disabled={!ready||loading} style={{background:ready&&!loading?"#4ade80":"#1c2a38",color:ready&&!loading?"#052e16":"#64748b",cursor:ready&&!loading?"pointer":"not-allowed"}}>
                      {loading?MSGS[loadMsg]:`⚡ Generate ${activeTool.label} →`}
                    </button>
                  </div>
                </div>
                <div className="panel" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,minHeight:200}}>
                  <div style={{fontSize:44}}>{activeTool.emoji}</div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,fontWeight:700,textTransform:"uppercase",color:loading?activeTool.color:"#64748b",letterSpacing:1,textAlign:"center"}}>
                    {loading?MSGS[loadMsg]:"✍️ Fill in the form and generate"}
                  </div>
                  {loading&&<div style={{width:180,height:3,background:"rgba(255,255,255,0.08)",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",background:activeTool.color,borderRadius:2,animation:"load 2s ease-in-out infinite"}}/></div>}
                  {profile&&<div style={{fontSize:12,color:"#475569"}}>⚡ {Math.max(0,profile.generations_limit-profile.generations_used)} generations remaining</div>}
                </div>
              </div>
            </div>
          )}

          {screen==="output"&&!loading&&output&&activeTool&&(
            <div>
              <div className="bc"><button onClick={goHome}>🏠 Home</button><span>/</span><button onClick={()=>{setScreen("tool");setOutput("");}}>{ activeTool.emoji} {activeTool.label}</button><span>/</span><span style={{color:activeTool.color}}>✅ Result</span></div>
              <div className="output-wrap">
                <div>
                  <div style={{marginBottom:20}}>
                    <span style={{fontSize:34}}>{activeTool.emoji}</span>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:32,fontWeight:900,textTransform:"uppercase",color:activeTool.color,marginTop:8}}>🎉 Done!</div>
                    <div style={{fontSize:14,color:"#64748b",marginTop:4}}>✅ Your {activeTool.label.toLowerCase()} is ready</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    <button onClick={copy} style={{padding:"13px 20px",borderRadius:8,border:`1px solid ${copied?activeTool.color:"rgba(255,255,255,0.12)"}`,background:copied?`${activeTool.color}15`:"#16202b",color:copied?activeTool.color:"#f1f5f9",fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:700,textTransform:"uppercase",letterSpacing:1,cursor:"pointer"}}>{copied?"✅ Copied!":"📋 Copy to Clipboard"}</button>
                    <button onClick={()=>{setScreen("tool");setOutput("");}} style={{padding:"13px 20px",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"#94a3b8",fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:700,textTransform:"uppercase",letterSpacing:1,cursor:"pointer"}}>🔄 Generate Another</button>
                    <button onClick={goHome} style={{padding:"13px 20px",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"#94a3b8",fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:700,textTransform:"uppercase",letterSpacing:1,cursor:"pointer"}}>🏠 All Tools</button>
                  </div>
                  {profile&&<div style={{marginTop:16}}><GenCounter used={profile.generations_used} limit={profile.generations_limit} plan={profile.plan}/></div>}
                </div>
                <div className="out-panel">
                  <div className="out-topbar">
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:"#64748b"}}>{activeTool.emoji} {activeTool.label}</div>
                    <button onClick={copy} style={{padding:"5px 12px",borderRadius:5,border:`1px solid ${copied?"#4ade80":"rgba(255,255,255,0.08)"}`,background:"transparent",color:copied?"#4ade80":"#94a3b8",fontFamily:"'Barlow',sans-serif",fontSize:12,fontWeight:600,cursor:"pointer"}}>{copied?"✅ Copied":"📋 Copy"}</button>
                  </div>
                  <div className="out-content">{renderOutput(output)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {showReviews&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(8px)",zIndex:200,overflowY:"auto",padding:"20px 20px 60px"}} onClick={e=>e.target===e.currentTarget&&setShowReviews(false)}>
            <div style={{maxWidth:860,margin:"0 auto",position:"relative"}}>
              <button onClick={()=>setShowReviews(false)} style={{position:"fixed",top:20,right:24,width:36,height:36,borderRadius:8,border:"1px solid rgba(255,255,255,0.12)",background:"#111820",color:"#94a3b8",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>x</button>
              <ReviewsPage user={user} profile={profile} showToast={showToast}/>
            </div>
          </div>
        )}

        {showHistory&&(
          <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowHistory(false)}>
            <div className="hist-panel">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:800,textTransform:"uppercase"}}>📜 Content History</div>
                <button onClick={()=>setShowHistory(false)} style={{width:30,height:30,borderRadius:6,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"#94a3b8",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              </div>
              {history.length===0?<div style={{textAlign:"center",padding:32,color:"#64748b",fontSize:14}}>📭 No history yet!</div>:
               history.map(h=>(
                 <div key={h.id} onClick={()=>{setOutput(h.full);setActiveTool(TOOLS.find(t=>t.id===h.toolId));setScreen("output");setShowHistory(false);}} style={{padding:"12px 14px",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:"#16202b",marginBottom:8,cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
                   <div style={{fontSize:20}}>{h.emoji}</div>
                   <div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:13,color:h.color}}>{h.label}</div><div style={{fontSize:12,color:"#64748b",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{h.preview}</div></div>
                   <div style={{fontSize:11,color:"#334155",flexShrink:0}}>📅 {h.date}</div>
                 </div>
               ))
              }
            </div>
          </div>
        )}
      </div>
    </>
  );
}
