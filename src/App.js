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

function Field({ label, required, fieldId, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label htmlFor={fieldId} style={{ display:"block", fontSize:11, fontWeight:700, color:"#94a3b8", letterSpacing:"1.2px", textTransform:"uppercase", marginBottom:6 }}>
        {label}{required && <span style={{ color:"#f472b6", marginLeft:3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}
const Inp = ({ value, onChange, placeholder, id, name }) => <input id={id} name={name||id} value={value||""} onChange={onChange} placeholder={placeholder} style={IS} onFocus={fo} onBlur={bl} autoComplete={name||id}/>;
const Sel = ({ value, onChange, options, placeholder, id, name }) =>
  <select id={id} name={name||id} value={value||""} onChange={onChange} style={{...IS, cursor:"pointer"}} onFocus={fo} onBlur={bl}>
    <option value="" disabled>{placeholder}</option>
    {options.map(o => <option key={o} value={o} style={{background:"#1e293b"}}>{o}</option>)}
  </select>;
const Txt = ({ value, onChange, placeholder, rows=3, id, name }) =>
  <textarea id={id} name={name||id} value={value||""} onChange={onChange} placeholder={placeholder} rows={rows} style={{...IS, resize:"vertical", lineHeight:1.6}} onFocus={fo} onBlur={bl}/>;

// ── Landing Page ───────────────────────────────────────────────────────────
function LandingPage({ onGetStarted, onLegal }) {
  const tools = [
    { emoji:"📋", label:"Training Session", tagline:"Full drill-by-drill session plans", color:"#22d3ee" },
    { emoji:"📰", label:"Match Report",      tagline:"Pro write-up ready to publish",    color:"#4ade80" },
    { emoji:"⭐", label:"Player Feedback",   tagline:"Personalised player assessment",   color:"#fbbf24" },
    { emoji:"📲", label:"Social Media",      tagline:"Posts for every platform",         color:"#f472b6" },
    { emoji:"✉️", label:"Parent Newsletter", tagline:"Weekly update in one click",       color:"#a78bfa" },
    { emoji:"⚙️", label:"Drill Builder",     tagline:"Create and save custom drills",    color:"#fb923c" },
    { emoji:"📋", label:"Team Sheet",        tagline:"Build and save your lineup",       color:"#34d399" },
  ];

  const reviews = [
    { name:"Craig M.", club:"West Lothian Youth FC", rating:5, text:"Saves me hours every week. The match reports alone are worth it." },
    { name:"Sarah T.", club:"Edinburgh Girls FC", rating:5, text:"Finally a tool built for coaches like us. Incredible value." },
    { name:"James R.", club:"Riverside United FC", rating:5, text:"Generated a full training session in 20 seconds. Unbelievable." },
  ];

  const css2 = `
    @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@300;400;500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html,body{background:#0a0f14;color:#f1f5f9;font-family:'Barlow',sans-serif}
    .lp-nav{position:sticky;top:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 32px;height:64px;background:rgba(10,15,20,0.95);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,0.08)}
    .lp-logo{font-family:'Barlow Condensed',sans-serif;font-size:24px;font-weight:900;letter-spacing:1px;color:#f1f5f9}
    .lp-logo span{color:#4ade80}
    .lp-btn{padding:10px 24px;border-radius:8px;border:none;background:linear-gradient(135deg,#16a34a,#4ade80);color:#052e16;font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:1px;cursor:pointer;transition:opacity .2s}
    .lp-btn:hover{opacity:0.9}
    .lp-btn-outline{padding:10px 24px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:#f1f5f9;font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:1px;cursor:pointer;margin-right:8px;transition:all .2s}
    .lp-btn-outline:hover{border-color:rgba(255,255,255,0.3)}
    .hero{min-height:90vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:60px 20px;background:radial-gradient(ellipse 120% 60% at 50% 0%,rgba(34,211,238,0.08) 0%,transparent 60%)}
    .hero-title{font-family:'Barlow Condensed',sans-serif;font-size:clamp(56px,10vw,100px);font-weight:900;line-height:0.9;letter-spacing:-2px;text-transform:uppercase;margin-bottom:24px}
    .green{color:#4ade80;text-shadow:0 0 60px rgba(74,222,128,0.3)}
    .hero-sub{font-size:clamp(16px,2vw,20px);color:#94a3b8;max-width:520px;line-height:1.7;font-weight:300;margin-bottom:40px}
    .hero-btns{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-bottom:60px}
    .hero-btn-main{padding:16px 40px;border-radius:10px;border:none;background:linear-gradient(135deg,#16a34a,#4ade80);color:#052e16;font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:800;text-transform:uppercase;letter-spacing:1px;cursor:pointer;transition:all .2s}
    .hero-btn-main:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(74,222,128,0.3)}
    .hero-btn-sec{padding:16px 32px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:#f1f5f9;font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:700;text-transform:uppercase;letter-spacing:1px;cursor:pointer;transition:all .2s}
    .hero-btn-sec:hover{border-color:rgba(255,255,255,0.3);transform:translateY(-2px)}
    .stats{display:flex;gap:0;border:1px solid rgba(255,255,255,0.08);border-radius:12px;background:#16202b;overflow:hidden;max-width:600px;width:100%}
    .stat{flex:1;padding:20px;text-align:center;border-right:1px solid rgba(255,255,255,0.08)}
    .stat:last-child{border-right:none}
    .stat-val{font-family:'Barlow Condensed',sans-serif;font-size:32px;font-weight:900;color:#4ade80}
    .stat-label{font-size:12px;color:#64748b;margin-top:4px}
    .section{padding:80px 20px;max-width:1100px;margin:0 auto}
    .section-title{font-family:'Barlow Condensed',sans-serif;font-size:clamp(36px,6vw,56px);font-weight:900;text-transform:uppercase;text-align:center;margin-bottom:12px}
    .section-sub{font-size:16px;color:#64748b;text-align:center;margin-bottom:48px;max-width:480px;margin-left:auto;margin-right:auto}
    .tools-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}
    .tool-card{padding:24px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:#16202b;transition:all .2s;cursor:pointer}
    .tool-card:hover{transform:translateY(-4px);border-color:rgba(74,222,128,0.3)}
    .how-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px}
    .how-card{padding:28px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:#16202b;text-align:center}
    .how-num{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#16a34a,#4ade80);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:900;color:#052e16}
    .pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;max-width:860px;margin:0 auto}
    .price-card{padding:28px;border-radius:14px;border:1px solid rgba(255,255,255,0.08);background:#16202b}
    .price-card.featured{border-color:#4ade80;background:rgba(74,222,128,0.05)}
    .reviews-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}
    .review-card{padding:24px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:#16202b}
    .cta-section{padding:100px 20px;text-align:center;background:radial-gradient(ellipse 80% 60% at 50% 50%,rgba(74,222,128,0.06) 0%,transparent 70%)}
    .footer{padding:40px 20px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;color:#475569;font-size:13px}
    @media(max-width:600px){.stats{flex-direction:column}.stat{border-right:none;border-bottom:1px solid rgba(255,255,255,0.08)}.stat:last-child{border-bottom:none}.lp-nav{padding:0 16px}}
  `;

  return (
    <>
      <style>{css2}</style>

      {/* NAV */}
      <nav className="lp-nav">
        <div className="lp-logo">Gaffer<span>AI</span></div>
        <div>
          <button className="lp-btn-outline" onClick={onGetStarted}>Log In</button>
          <button className="lp-btn" onClick={onGetStarted}>Start Free</button>
        </div>
      </nav>

      {/* HERO */}
      <div className="hero">
        <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 16px",borderRadius:4,border:"1px solid rgba(74,222,128,0.2)",background:"rgba(74,222,128,0.06)",fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,color:"#4ade80",letterSpacing:"2px",textTransform:"uppercase",marginBottom:24}}>
          ⚽ AI-POWERED COACH TOOLKIT
        </div>
        <h1 className="hero-title">
          <span style={{display:"block"}}>Every Tool</span>
          <span className="green">The Gaffer Needs</span>
        </h1>
        <p className="hero-sub">
          Generate professional training plans, match reports, player feedback and social posts in under 30 seconds. Built specifically for grassroots coaches.
        </p>
        <div className="hero-btns">
          <button className="hero-btn-main" onClick={onGetStarted}>Start Free — No Card Needed</button>
          <button className="hero-btn-sec" onClick={onGetStarted}>See Pricing</button>
        </div>
        <div className="stats">
          {[["40k+","UK clubs"],["7","AI tools"],["30s","per generation"],["£4.99","/month"]].map(([v,l]) => (
            <div key={l} className="stat">
              <div className="stat-val">{v}</div>
              <div className="stat-label">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TOOLS */}
      <div style={{background:"#0d1520",padding:"80px 20px"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div className="section-title">7 Tools. One Platform.</div>
          <div className="section-sub">Everything a grassroots coach needs to run a professional club</div>
          <div className="tools-grid">
            {tools.map(t => (
              <div key={t.label} className="tool-card" onClick={onGetStarted}
                style={{"--hover-color":t.color}}>
                <div style={{fontSize:32,marginBottom:12}}>{t.emoji}</div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:800,textTransform:"uppercase",color:"#f1f5f9",marginBottom:6}}>{t.label}</div>
                <div style={{fontSize:14,color:"#64748b",lineHeight:1.6}}>{t.tagline}</div>
                <div style={{marginTop:14,fontSize:13,color:t.color,fontWeight:600}}>Try it free →</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div style={{padding:"80px 20px"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div className="section-title">How It Works</div>
          <div className="section-sub">Three steps to professional coaching content</div>
          <div className="how-grid">
            {[
              { n:"1", title:"Pick Your Tool", desc:"Choose from 7 purpose-built tools for every coaching task" },
              { n:"2", title:"Fill In The Form", desc:"Select your sport, age group, level and focus — takes 20 seconds" },
              { n:"3", title:"Get Your Content", desc:"AI generates professional content instantly — copy, share, done" },
            ].map(s => (
              <div key={s.n} className="how-card">
                <div className="how-num">{s.n}</div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:800,textTransform:"uppercase",color:"#f1f5f9",marginBottom:8}}>{s.title}</div>
                <div style={{fontSize:14,color:"#64748b",lineHeight:1.7}}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PRICING */}
      <div style={{background:"#0d1520",padding:"80px 20px"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div className="section-title">Simple Pricing</div>
          <div className="section-sub">Less than a matchday programme per month</div>
          <div className="pricing-grid">
            <div className="price-card">
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:800,textTransform:"uppercase",color:"#f1f5f9",marginBottom:8}}>Free</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:48,fontWeight:900,color:"#4ade80",marginBottom:4}}>£0</div>
              <div style={{fontSize:13,color:"#64748b",marginBottom:20}}>Forever free</div>
              {["5 AI generations/month","All 7 tools included","No credit card needed"].map(f => (
                <div key={f} style={{fontSize:14,color:"#94a3b8",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>✓ {f}</div>
              ))}
              <button onClick={onGetStarted} style={{width:"100%",marginTop:20,padding:12,borderRadius:8,border:"1px solid rgba(255,255,255,0.12)",background:"transparent",color:"#f1f5f9",fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:700,textTransform:"uppercase",cursor:"pointer"}}>Get Started Free</button>
            </div>
            <div className="price-card">
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:800,textTransform:"uppercase",color:"#f59e0b",marginBottom:8}}>Starter Week</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:48,fontWeight:900,color:"#f59e0b",marginBottom:4}}>£1</div>
              <div style={{fontSize:13,color:"#64748b",marginBottom:20}}>One-time payment</div>
              {["10 AI generations","Valid for 7 days","Perfect for trying Pro"].map(f => (
                <div key={f} style={{fontSize:14,color:"#94a3b8",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>✓ {f}</div>
              ))}
              <button onClick={onGetStarted} style={{width:"100%",marginTop:20,padding:12,borderRadius:8,border:"none",background:"linear-gradient(135deg,#d97706,#f59e0b)",color:"#fff",fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:700,textTransform:"uppercase",cursor:"pointer"}}>Get Starter Week</button>
            </div>
            <div className="price-card featured">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:800,textTransform:"uppercase",color:"#4ade80"}}>Pro</div>
                <div style={{padding:"3px 10px",borderRadius:4,background:"rgba(74,222,128,0.15)",fontSize:11,fontWeight:700,color:"#4ade80",letterSpacing:"1px"}}>MOST POPULAR</div>
              </div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:48,fontWeight:900,color:"#4ade80",marginBottom:4}}>£4.99<span style={{fontSize:18,fontWeight:400}}>/mo</span></div>
              <div style={{fontSize:13,color:"#64748b",marginBottom:20}}>Cancel anytime</div>
              {["35 AI generations/month","All 7 tools included","Persistent history","Priority support"].map(f => (
                <div key={f} style={{fontSize:14,color:"#94a3b8",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>✓ {f}</div>
              ))}
              <button onClick={onGetStarted} style={{width:"100%",marginTop:20,padding:12,borderRadius:8,border:"none",background:"linear-gradient(135deg,#16a34a,#4ade80)",color:"#052e16",fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:800,textTransform:"uppercase",cursor:"pointer"}}>Get Pro Plan</button>
            </div>
            <div className="price-card" style={{border:"1px solid #a78bfa",background:"rgba(167,139,250,0.05)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:800,textTransform:"uppercase",color:"#a78bfa"}}>Elite</div>
                <div style={{padding:"3px 10px",borderRadius:4,background:"rgba(167,139,250,0.15)",fontSize:11,fontWeight:700,color:"#a78bfa",letterSpacing:"1px"}}>POWER USER</div>
              </div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:48,fontWeight:900,color:"#a78bfa",marginBottom:4}}>£8.99<span style={{fontSize:18,fontWeight:400}}>/mo</span></div>
              <div style={{fontSize:13,color:"#64748b",marginBottom:20}}>Cancel anytime</div>
              {["70 AI generations/month","All 7 tools included","Persistent history","Priority support","Perfect for busy clubs"].map(f => (
                <div key={f} style={{fontSize:14,color:"#94a3b8",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>✓ {f}</div>
              ))}
              <button onClick={onGetStarted} style={{width:"100%",marginTop:20,padding:12,borderRadius:8,border:"none",background:"linear-gradient(135deg,#7c3aed,#a78bfa)",color:"#fff",fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:800,textTransform:"uppercase",cursor:"pointer"}}>Get Elite Plan</button>
            </div>
          </div>
        </div>
      </div>

      {/* REVIEWS */}
      <div style={{padding:"80px 20px"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div className="section-title">What Coaches Say</div>
          <div className="section-sub">Join hundreds of grassroots coaches saving hours every week</div>
          <div className="reviews-grid">
            {reviews.map(r => (
              <div key={r.name} className="review-card">
                <div style={{color:"#fbbf24",fontSize:20,marginBottom:12}}>{"★".repeat(r.rating)}</div>
                <div style={{fontSize:15,color:"#cbd5e1",lineHeight:1.7,marginBottom:16}}>{r.text}</div>
                <div style={{fontWeight:700,fontSize:14,color:"#f1f5f9"}}>{r.name}</div>
                <div style={{fontSize:12,color:"#64748b",marginTop:2}}>{r.club}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="cta-section">
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"clamp(36px,6vw,56px)",fontWeight:900,textTransform:"uppercase",marginBottom:16}}>
          Ready to Save Hours<br/><span className="green">Every Single Week?</span>
        </div>
        <p style={{fontSize:16,color:"#64748b",marginBottom:32,maxWidth:400,margin:"0 auto 32px"}}>Join grassroots coaches across the UK who are already using GafferAI.</p>
        <button className="hero-btn-main" onClick={onGetStarted}>Start Free Today — No Card Needed</button>
      </div>

      {/* FOOTER */}
      <div className="footer">
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:900,color:"#f1f5f9",marginBottom:8}}>Gaffer<span style={{color:"#4ade80"}}>AI</span></div>
        <div>AI toolkit for grassroots coaches · Built in Scotland</div>
        <div style={{marginTop:12,display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap"}}>
          <span style={{cursor:"pointer",color:"#4ade80"}} onClick={onGetStarted}>Sign Up Free</span>
          <span style={{color:"#334155"}}>·</span>
          <span style={{cursor:"pointer",color:"#4ade80"}} onClick={onGetStarted}>Log In</span>
          <span style={{color:"#334155"}}>·</span>
          <span style={{cursor:"pointer",color:"#64748b"}} onClick={()=>onLegal("terms")}>Terms</span>
          <span style={{color:"#334155"}}>·</span>
          <span style={{cursor:"pointer",color:"#64748b"}} onClick={()=>onLegal("privacy")}>Privacy</span>
          <span style={{color:"#334155"}}>·</span>
          <span style={{cursor:"pointer",color:"#64748b"}} onClick={()=>onLegal("contact")}>Contact</span>
        </div>
      </div>
    </>
  );
}

// ── Legal Pages ────────────────────────────────────────────────────────────
function LegalPage({ page, onClose }) {
  const S = { heading: { fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, fontWeight:900, textTransform:"uppercase", color:"#f1f5f9", marginBottom:16, marginTop:32 },
    sub: { fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:700, color:"#4ade80", marginBottom:8, marginTop:20 },
    p: { fontSize:14, color:"#94a3b8", lineHeight:1.8, marginBottom:12 },
    li: { fontSize:14, color:"#94a3b8", lineHeight:1.8, marginBottom:6, paddingLeft:16 } };

  const terms = (
    <div>
      <p style={S.p}>Last updated: March 2025</p>
      <div style={S.heading}>Terms and Conditions</div>
      <p style={S.p}>Welcome to GafferAI. By accessing or using our service at gaffer-ai-eight.vercel.app, you agree to be bound by these Terms and Conditions. Please read them carefully before using the platform.</p>

      <div style={S.sub}>1. About GafferAI</div>
      <p style={S.p}>GafferAI is an AI-powered content generation toolkit designed for grassroots sports coaches. We provide tools to generate training plans, match reports, player feedback, social media posts, newsletters, drill libraries and team sheets.</p>

      <div style={S.sub}>2. Eligibility</div>
      <p style={S.p}>You must be at least 18 years old to create an account and use GafferAI. By using the service you confirm that you meet this requirement.</p>

      <div style={S.sub}>3. Your Account</div>
      <p style={S.p}>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must notify us immediately at gafferai.app@gmail.com if you suspect any unauthorised use of your account.</p>

      <div style={S.sub}>4. Subscriptions and Payments</div>
      <p style={S.p}>GafferAI offers a free plan and paid subscription plans. Paid plans are billed through Stripe, our third-party payment processor. By subscribing you authorise us to charge your payment method on a recurring basis until you cancel.</p>
      <p style={S.p}>The Pro Plan (£4.99/month) and Elite Plan (£8.99/month) renew automatically each month. The Starter Week (£1) is a one-time payment. You may cancel your subscription at any time through your account settings or by contacting us.</p>
      <p style={S.p}>We reserve the right to change our pricing at any time. We will notify existing subscribers of any price changes with at least 30 days notice.</p>

      <div style={S.sub}>5. Refunds</div>
      <p style={S.p}>Due to the digital nature of our service, we generally do not offer refunds once generations have been used. If you experience a technical issue that prevents you from using the service, please contact us at gafferai.app@gmail.com and we will assess your case individually.</p>

      <div style={S.sub}>6. AI-Generated Content</div>
      <p style={S.p}>GafferAI uses artificial intelligence to generate content. While we strive for accuracy and quality, AI-generated content may contain errors, inaccuracies or inappropriate suggestions. You are responsible for reviewing all generated content before using or sharing it.</p>
      <p style={S.p}>You own the content generated through your use of GafferAI. We do not claim any intellectual property rights over content you generate using our tools.</p>

      <div style={S.sub}>7. Acceptable Use</div>
      <p style={S.p}>You agree not to use GafferAI to generate content that is illegal, harmful, defamatory, abusive, or otherwise objectionable. We reserve the right to suspend or terminate accounts that violate this policy.</p>

      <div style={S.sub}>8. Service Availability</div>
      <p style={S.p}>We aim to maintain high availability of the GafferAI service but cannot guarantee uninterrupted access. We may temporarily suspend the service for maintenance, updates or circumstances beyond our control.</p>

      <div style={S.sub}>9. Limitation of Liability</div>
      <p style={S.p}>To the fullest extent permitted by law, GafferAI and its owners shall not be liable for any indirect, incidental, special or consequential damages arising from your use of the service. Our total liability to you shall not exceed the amount you have paid us in the 12 months preceding the claim.</p>

      <div style={S.sub}>10. Changes to These Terms</div>
      <p style={S.p}>We may update these Terms and Conditions from time to time. We will notify users of significant changes by email or by displaying a notice on the platform. Continued use of GafferAI after changes constitutes acceptance of the new terms.</p>

      <div style={S.sub}>11. Governing Law</div>
      <p style={S.p}>These Terms and Conditions are governed by the laws of Scotland and the United Kingdom. Any disputes shall be subject to the exclusive jurisdiction of the Scottish courts.</p>

      <div style={S.sub}>12. Contact</div>
      <p style={S.p}>For any questions about these Terms and Conditions, please contact us at gafferai.app@gmail.com</p>
    </div>
  );

  const privacy = (
    <div>
      <p style={S.p}>Last updated: March 2025</p>
      <div style={S.heading}>Privacy Policy</div>
      <p style={S.p}>GafferAI ("we", "us", "our") is committed to protecting your personal data. This Privacy Policy explains how we collect, use and protect your information when you use our service at gaffer-ai-eight.vercel.app.</p>

      <div style={S.sub}>1. Data We Collect</div>
      <p style={S.p}>We collect the following personal data when you use GafferAI:</p>
      <p style={{...S.li}}>• Email address — used for account creation and login</p>
      <p style={{...S.li}}>• Usage data — number of generations used, tools accessed, account plan</p>
      <p style={{...S.li}}>• Content data — AI-generated content saved to your history</p>
      <p style={{...S.li}}>• Payment data — handled entirely by Stripe; we do not store card details</p>
      <p style={{...S.li}}>• Referral data — if you use or share a referral link</p>

      <div style={S.sub}>2. How We Use Your Data</div>
      <p style={S.p}>We use your personal data to provide and improve the GafferAI service, process payments, send important account communications, and comply with legal obligations. We do not sell your personal data to third parties.</p>

      <div style={S.sub}>3. Data Storage</div>
      <p style={S.p}>Your data is stored securely using Supabase, which provides PostgreSQL database hosting with UK/EU data residency. All data is encrypted in transit and at rest.</p>

      <div style={S.sub}>4. Third Party Services</div>
      <p style={S.p}>We use the following third-party services to operate GafferAI:</p>
      <p style={{...S.li}}>• Supabase — database and authentication (EU data hosting)</p>
      <p style={{...S.li}}>• Stripe — payment processing (PCI-DSS compliant)</p>
      <p style={{...S.li}}>• Anthropic — AI content generation (data processed per their privacy policy)</p>
      <p style={{...S.li}}>• Vercel — website hosting (global CDN)</p>

      <div style={S.sub}>5. Your Rights (GDPR)</div>
      <p style={S.p}>Under UK GDPR you have the following rights regarding your personal data:</p>
      <p style={{...S.li}}>• Right to access — request a copy of your personal data</p>
      <p style={{...S.li}}>• Right to rectification — request correction of inaccurate data</p>
      <p style={{...S.li}}>• Right to erasure — request deletion of your account and data</p>
      <p style={{...S.li}}>• Right to portability — request your data in a portable format</p>
      <p style={{...S.li}}>• Right to object — object to processing of your data</p>
      <p style={S.p}>To exercise any of these rights, email us at gafferai.app@gmail.com</p>

      <div style={S.sub}>6. Cookies</div>
      <p style={S.p}>GafferAI uses essential cookies only — required for authentication and session management. We do not use advertising or tracking cookies.</p>

      <div style={S.sub}>7. Data Retention</div>
      <p style={S.p}>We retain your personal data for as long as your account is active. If you delete your account we will remove your personal data within 30 days, except where we are required to retain it for legal or financial compliance purposes.</p>

      <div style={S.sub}>8. Children</div>
      <p style={S.p}>GafferAI is not directed at children under 18. We do not knowingly collect personal data from anyone under 18. If you believe a child has provided us with personal data please contact us immediately.</p>

      <div style={S.sub}>9. Changes to This Policy</div>
      <p style={S.p}>We may update this Privacy Policy from time to time. We will notify you of significant changes by email. Continued use of GafferAI after changes constitutes acceptance of the new policy.</p>

      <div style={S.sub}>10. Contact</div>
      <p style={S.p}>For any privacy-related queries or to exercise your GDPR rights, contact us at gafferai.app@gmail.com</p>
    </div>
  );

  const contact = (
    <div>
      <div style={S.heading}>Contact Us</div>
      <p style={S.p}>We would love to hear from you — whether you have a question, feedback, or need help with your account.</p>

      <div style={S.sub}>Email</div>
      <p style={{...S.p, color:"#4ade80", fontSize:18}}>gafferai.app@gmail.com</p>
      <p style={S.p}>We aim to respond to all emails within 24 hours on weekdays.</p>

      <div style={S.sub}>What We Can Help With</div>
      <p style={{...S.li}}>• Account and billing questions</p>
      <p style={{...S.li}}>• Technical issues with the platform</p>
      <p style={{...S.li}}>• Feedback and feature requests</p>
      <p style={{...S.li}}>• Partnership and District FA enquiries</p>
      <p style={{...S.li}}>• GDPR and data deletion requests</p>
      <p style={{...S.li}}>• Press and media enquiries</p>

      <div style={S.sub}>Partnership Enquiries</div>
      <p style={S.p}>If you represent a District Football Association, school, or coaching organisation and would like to discuss a partnership or bulk licensing deal, we would love to hear from you. Please email us at gafferai.app@gmail.com with the subject line "Partnership Enquiry".</p>

      <div style={S.sub}>Based In</div>
      <p style={S.p}>GafferAI is built and operated in Scotland, UK.</p>
    </div>
  );

  const pages = { terms, privacy, contact };
  const titles = { terms:"Terms & Conditions", privacy:"Privacy Policy", contact:"Contact Us" };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", backdropFilter:"blur(8px)", zIndex:300, overflowY:"auto", padding:"20px 20px 60px" }}>
      <div style={{ maxWidth:760, margin:"0 auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:32, position:"sticky", top:0, background:"rgba(10,15,20,0.95)", backdropFilter:"blur(20px)", padding:"16px 0", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:22, fontWeight:900, color:"#f1f5f9" }}>{titles[page]}</div>
          <button onClick={onClose} style={{ padding:"8px 20px", borderRadius:8, border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:"#94a3b8", fontFamily:"'Barlow',sans-serif", fontSize:14, cursor:"pointer" }}>✕ Close</button>
        </div>
        <div style={{ background:"#16202b", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:32 }}>
          {pages[page]}
        </div>
      </div>
    </div>
  );
}

// ── Auth ───────────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode,     setMode]     = useState("login");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [showReset,  setShowReset]  = useState(false);
  const [resetSent,  setResetSent]  = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // Check for referral code in URL
  const refCode = new URLSearchParams(window.location.search).get("ref");

  const submit = async () => {
    if (!email || !password) { setError("Please fill in both fields"); return; }
    if (mode === "signup" && password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError("");
    try {
      if (mode === "signup") {
        const { data, error: e } = await supabase.auth.signUp({ email, password });

        // Supabase returns specific errors we should handle clearly
        if (e) {
          if (e.message?.toLowerCase().includes("already registered") || e.message?.toLowerCase().includes("already exists") || e.status === 422) {
            setError("An account with this email already exists. Please log in instead.");
            setMode("login");
          } else {
            setError(e.message || "Could not create account. Please try again.");
          }
          setLoading(false);
          return;
        }

        // Supabase "ghost" duplicate: returns a user but with empty identities array
        // This happens when email confirmation is ON and the email is already registered
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          setError("An account with this email already exists. Please log in instead.");
          setMode("login");
          setLoading(false);
          return;
        }

        if (data.user) {
          const generationsLimit = refCode ? 10 : 5;

          // Create the profile row — fixed: removed invalid ignoreDuplicates option
          const { error: profileError } = await supabase.from("profiles").upsert({
            id: data.user.id,
            email: data.user.email,
            plan: "free",
            generations_used: 0,
            generations_limit: generationsLimit,
            created_at: new Date().toISOString(),
          }, { onConflict: "id" });

          if (profileError) {
            console.error("Profile upsert error:", profileError.message);
            // Don't block the user — auth succeeded, they can still log in
          }

          // Handle referral bonus (best-effort, don't block signup)
          if (refCode) {
            try {
              await supabase.from("referrals").insert({ referrer_id: refCode, referred_id: data.user.id, completed: true, created_at: new Date().toISOString() });
              const { data: referrerProfile } = await supabase.from("profiles").select("generations_limit").eq("id", refCode).single();
              if (referrerProfile) {
                await supabase.from("profiles").update({ generations_limit: (referrerProfile.generations_limit || 5) + 5 }).eq("id", refCode);
              }
            } catch (_) { /* ignore referral errors */ }
          }

          if (data.session) {
            // Email confirmation disabled — log in immediately
            onAuth(data.user);
          } else {
            // Email confirmation required
            setLoading(false);
            setError("✅ Account created! Check your email to confirm, then log in.");
            setMode("login");
          }
        } else {
          setError("Could not create account. Please try again.");
          setLoading(false);
        }
      } else {
        const { data, error: e } = await supabase.auth.signInWithPassword({ email, password });
        if (e) {
          if (e.message?.toLowerCase().includes("invalid login") || e.message?.toLowerCase().includes("invalid credentials")) {
            setError("Incorrect email or password. Please try again.");
          } else if (e.message?.toLowerCase().includes("email not confirmed")) {
            setError("Please confirm your email address before logging in. Check your inbox.");
          } else {
            setError(e.message || "Could not log in. Please try again.");
          }
          setLoading(false);
          return;
        }
        if (data.user) onAuth(data.user);
      }
    } catch (e) {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const sendReset = async () => {
    if (!resetEmail) { setError("Please enter your email address"); return; }
    setLoading(true); setError("");
    try {
      const { error: e } = await supabase.auth.resetPasswordForEmail(resetEmail, {
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
                  <div style={{ fontSize:48, marginBottom:12 }}>📧</div>
                  <div style={{ fontWeight:700, color:"#4ade80", marginBottom:8 }}>Email sent!</div>
                  <div style={{ fontSize:13, color:"#64748b", marginBottom:4 }}>We sent a reset link to:</div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#4ade80", marginBottom:16 }}>{resetEmail}</div>
                  <div style={{ fontSize:13, color:"#64748b", marginBottom:16 }}>Check your inbox and click the link.</div>
                  <button onClick={() => { setShowReset(false); setResetSent(false); setError(""); setResetEmail(""); }}
                    style={{ padding:"10px 20px", borderRadius:8, border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:"#94a3b8", fontFamily:"'Barlow',sans-serif", fontSize:14, cursor:"pointer" }}>
                    Back to Login
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize:13, color:"#64748b", marginBottom:16 }}>Enter your email and we will send you a reset link.</div>
                  <Field label="📧 Email" fieldId="reset-email">
                    <input id="reset-email" name="email" value={resetEmail} onChange={e=>setResetEmail(e.target.value)}
                      placeholder="your@email.com"
                      onKeyDown={e=>e.key==="Enter"&&sendReset()}
                      style={IS} onFocus={fo} onBlur={bl} autoComplete="email"/>
                  </Field>
                  {error && <div style={{ color:"#f87171", fontSize:13, marginBottom:12, padding:"8px 12px", background:"rgba(248,113,113,0.06)", borderRadius:6 }}>⚠️ {error}</div>}
                  <button onClick={sendReset} disabled={loading}
                    style={{ width:"100%", padding:13, borderRadius:8, border:"none", background:"linear-gradient(135deg,#16a34a,#4ade80)", color:"#052e16", fontFamily:"'Barlow Condensed',sans-serif", fontSize:17, fontWeight:800, textTransform:"uppercase", letterSpacing:1, cursor:"pointer", marginTop:8, opacity:loading?0.7:1 }}>
                    {loading ? "Sending..." : "Send Reset Link"}
                  </button>
                  <button onClick={() => { setShowReset(false); setResetSent(false); setError(""); setResetEmail(""); }}
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
              <Field label="📧 Email" fieldId="auth-email"><Inp id="auth-email" name="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com"/></Field>
              <Field label="🔒 Password" fieldId="auth-password">
                <input id="auth-password" name="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="........" style={IS} onFocus={fo} onBlur={bl} autoComplete={mode==="login"?"current-password":"new-password"}/>
              </Field>
              {mode === "login" && (
                <div style={{ textAlign:"right", marginBottom:8, marginTop:-6 }}>
                  <button onClick={() => { setShowReset(true); setError(""); }}
                    style={{ background:"none", border:"none", color:"#4ade80", fontSize:12, cursor:"pointer", padding:0 }}>
                    Forgot password?
                  </button>
                </div>
              )}
              {error && <div style={{ color: error.startsWith("✅") ? "#4ade80" : "#f87171", fontSize:13, marginBottom:12, padding:"8px 12px", background: error.startsWith("✅") ? "rgba(74,222,128,0.06)" : "rgba(248,113,113,0.06)", border: `1px solid ${error.startsWith("✅") ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`, borderRadius:6 }}>{error}</div>}
              <button onClick={submit} disabled={loading}
                style={{ width:"100%", padding:13, borderRadius:8, border:"none", background:"linear-gradient(135deg,#16a34a,#4ade80)", color:"#052e16", fontFamily:"'Barlow Condensed',sans-serif", fontSize:17, fontWeight:800, textTransform:"uppercase", letterSpacing:1, cursor:loading?"not-allowed":"pointer", marginTop:8, opacity:loading?0.7:1 }}>
                {loading ? "Please wait..." : mode==="login" ? "Log In" : "Create Account"}
              </button>
              {mode==="signup" && refCode && (
            <div style={{ fontSize:13, color:"#4ade80", textAlign:"center", marginTop:14, padding:"8px 12px", background:"rgba(74,222,128,0.08)", borderRadius:8, border:"1px solid rgba(74,222,128,0.2)" }}>
              🎁 You have been referred! Sign up and get <strong>10 free generations</strong> instead of 5!
            </div>
          )}
          {mode==="signup" && !refCode && <div style={{ fontSize:12, color:"#475569", textAlign:"center", marginTop:14 }}>🎁 Free plan: 5 AI generations per month</div>}
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
        <div style={{ fontWeight:700, color:"#4ade80" }}>{plan==="elite"?"🚀 Elite":plan==="pro"?"⭐ Pro":plan==="trial"?"🎯 Trial":"🆓 Free"}</div>
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
          {/* Elite */}
          <div style={{ padding:20, borderRadius:12, border:"2px solid #a78bfa", background:"rgba(167,139,250,0.08)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:800, color:"#a78bfa", textTransform:"uppercase" }}>🚀 Elite Plan</div>
                <div style={{ fontSize:13, color:"#94a3b8", marginTop:2 }}>✅ 70 generations/month · 🔄 Cancel anytime · 💪 Power users</div>
              </div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:32, fontWeight:900, color:"#a78bfa" }}>£8.99<span style={{ fontSize:14, fontWeight:400 }}>/mo</span></div>
            </div>
            <button onClick={() => handleUpgrade("elite")} disabled={!!loading}
              style={{ width:"100%", padding:11, borderRadius:8, border:"none", background:loading==="elite"?"#4c1d95":"linear-gradient(135deg,#7c3aed,#a78bfa)", color:"#fff", fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:800, textTransform:"uppercase", letterSpacing:1, cursor:loading?"not-allowed":"pointer" }}>
              {loading==="elite" ? "⏳ Redirecting…" : "🚀 Get Elite Plan — £8.99/mo"}
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

// ── Admin Dashboard ────────────────────────────────────────────────────────
function AdminDashboard({ onClose }) {
  const [stats,       setStats]       = useState(null);
  const [users,       setUsers]       = useState([]);
  const [reviews,     setReviews]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState("overview");
  const [editUser,    setEditUser]    = useState(null);
  const [editGens,    setEditGens]    = useState("");
  const [editPlan,    setEditPlan]    = useState("");
  const [editLimit,   setEditLimit]   = useState("");
  const [saving,      setSaving]      = useState(false);
  const [search,      setSearch]      = useState("");

  const loadData = async () => {
    setLoading(true);
    const [profilesRes, historyRes, reviewsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("history").select("id, user_id, created_at"),
      supabase.from("reviews").select("*").order("created_at", { ascending: false }),
    ]);

    const profiles = profilesRes.data || [];
    const history  = historyRes.data  || [];
    const revs     = reviewsRes.data  || [];

    const totalGens    = profiles.reduce((a, p) => a + (p.generations_used || 0), 0);
    const proUsers     = profiles.filter(p => p.plan === "pro").length;
    const trialUsers   = profiles.filter(p => p.plan === "trial").length;
    const freeUsers    = profiles.filter(p => p.plan === "free").length;
    const eliteUsers   = profiles.filter(p => p.plan === "elite").length;
    const estRevenue   = (proUsers * 4.99) + (trialUsers * 1) + (eliteUsers * 8.99);
    const today        = new Date().toDateString();
    const newToday     = profiles.filter(p => new Date(p.created_at).toDateString() === today).length;
    const thisWeek     = profiles.filter(p => {
      const d = new Date(p.created_at);
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      return d > weekAgo;
    }).length;

    setStats({ total: profiles.length, proUsers, trialUsers, freeUsers, totalGens, estRevenue, newToday, thisWeek, totalReviews: revs.length, totalHistory: history.length });
    setUsers(profiles);
    setReviews(revs);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []); // eslint-disable-line

  const saveUser = async () => {
    if (!editUser) return;
    setSaving(true);
    await supabase.from("profiles").update({
      generations_used: parseInt(editGens),
      generations_limit: parseInt(editLimit),
      plan: editPlan,
    }).eq("id", editUser.id);
    setEditUser(null);
    loadData();
    setSaving(false);
  };

  const deleteReview = async (id) => {
    await supabase.from("reviews").delete().eq("id", id);
    loadData();
  };

  const giveGens = async (userId, amount) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    await supabase.from("profiles").update({
      generations_limit: (user.generations_limit || 5) + amount
    }).eq("id", userId);
    loadData();
  };

  const filteredUsers = users.filter(u =>
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const planColor = (plan) => plan === "pro" ? "#4ade80" : plan === "trial" ? "#fbbf24" : "#64748b";

  const tabStyle = (tab) => ({
    padding: "10px 20px", borderRadius: 8, border: "none",
    background: activeTab === tab ? "#1c2a38" : "transparent",
    color: activeTab === tab ? "#f1f5f9" : "#64748b",
    fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15,
    fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: 1,
  });

  return (
    <div style={{ position:"fixed", inset:0, background:"#0a0f14", zIndex:400, overflowY:"auto" }}>
      {/* Header */}
      <div style={{ position:"sticky", top:0, zIndex:10, background:"rgba(10,15,20,0.95)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.08)", padding:"0 24px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:22, fontWeight:900, color:"#f1f5f9" }}>
          🔐 Admin <span style={{ color:"#4ade80" }}>Dashboard</span>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={loadData} style={{ padding:"8px 16px", borderRadius:6, border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:"#94a3b8", fontFamily:"'Barlow',sans-serif", fontSize:13, cursor:"pointer" }}>
            🔄 Refresh
          </button>
          <button onClick={onClose} style={{ padding:"8px 16px", borderRadius:6, border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:"#94a3b8", fontFamily:"'Barlow',sans-serif", fontSize:13, cursor:"pointer" }}>
            ✕ Close
          </button>
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"24px 20px 60px" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:80, color:"#64748b", fontSize:18 }}>Loading dashboard...</div>
        ) : (
          <>
            {/* Tabs */}
            <div style={{ display:"flex", gap:4, marginBottom:32, background:"rgba(255,255,255,0.04)", borderRadius:10, padding:4, width:"fit-content" }}>
              {[["overview","📊 Overview"],["users","👥 Users"],["reviews","⭐ Reviews"]].map(([tab, label]) => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(tab)}>{label}</button>
              ))}
            </div>

            {/* OVERVIEW TAB */}
            {activeTab === "overview" && stats && (
              <div>
                {/* Stats grid */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:32 }}>
                  {[
                    { label:"Total Users",       value:stats.total,        color:"#22d3ee", emoji:"👥" },
                    { label:"Pro Subscribers",   value:stats.proUsers,     color:"#4ade80", emoji:"⭐" },
                    { label:"Trial Users",       value:stats.trialUsers,   color:"#fbbf24", emoji:"🎯" },
                    { label:"Free Users",        value:stats.freeUsers,    color:"#64748b", emoji:"🆓" },
                    { label:"Est. Monthly Rev",  value:"£" + stats.estRevenue.toFixed(2), color:"#4ade80", emoji:"💰" },
                    { label:"Total Generations", value:stats.totalGens,    color:"#a78bfa", emoji:"⚡" },
                    { label:"New Today",         value:stats.newToday,     color:"#22d3ee", emoji:"🆕" },
                    { label:"New This Week",     value:stats.thisWeek,     color:"#fb923c", emoji:"📅" },
                  ].map(s => (
                    <div key={s.label} style={{ background:"#16202b", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:20 }}>
                      <div style={{ fontSize:24, marginBottom:8 }}>{s.emoji}</div>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:36, fontWeight:900, color:s.color }}>{s.value}</div>
                      <div style={{ fontSize:12, color:"#64748b", marginTop:4, textTransform:"uppercase", letterSpacing:1, fontWeight:700 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Plan breakdown */}
                <div style={{ background:"#16202b", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:24, marginBottom:24 }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:800, textTransform:"uppercase", color:"#f1f5f9", marginBottom:16 }}>Plan Breakdown</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    {[
                      { label:"Pro", count:stats.proUsers,   total:stats.total, color:"#4ade80" },
                      { label:"Trial", count:stats.trialUsers, total:stats.total, color:"#fbbf24" },
                      { label:"Free", count:stats.freeUsers,  total:stats.total, color:"#64748b" },
                    ].map(p => (
                      <div key={p.label}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                          <span style={{ fontSize:13, fontWeight:700, color:p.color }}>{p.label}</span>
                          <span style={{ fontSize:13, color:"#94a3b8" }}>{p.count} users ({stats.total > 0 ? Math.round((p.count/stats.total)*100) : 0}%)</span>
                        </div>
                        <div style={{ height:6, background:"rgba(255,255,255,0.06)", borderRadius:3, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:stats.total > 0 ? `${(p.count/stats.total)*100}%` : "0%", background:p.color, borderRadius:3 }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent signups */}
                <div style={{ background:"#16202b", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:24 }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:800, textTransform:"uppercase", color:"#f1f5f9", marginBottom:16 }}>Recent Signups</div>
                  {users.slice(0, 5).map(u => (
                    <div key={u.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                      <div>
                        <div style={{ fontSize:14, color:"#f1f5f9", fontWeight:600 }}>{u.email}</div>
                        <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{new Date(u.created_at).toLocaleDateString("en-GB")}</div>
                      </div>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <span style={{ fontSize:11, fontWeight:700, color:planColor(u.plan), padding:"3px 8px", borderRadius:4, background:`${planColor(u.plan)}15` }}>{(u.plan || "free").toUpperCase()}</span>
                        <span style={{ fontSize:12, color:"#64748b" }}>{u.generations_used || 0}/{u.generations_limit || 5} gens</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* USERS TAB */}
            {activeTab === "users" && (
              <div>
                <div style={{ marginBottom:16 }}>
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by email..."
                    style={{ width:"100%", maxWidth:400, padding:"10px 14px", borderRadius:8, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.05)", color:"#f1f5f9", fontFamily:"'Barlow',sans-serif", fontSize:14, outline:"none" }}/>
                </div>
                <div style={{ background:"#16202b", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, overflow:"hidden" }}>
                  <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:0, padding:"12px 16px", background:"#1c2a38", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
                    {["Email","Plan","Generations","Actions"].map(h => (
                      <div key={h} style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:1 }}>{h}</div>
                    ))}
                  </div>
                  <div style={{ maxHeight:500, overflowY:"auto" }}>
                    {filteredUsers.map(u => (
                      <div key={u.id} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:0, padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)", alignItems:"center" }}>
                        <div style={{ fontSize:13, color:"#f1f5f9", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.email}</div>
                        <div>
                          <span style={{ fontSize:11, fontWeight:700, color:planColor(u.plan), padding:"3px 8px", borderRadius:4, background:`${planColor(u.plan)}15` }}>
                            {(u.plan || "free").toUpperCase()}
                          </span>
                        </div>
                        <div style={{ fontSize:13, color:"#94a3b8" }}>{u.generations_used || 0}/{u.generations_limit || 5}</div>
                        <div style={{ display:"flex", gap:6 }}>
                          <button onClick={() => { setEditUser(u); setEditGens(String(u.generations_used || 0)); setEditPlan(u.plan || "free"); setEditLimit(String(u.generations_limit || 5)); }}
                            style={{ padding:"5px 10px", borderRadius:6, border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:"#94a3b8", fontSize:11, cursor:"pointer" }}>
                            Edit
                          </button>
                          <button onClick={() => giveGens(u.id, 10)}
                            style={{ padding:"5px 10px", borderRadius:6, border:"1px solid rgba(74,222,128,0.3)", background:"transparent", color:"#4ade80", fontSize:11, cursor:"pointer" }}>
                            +10
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Edit user modal */}
                {editUser && (
                  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
                    <div style={{ width:"100%", maxWidth:400, background:"#111820", border:"1px solid rgba(255,255,255,0.12)", borderRadius:16, padding:28 }}>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:800, textTransform:"uppercase", color:"#f1f5f9", marginBottom:4 }}>Edit User</div>
                      <div style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>{editUser.email}</div>
                      <div style={{ marginBottom:14 }}>
                        <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#94a3b8", letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 }}>Plan</label>
                        <select value={editPlan} onChange={e => setEditPlan(e.target.value)}
                          style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid rgba(255,255,255,0.1)", background:"#1e293b", color:"#f1f5f9", fontFamily:"'Barlow',sans-serif", fontSize:14, outline:"none" }}>
                          <option value="free">Free</option>
                          <option value="trial">Trial</option>
                          <option value="pro">Pro</option>
                        </select>
                      </div>
                      <div style={{ marginBottom:14 }}>
                        <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#94a3b8", letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 }}>Generations Used</label>
                        <input type="number" value={editGens} onChange={e => setEditGens(e.target.value)}
                          style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.05)", color:"#f1f5f9", fontFamily:"'Barlow',sans-serif", fontSize:14, outline:"none" }}/>
                      </div>
                      <div style={{ marginBottom:20 }}>
                        <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#94a3b8", letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 }}>Generations Limit</label>
                        <input type="number" value={editLimit} onChange={e => setEditLimit(e.target.value)}
                          style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.05)", color:"#f1f5f9", fontFamily:"'Barlow',sans-serif", fontSize:14, outline:"none" }}/>
                      </div>
                      <div style={{ display:"flex", gap:10 }}>
                        <button onClick={saveUser} disabled={saving}
                          style={{ flex:1, padding:12, borderRadius:8, border:"none", background:"linear-gradient(135deg,#16a34a,#4ade80)", color:"#052e16", fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:800, textTransform:"uppercase", cursor:"pointer" }}>
                          {saving ? "Saving..." : "Save Changes"}
                        </button>
                        <button onClick={() => setEditUser(null)}
                          style={{ flex:1, padding:12, borderRadius:8, border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:"#94a3b8", fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:700, textTransform:"uppercase", cursor:"pointer" }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* REVIEWS TAB */}
            {activeTab === "reviews" && (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {reviews.length === 0
                  ? <div style={{ textAlign:"center", padding:40, color:"#64748b" }}>No reviews yet</div>
                  : reviews.map(r => (
                    <div key={r.id} style={{ background:"#16202b", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:20 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                        <div>
                          <div style={{ fontWeight:700, fontSize:15, color:"#f1f5f9" }}>{r.name} {r.club && <span style={{ fontSize:12, color:"#64748b" }}>— {r.club}</span>}</div>
                          <div style={{ color:"#fbbf24", fontSize:16, marginTop:4 }}>{"★".repeat(r.rating)}{"☆".repeat(5-r.rating)}</div>
                        </div>
                        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                          <div style={{ fontSize:11, color:"#64748b" }}>{new Date(r.created_at).toLocaleDateString("en-GB")}</div>
                          <button onClick={() => deleteReview(r.id)}
                            style={{ padding:"5px 12px", borderRadius:6, border:"1px solid rgba(248,113,113,0.3)", background:"transparent", color:"#f87171", fontSize:12, cursor:"pointer" }}>
                            Delete
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize:14, color:"#94a3b8", lineHeight:1.7 }}>{r.review}</div>
                    </div>
                  ))
                }
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
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

// ── Change Password Modal ──────────────────────────────────────────────────
function ChangePasswordModal({ onClose, showToast }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState("");

  const [success, setSuccess] = useState(false);

  const handleChange = async () => {
    if (!newPassword || !confirmPassword) { setError("Please fill in all fields"); return; }
    if (newPassword.length < 6) { setError("New password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { setError("New passwords do not match"); return; }
    setLoading(true); setError("");
    try {
      const { error: e } = await supabase.auth.updateUser({ password: newPassword });
      if (e) throw e;
      // Show success state inline first, then close after a short delay
      setLoading(false);
      setSuccess(true);
      setTimeout(() => { showToast("✅ Password changed successfully!"); onClose(); }, 1500);
      return;
    } catch (e) {
      setError(e.message || "Failed to change password");
      setLoading(false);
    }
  };

  if (success) return (
    <div style={{ width:"100%", maxWidth:400, background:"#111820", border:"1px solid rgba(74,222,128,0.3)", borderRadius:20, padding:40, textAlign:"center" }}>
      <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:24, fontWeight:900, textTransform:"uppercase", color:"#4ade80", marginBottom:8 }}>Password Changed!</div>
      <div style={{ fontSize:14, color:"#64748b" }}>Closing in a moment…</div>
    </div>
  );

  return (
    <div style={{ width:"100%", maxWidth:400, background:"#111820", border:"1px solid rgba(255,255,255,0.12)", borderRadius:20, padding:32 }}>
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:24, fontWeight:900, textTransform:"uppercase", color:"#f1f5f9", marginBottom:4 }}>Change Password</div>
        <div style={{ fontSize:13, color:"#64748b" }}>Enter your new password below</div>
      </div>
      <div style={{ marginBottom:14 }}>
        <label htmlFor="cp-new" style={{ display:"block", fontSize:11, fontWeight:700, color:"#94a3b8", letterSpacing:"1.2px", textTransform:"uppercase", marginBottom:6 }}>🔑 New Password</label>
        <input id="cp-new" name="new-password" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}
          placeholder="Min. 6 characters" style={IS} onFocus={fo} onBlur={bl} autoComplete="new-password"/>
      </div>
      <div style={{ marginBottom:14 }}>
        <label htmlFor="cp-confirm" style={{ display:"block", fontSize:11, fontWeight:700, color:"#94a3b8", letterSpacing:"1.2px", textTransform:"uppercase", marginBottom:6 }}>✅ Confirm New Password</label>
        <input id="cp-confirm" name="confirm-password" type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}
          placeholder="Repeat new password" onKeyDown={e=>e.key==="Enter"&&handleChange()}
          style={IS} onFocus={fo} onBlur={bl} autoComplete="new-password"/>
      </div>
      {error && (
        <div style={{ color:"#f87171", fontSize:13, marginBottom:12, padding:"8px 12px", background:"rgba(248,113,113,0.06)", borderRadius:6 }}>⚠️ {error}</div>
      )}
      <button onClick={handleChange} disabled={loading || success}
        style={{ width:"100%", padding:13, borderRadius:8, border:"none", background:"linear-gradient(135deg,#16a34a,#4ade80)", color:"#052e16", fontFamily:"'Barlow Condensed',sans-serif", fontSize:17, fontWeight:800, textTransform:"uppercase", letterSpacing:1, cursor:loading?"not-allowed":"pointer", marginBottom:10, opacity:loading?0.7:1 }}>
        {loading ? "Saving…" : "Change Password"}
      </button>
      <button onClick={onClose}
        style={{ width:"100%", padding:11, borderRadius:8, border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:"#64748b", fontFamily:"'Barlow',sans-serif", fontSize:14, cursor:"pointer" }}>
        Cancel
      </button>
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
  const [showLanding,  setShowLanding]  = useState(true);
  const [showAdmin,    setShowAdmin]    = useState(false);
  const [isAdmin,      setIsAdmin]      = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [referralCount, setReferralCount] = useState(0);
  const [showLegal,    setShowLegal]    = useState(null);
  const [successPlan, setSuccessPlan] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(""),4000); };



  // Handle Stripe redirect
  useEffect(()=>{
    const params = new URLSearchParams(window.location.search);
    const upgraded = params.get("upgraded");
    const cancelled = params.get("cancelled");
    if (upgraded) {
      setSuccessPlan(upgraded);
      supabase.auth.getUser().then(({data:{user}})=>{
        if (user) {
          const updates = upgraded==="elite" ? {plan:"elite",generations_limit:70} : upgraded==="pro" ? {plan:"pro",generations_limit:35} : {plan:"trial",generations_limit:10};
          supabase.from("profiles").update(updates).eq("id",user.id);
          loadProfile(user.id);
        }
      });
      window.history.replaceState({},"",window.location.pathname);
    }
    if (cancelled) { showToast("❌ Payment cancelled"); window.history.replaceState({},"",window.location.pathname); }
  },[]); // eslint-disable-line

  useEffect(()=>{
    supabase.auth.getSession().then(async ({data:{session}})=>{
      if(session?.user){
        setUser(session.user);
        loadProfile(session.user.id);
        loadHistory(session.user.id);
        const token = await registerSession(session.user.id);
        setSessionToken(token);
      }
      setAuthLoading(false);
    });
    const {data:{subscription}} = supabase.auth.onAuthStateChange(async (_,session)=>{
      if(session?.user){
        setUser(session.user);
        loadProfile(session.user.id);
        loadHistory(session.user.id);
        const token = await registerSession(session.user.id);
        setSessionToken(token);
        // Check if this login was triggered by OTP password reset
      } else {
        setUser(null);setProfile(null);setHistory([]);setSessionToken(null);
      }
    });
    return ()=>subscription.unsubscribe();
  },[]);

  const loadProfile = async (uid) => {
    const {data} = await supabase.from("profiles").select("*").eq("id",uid).single();
    if(data) {
      setProfile(data);
    } else {
      // Profile missing — set a default in state so the app loads; 
      // the DB insert may be blocked by RLS (handled server-side via trigger ideally)
      const { data: authData } = await supabase.auth.getUser();
      const newProfile = { id: uid, email: authData?.user?.email || "", plan: "free", generations_used: 0, generations_limit: 5, created_at: new Date().toISOString() };
      try { await supabase.from("profiles").upsert(newProfile, { onConflict: "id", ignoreDuplicates: true }); } catch(_) {}
      setProfile(newProfile);
    }
    loadHistory(uid);
    const {data:adminData} = await supabase.from("admins").select("id").eq("id",uid).single();
    if(adminData) setIsAdmin(true);
    // Load referral count
    const {data:refData} = await supabase.from("referrals").select("id").eq("referrer_id",uid).eq("completed",true);
    if(refData) setReferralCount(refData.length);
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


  // ── Session management ────────────────────────────────────────────────────
  const registerSession = async (uid) => {
    // Generate a unique token for this browser session
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    setSessionToken(token);
    localStorage.setItem("gafferai_session", token);

    // Delete any old sessions for this user and insert new one
    await supabase.from("sessions").delete().eq("user_id", uid);
    await supabase.from("sessions").insert({
      user_id: uid,
      session_token: token,
      created_at: new Date().toISOString(),
      last_seen: new Date().toISOString()
    });

    // Start heartbeat to keep session alive and detect conflicts
    return token;
  };

  const checkSession = async (uid, token) => {
    if (!uid || !token) return;
    const { data } = await supabase.from("sessions")
      .select("session_token")
      .eq("user_id", uid)
      .single();

    if (data && data.session_token !== token) {
      // Another device has logged in — log this session out
      localStorage.removeItem("gafferai_session");
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setHistory([]);
      setSessionToken(null);
      // Use alert so it definitely shows even after signOut
      alert("You have been logged out because your account was signed in on another device.");
    } else if (data) {
      // Update last seen
      await supabase.from("sessions").update({ last_seen: new Date().toISOString() }).eq("user_id", uid).eq("session_token", token);
    }
  };

  const MSGS = ["🧠 Drawing up tactics…","📋 Building your session…","✍️ Writing the report…","⭐ Crafting feedback…","📲 Creating your post…"];
  useEffect(()=>{ if(!loading) return; const iv=setInterval(()=>setLoadMsg(m=>(m+1)%MSGS.length),1600); return()=>clearInterval(iv); },[loading]); // eslint-disable-line

  // Session heartbeat — check every 60 seconds if session is still valid
  useEffect(()=>{
    if (!user || !sessionToken) return;
    const iv = setInterval(()=>checkSession(user.id, sessionToken), 60000);
    return ()=>clearInterval(iv);
  },[user, sessionToken]); // eslint-disable-line

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
  const logout = async () => {
    try {
      if (user) await supabase.from("sessions").delete().eq("user_id", user.id);
    } catch(e) { console.log("Session cleanup:", e); }
    try {
      localStorage.removeItem("gafferai_session");
    } catch(e) {}
    try {
      await supabase.auth.signOut();
    } catch(e) { console.log("SignOut error:", e); }
    setUser(null);
    setProfile(null);
    setHistory([]);
    setSessionToken(null);
    setShowMobileMenu(false);
    goHome();
  };

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

    /* Nav hamburger */
    .nav-desktop{display:flex;gap:6px;align-items:center}
    .nav-hamburger{display:none;background:transparent;border:1px solid rgba(255,255,255,0.12);color:#f1f5f9;width:38px;height:38px;border-radius:8px;font-size:18px;cursor:pointer;align-items:center;justify-content:center}
    @media(max-width:768px){
      .nav-desktop{display:none}
      .nav-hamburger{display:flex}
    }

    /* ── Mobile optimisation ── */
    @media(max-width:480px){
      /* Nav */
      .nav{padding:0 12px;height:56px}
      .nav-logo{font-size:18px}
      .chip{padding:5px 8px;font-size:11px}

      /* Hero */
      .hero-title{font-size:52px}

      /* Tool grid — single column on small phones */
      .tool-grid{grid-template-columns:1fr}
      .tcard{padding:16px 14px}

      /* Forms — always single column on mobile */
      .form-wrap{grid-template-columns:1fr;padding-top:16px;gap:16px}
      .output-wrap{grid-template-columns:1fr;padding-top:16px;gap:16px}

      /* Panels */
      .panel{padding:16px}

      /* Output */
      .out-content{padding:14px;font-size:13px;max-height:400px}

      /* History drawer */
      .hist-panel{padding:16px;border-radius:12px 12px 0 0}

      /* Breadcrumb */
      .bc{font-size:11px;gap:4px}

      /* Gen button */
      .gen-btn{font-size:14px;padding:12px}

      /* Upgrade modal */
      .upgrade-modal{padding:20px}

      /* Page padding */
      .page-wrap{padding:0 12px 40px}
    }

    @media(max-width:360px){
      .nav-logo{font-size:16px}
      .chip{display:none}
      .chip:last-child{display:block}
    }

    /* Tablet */
    @media(min-width:481px) and (max-width:768px){
      .tool-grid{grid-template-columns:1fr 1fr}
      .form-wrap{grid-template-columns:1fr}
      .output-wrap{grid-template-columns:1fr}
      .nav{padding:0 16px}
    }

    /* Touch targets — minimum 44px for all buttons */
    @media(max-width:768px){
      button{min-height:44px}
      select,input,textarea{min-height:44px;font-size:16px}
      .chip{min-height:36px}
    }
  `;

  // Check both state and localStorage for password reset
  // Clear any stuck password reset flag
  localStorage.removeItem("gafferai_password_reset");

  if (authLoading) return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#0a0f14",overflow:"hidden",position:"relative"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;900&family=Barlow:wght@300;400&display=swap');
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(0.97)}}
        @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        @keyframes fadeUp{0%{opacity:0;transform:translateY(20px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(74,222,128,0.2)}50%{box-shadow:0 0 60px rgba(74,222,128,0.5)}}
        .load-logo{animation:pulse 2s ease-in-out infinite}
        .load-spinner{animation:spin 1s linear infinite}
        .load-text{animation:fadeUp 0.8s ease forwards}
        .load-sub{animation:fadeUp 0.8s ease 0.3s forwards;opacity:0}
        .load-bar{animation:fadeUp 0.8s ease 0.5s forwards;opacity:0}
      `}</style>

      {/* Background glow */}
      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(74,222,128,0.08) 0%,transparent 70%)",pointerEvents:"none"}}/>

      {/* Logo */}
      <div className="load-logo" style={{marginBottom:32}}>
        <img src="/logo192.png" alt="GafferAI" style={{width:96,height:96,borderRadius:20,boxShadow:"0 0 40px rgba(74,222,128,0.3)"}}/>
      </div>

      {/* Brand name */}
      <div className="load-text" style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:48,fontWeight:900,color:"#f1f5f9",letterSpacing:2,marginBottom:8}}>
        Gaffer<span style={{color:"#4ade80"}}>AI</span>
      </div>

      {/* Tagline */}
      <div className="load-sub" style={{fontFamily:"'Barlow',sans-serif",fontSize:14,color:"#64748b",letterSpacing:1,marginBottom:48,fontWeight:300}}>
        AI toolkit for grassroots coaches
      </div>

      {/* Loading bar */}
      <div className="load-bar" style={{width:200,height:3,background:"rgba(255,255,255,0.06)",borderRadius:3,overflow:"hidden",position:"relative"}}>
        <div style={{position:"absolute",top:0,left:0,height:"100%",width:"100%",background:"linear-gradient(90deg,transparent,#4ade80,transparent)",animation:"spin 1.5s linear infinite",transform:"translateX(-100%)"}}/>
        <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}`}</style>
        <div style={{position:"absolute",top:0,left:0,height:"100%",width:"40%",background:"linear-gradient(90deg,transparent,#4ade80,transparent)",animation:"shimmer 1.5s ease-in-out infinite"}}/>
      </div>
    </div>
  );
  if (!user) {
    if (showLegal) return (
      <>
        <LandingPage onGetStarted={() => setShowLanding(false)} onLegal={(page) => setShowLegal(page)} />
        <LegalPage page={showLegal} onClose={() => setShowLegal(null)} />
      </>
    );
    if (showLanding) return <LandingPage onGetStarted={() => setShowLanding(false)} onLegal={(page) => setShowLegal(page)} />;
    return <><style>{css}</style><AuthScreen onAuth={u=>{setUser(u);loadProfile(u.id);}}/></>;
  }

  return (
    <>
      <style>{css}</style>
      <div className="app">
        {successPlan&&<SuccessBanner plan={successPlan} onClose={()=>setSuccessPlan(null)}/>}
        {toast&&<div className="toast">{toast}</div>}
        {showUpgrade&&<UpgradeModal onClose={()=>setShowUpgrade(false)} user={user} profile={profile}/>}

        <nav className="nav">
          <div className="nav-logo" onClick={goHome}>⚽ Gaffer<span>AI</span></div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {profile&&<GenCounter used={profile.generations_used} limit={profile.generations_limit} plan={profile.plan}/>}
            {/* Desktop nav */}
            <div className="nav-desktop">
              {screen!=="home"&&<button className="chip" onClick={goHome}>🏠 Home</button>}
              {screen==="output"&&<button className="chip" onClick={()=>{setScreen("tool");setOutput("");}}>✏️ Edit</button>}
              <button className="chip" onClick={()=>setShowHistory(true)}>📜 History{history.length>0&&` (${history.length})`}</button>
              <button className="chip" onClick={()=>setShowReviews(true)}>⭐ Reviews</button>
              <button className="chip" onClick={()=>setShowLegal("contact")}>✉️ Contact</button>
              <button className="chip" onClick={()=>setShowUpgrade(true)}>⚡ Upgrade</button>
              <button className="chip" onClick={()=>setShowReferral(true)}>🔗 Refer{referralCount>0&&` (${referralCount})`}</button>
              {isAdmin&&<button className="chip" onClick={()=>setShowAdmin(true)} style={{color:"#f472b6",borderColor:"rgba(244,114,182,0.3)"}}>🔐 Admin</button>}
              <button className="chip" onClick={logout}>🚪 Log Out</button>
            </div>
            {/* Mobile hamburger */}
            <button className="nav-hamburger" onClick={()=>setShowMobileMenu(m=>!m)}>☰</button>
          </div>
        </nav>

        {/* Mobile menu */}
        {showMobileMenu&&(
          <div style={{position:"fixed",inset:0,zIndex:150,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(4px)"}} onClick={()=>setShowMobileMenu(false)}>
            <div style={{position:"fixed",top:0,right:0,bottom:0,width:"75vw",maxWidth:280,background:"#111820",borderLeft:"1px solid rgba(255,255,255,0.08)",overflowY:"auto",padding:"16px 0"}} onClick={e=>e.stopPropagation()}>
              {/* Menu header */}
              <div style={{padding:"12px 16px 16px",borderBottom:"1px solid rgba(255,255,255,0.08)",marginBottom:8}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:900,color:"#f1f5f9"}}>⚽ Gaffer<span style={{color:"#4ade80"}}>AI</span></div>
                {profile&&<div style={{fontSize:12,color:"#64748b",marginTop:4}}>{profile.plan==="pro"?"⭐ Pro":profile.plan==="trial"?"🎯 Trial":"🆓 Free"} · {Math.max(0,profile.generations_limit-profile.generations_used)} gens left</div>}
              </div>
              {/* Menu items */}
              {[
                screen!=="home" && {label:"🏠 Home", color:"#f1f5f9", action:()=>{goHome();setShowMobileMenu(false);}},
                screen==="output" && {label:"✏️ Edit", color:"#f1f5f9", action:()=>{setScreen("tool");setOutput("");setShowMobileMenu(false);}},
                {label:`📜 History${history.length>0?" ("+history.length+")":""}`, color:"#f1f5f9", action:()=>{setShowHistory(true);setShowMobileMenu(false);}},
                {label:"⭐ Reviews", color:"#f1f5f9", action:()=>{setShowReviews(true);setShowMobileMenu(false);}},
                {label:`🔗 Refer${referralCount>0?" ("+referralCount+")":""}`, color:"#f1f5f9", action:()=>{setShowReferral(true);setShowMobileMenu(false);}},
                {label:"✉️ Contact", color:"#f1f5f9", action:()=>{setShowLegal("contact");setShowMobileMenu(false);}},
                {label:"🔒 Change Password", color:"#f1f5f9", action:()=>{setShowChangePassword(true);setShowMobileMenu(false);}},
                {label:"⚡ Upgrade", color:"#fbbf24", action:()=>{setShowUpgrade(true);setShowMobileMenu(false);}},
                isAdmin && {label:"🔐 Admin", color:"#f472b6", action:()=>{setShowAdmin(true);setShowMobileMenu(false);}},
              ].filter(Boolean).map((item,i)=>(
                <button key={i} onClick={item.action}
                  style={{width:"100%",padding:"16px 20px",textAlign:"left",background:"transparent",border:"none",color:item.color,fontFamily:"'Barlow',sans-serif",fontSize:15,cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,0.04)",display:"block",minHeight:52}}>
                  {item.label}
                </button>
              ))}
              {/* Log out at bottom */}
              <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",marginTop:8,paddingTop:8}}>
                <button
                  onClick={()=>{ setShowMobileMenu(false); setTimeout(()=>logout(), 200); }}
                  style={{width:"100%",padding:"16px 20px",textAlign:"left",background:"transparent",border:"none",color:"#f87171",fontFamily:"'Barlow',sans-serif",fontSize:15,cursor:"pointer",display:"block",minHeight:52,fontWeight:600}}>
                  🚪 Log Out
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="page-wrap" style={{maxWidth:1100,margin:"0 auto",padding:"0 20px 60px"}}>

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

        {showReferral&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(8px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>e.target===e.currentTarget&&setShowReferral(false)}>
            <div style={{width:"100%",maxWidth:480,background:"#111820",border:"1px solid rgba(255,255,255,0.12)",borderRadius:20,padding:32}}>
              <div style={{textAlign:"center",marginBottom:24}}>
                <div style={{fontSize:48,marginBottom:12}}>🔗</div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:26,fontWeight:900,textTransform:"uppercase",marginBottom:8}}>Refer a Coach</div>
                <div style={{fontSize:14,color:"#64748b"}}>Share your link and both you and your friend get 5 bonus generations when they sign up!</div>
              </div>
              <div style={{background:"rgba(74,222,128,0.06)",border:"1px solid rgba(74,222,128,0.2)",borderRadius:12,padding:16,marginBottom:20}}>
                <div style={{fontSize:11,fontWeight:700,color:"#4ade80",letterSpacing:"1px",textTransform:"uppercase",marginBottom:8}}>Your Referral Link</div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <div style={{flex:1,fontSize:13,color:"#f1f5f9",wordBreak:"break-all",fontFamily:"monospace",background:"rgba(255,255,255,0.05)",padding:"8px 12px",borderRadius:6}}>
                    {`https://gaffer-ai-eight.vercel.app?ref=${user?.id?.slice(0,8)}`}
                  </div>
                  <button onClick={()=>{navigator.clipboard.writeText(`https://gaffer-ai-eight.vercel.app?ref=${user?.id?.slice(0,8)}`);showToast("Link copied!");}}
                    style={{padding:"8px 16px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#16a34a,#4ade80)",color:"#052e16",fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:800,textTransform:"uppercase",cursor:"pointer",whiteSpace:"nowrap"}}>
                    Copy
                  </button>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
                <div style={{background:"#16202b",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:16,textAlign:"center"}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:36,fontWeight:900,color:"#4ade80"}}>{referralCount}</div>
                  <div style={{fontSize:12,color:"#64748b",marginTop:4}}>Successful Referrals</div>
                </div>
                <div style={{background:"#16202b",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:16,textAlign:"center"}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:36,fontWeight:900,color:"#4ade80"}}>{referralCount * 5}</div>
                  <div style={{fontSize:12,color:"#64748b",marginTop:4}}>Bonus Gens Earned</div>
                </div>
              </div>
              <div style={{background:"#16202b",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:16,marginBottom:20}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:700,textTransform:"uppercase",color:"#94a3b8",marginBottom:12}}>How It Works</div>
                {[
                  {n:"1",t:"Copy your unique referral link above"},
                  {n:"2",t:"Share it with coaches in your club or community"},
                  {n:"3",t:"When they sign up you both get 5 bonus generations instantly"},
                ].map(s=>(
                  <div key={s.n} style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:10}}>
                    <div style={{width:24,height:24,borderRadius:"50%",background:"linear-gradient(135deg,#16a34a,#4ade80)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:900,color:"#052e16"}}>{s.n}</div>
                    <div style={{fontSize:13,color:"#94a3b8",paddingTop:3}}>{s.t}</div>
                  </div>
                ))}
              </div>
              <button onClick={()=>setShowReferral(false)} style={{width:"100%",padding:12,borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"#64748b",fontFamily:"'Barlow',sans-serif",fontSize:14,cursor:"pointer"}}>Close</button>
            </div>
          </div>
        )}

        {/* Change Password Modal */}
        {showChangePassword&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(8px)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
            <ChangePasswordModal onClose={()=>setShowChangePassword(false)} showToast={showToast}/>
          </div>
        )}

        {showLegal&&<LegalPage page={showLegal} onClose={()=>setShowLegal(null)}/>}
        {showAdmin&&<AdminDashboard onClose={()=>setShowAdmin(false)}/>}
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
