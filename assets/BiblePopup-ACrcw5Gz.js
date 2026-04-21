import{c as C,j as e,r as o,X as _,L as W,S as $,b as I,B as q,g as Y,P as F,v as Q}from"./index-CvV50j59.js";import{W as Z}from"./wifi-off-ByLNVaxK.js";import{E as ee}from"./external-link-BuPHS6hw.js";import{C as te}from"./circle-check-BDbeNVGm.js";/**
 * @license lucide-react v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const se=C("ChevronDown",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-react v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const me=C("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);/**
 * @license lucide-react v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ie=C("ChevronUp",[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]]);/**
 * @license lucide-react v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ne=C("Copy",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]]);async function re(i,t){try{const n=encodeURIComponent(i),a=await fetch(`https://bible-api.com/${n}?translation=${t}`);if(!a.ok)return null;const u=await a.json();return u?.verses?.length?{reference:u.reference??i,translation:t.toUpperCase(),verses:u.verses.map(c=>({verse:c.verse,text:c.text.trim()}))}:null}catch{return null}}function oe(i,t){return`You are a Christian theologian with strong expertise in Seventh-day Adventist Church doctrine, biblical exegesis, and systematic theology. Your goal is not only accuracy, but to help the reader grow in clear understanding step-by-step.

The verse being studied is: **${i}**
"${t}"

Guide me through it using this progressive structure:

**1. The Verse (Foundation)**
Quote the verse exactly in KJV and ESV.

---

**2. Immediate Context (Zoom Out Slightly)**
Provide 2 verses before and after (KJV). Briefly explain what is happening in this passage in plain terms.

---

**3. Simple Meaning (Clarity First)**
Explain the verse in clear, simple language. What is this verse saying directly? Avoid theological jargon.

---

**4. Deeper Meaning (Build Understanding)**
Key themes, spiritual principles, and doctrinal significance. Distinguish what the text says vs what it teaches.

---

**5. Original Language Insight (Precision Layer)**
Key words in Hebrew/Greek: original term + transliteration + meaning in context.

---

**6. Biblical Context (Big Picture)**
Place the verse within the chapter, the book, and the Bible story (creation to fall to redemption to restoration).

---

**7. Spirit of Prophecy Insight**
Relevant insight from Ellen G. White directly tied to the verse, with source reference.

---

**8. Supporting Biblical Connections**
Related verses with brief explanation of how they connect.

---

**9. Adventist Understanding**
How this verse is understood within SDA theology: Great Controversy, Law and Grace, Sanctuary if applicable.

---

**10. Broader Christian Perspective**
Insight from John Piper only if it adds practical or theological value.

---

**11. Advanced Insights (Only if Present)**
Literary structure, typology, prophetic or end-time connections (Daniel/Revelation) if relevant.

---

**12. Practical Application (Transformation)**
What does this mean for my life? What should change in thinking or behavior?

---

**13. Confidence Indicator**
For key sections: High = clear and strongly supported | Medium = reasonable but interpretive | Low = speculative or debated.

---

**14. Sermon Insight (Simple Summary)**
3 to 5 lines capturing the core spiritual message.`}async function ae(i,t,n,a){const u=oe(i,t),c=Y(),E=[...c?F.filter(d=>d.id===c):[],...F.filter(d=>d.id!==c)];for(const d of E){const g=Q(d.id);if(!g)continue;const k=[{role:"user",content:u}];try{if(d.id==="claude"){const l=await fetch(d.endpoint,{method:"POST",headers:{"Content-Type":"application/json","x-api-key":g,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:d.model,max_tokens:4096,stream:!0,messages:k}),signal:a});if(!l.ok||!l.body)continue;const m=l.body.getReader(),v=new TextDecoder;for(;;){const{done:y,value:b}=await m.read();if(y)break;for(const p of v.decode(b).split(`
`))if(p.startsWith("data: "))try{const x=JSON.parse(p.slice(6))?.delta?.text??"";x&&n(x)}catch{}}return}else{const l={"Content-Type":"application/json",Authorization:`Bearer ${g}`};d.id==="openrouter"&&(l["HTTP-Referer"]="https://leemcq.github.io/joy-in-the-journey/",l["X-Title"]="Joy in the Journey");const m=await fetch(d.endpoint,{method:"POST",headers:l,body:JSON.stringify({model:d.model,max_tokens:4096,stream:!0,messages:k}),signal:a});if(!m.ok||!m.body)continue;const v=m.body.getReader(),y=new TextDecoder;for(;;){const{done:b,value:p}=await v.read();if(b)break;for(const x of y.decode(p).split(`
`))if(!(!x.startsWith("data: ")||x.includes("[DONE]")))try{const w=JSON.parse(x.slice(6))?.choices?.[0]?.delta?.content??"";w&&n(w)}catch{}}return}}catch(l){if(l.name==="AbortError")throw l;continue}}throw new Error("No AI provider configured. Add an API key in More → Settings.")}function le({text:i}){return e.jsx(e.Fragment,{children:i.split(`
`).map((t,n)=>t.startsWith("**")&&t.endsWith("**")&&t.length>4?e.jsx("p",{className:"text-gold-400 font-bold text-sm mt-4 mb-1 leading-snug",children:t.slice(2,-2)},n):t.startsWith("---")?e.jsx("hr",{className:"border-white/10 my-3"},n):t.startsWith("- ")||t.startsWith("• ")?e.jsxs("div",{className:"flex gap-2 text-sm text-white/80 mb-1",children:[e.jsx("span",{className:"text-gold-400 flex-shrink-0 mt-0.5",children:"•"}),e.jsx("span",{children:J(t.slice(2))})]},n):t.trim()===""?e.jsx("div",{className:"h-1"},n):e.jsx("p",{className:"text-sm text-white/85 leading-relaxed mb-0.5",children:J(t)},n))})}function J(i){return i.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((t,n)=>t.startsWith("**")&&t.endsWith("**")?e.jsx("strong",{className:"text-white font-semibold",children:t.slice(2,-2)},n):t.startsWith("*")&&t.endsWith("*")?e.jsx("em",{className:"text-gold-200 italic",children:t.slice(1,-1)},n):t)}function B({label:i,active:t,onClick:n}){return e.jsx("button",{onClick:n,className:I("px-4 py-1.5 rounded-xl text-sm font-bold transition-all flex-shrink-0",t?"bg-gold-500 text-navy-900 shadow-md":"bg-white/8 text-white/60 hover:bg-white/15 hover:text-white"),children:i})}function pe({reference:i,onClose:t,onOpenReader:n}){return i?e.jsx(ce,{reference:i,onClose:t,onOpenReader:n}):null}function ce({reference:i,onClose:t,onOpenReader:n}){const[a,u]=o.useState("kjv"),[c,E]=o.useState({}),[d,g]=o.useState({kjv:!0}),[k,l]=o.useState({}),[m,v]=o.useState(!1),[y,b]=o.useState(navigator.onLine),[p,x]=o.useState(!1),[w,z]=o.useState(""),[f,A]=o.useState(!1),[O,R]=o.useState(null),[V,D]=o.useState(!1),j=o.useRef(null),N=o.useRef(null);o.useEffect(()=>{const s=()=>b(!0),r=()=>b(!1);return window.addEventListener("online",s),window.addEventListener("offline",r),()=>{window.removeEventListener("online",s),window.removeEventListener("offline",r)}},[]);const T=o.useCallback(async s=>{if(!c[s]){g(r=>({...r,[s]:!0})),l(r=>({...r,[s]:void 0}));try{const r=await re(i,s);r?E(h=>({...h,[s]:r})):l(h=>({...h,[s]:s==="esv"?"ESV_EXTERNAL":"Verse not found. Check your connection."}))}catch{l(r=>({...r,[s]:"Could not load verse."}))}finally{g(r=>({...r,[s]:!1}))}}},[i,c]);o.useEffect(()=>{T("kjv")},[i,T]),o.useEffect(()=>()=>{j.current?.abort()},[]);const L=s=>{u(s),T(s)},H=()=>{const s=c[a];if(!s)return;const r=`${s.reference} (${s.translation})

${s.verses.map(h=>`${h.verse} ${h.text}`).join(`
`)}`;navigator.clipboard.writeText(r).then(()=>{v(!0),setTimeout(()=>v(!1),2e3)})},U=async()=>{j.current?.abort(),j.current=new AbortController;const r=(c[a]??c.kjv)?.verses.map(h=>h.text).join(" ")??i;x(!0),D(!1),z(""),R(null),A(!0);try{await ae(i,r,h=>{z(X=>X+h),requestAnimationFrame(()=>{N.current&&(N.current.scrollTop=N.current.scrollHeight)})},j.current.signal)}catch(h){h.name!=="AbortError"&&R(h.message??"AI request failed.")}finally{A(!1)}},G=()=>{j.current?.abort(),A(!1)},S=c[a],K=d[a],P=k[a],M=P==="ESV_EXTERNAL";return e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"fixed inset-0 z-40 bg-black/60 backdrop-blur-sm",onClick:t,"aria-hidden":"true"}),e.jsxs("div",{className:"fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-navy-800 rounded-t-2xl shadow-2xl",style:{maxHeight:"88dvh",paddingBottom:"max(env(safe-area-inset-bottom, 0px), 16px)"},role:"dialog","aria-modal":"true","aria-label":`Scripture: ${i}`,onClick:s=>s.stopPropagation(),children:[e.jsx("div",{className:"flex justify-center pt-3 pb-1 flex-shrink-0",children:e.jsx("div",{className:"w-10 h-1 rounded-full bg-white/20"})}),e.jsxs("div",{className:"flex items-start justify-between px-5 pb-3 flex-shrink-0",children:[e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("p",{className:"text-gold-500 text-xs font-bold tracking-widest uppercase mb-1",children:"Scripture"}),e.jsx("h2",{className:"text-white text-xl font-bold leading-tight pr-4",children:i})]}),e.jsx("button",{onClick:t,className:"p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 mt-1","aria-label":"Close",children:e.jsx(_,{size:20})})]}),e.jsxs("div",{className:"flex items-center gap-2 px-5 pb-3 flex-shrink-0",style:{overflowX:"auto",WebkitOverflowScrolling:"touch"},children:[e.jsx(B,{label:"KJV",active:a==="kjv",onClick:()=>L("kjv")}),e.jsx(B,{label:"WEB",active:a==="web",onClick:()=>L("web")}),e.jsx(B,{label:"ESV",active:a==="esv",onClick:()=>L("esv")}),e.jsx("div",{className:"w-px h-6 bg-white/15 mx-1 flex-shrink-0"}),e.jsxs("button",{onClick:U,disabled:f,className:I("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold","border transition-all duration-200 flex-shrink-0",p?"bg-gold-500/25 border-gold-500/50 text-gold-300":"bg-white/8 border-white/20 text-white/70 hover:bg-gold-500/15 hover:border-gold-500/40 hover:text-gold-300",f&&"cursor-not-allowed opacity-70"),children:[f?e.jsx(W,{size:12,className:"animate-spin"}):e.jsx($,{size:12}),e.jsx("span",{children:f?"Thinking…":"Ask AI"})]}),!y&&e.jsxs("div",{className:"flex items-center gap-1 text-white/40 flex-shrink-0 ml-1",children:[e.jsx(Z,{size:12}),e.jsx("span",{className:"text-xs",children:"Offline"})]})]}),e.jsxs("div",{className:"flex-1 overflow-y-auto px-5 space-y-3 pb-2",style:{WebkitOverflowScrolling:"touch"},children:[e.jsx("div",{className:"bg-navy-700/60 rounded-xl p-4 min-h-[80px]",children:K?e.jsx("div",{className:"flex items-center justify-center py-8",children:e.jsx(W,{size:24,className:"animate-spin text-gold-400"})}):M?e.jsxs("div",{className:"flex flex-col items-center gap-3 py-4",children:[e.jsx("p",{className:"text-white/50 text-sm text-center",children:"ESV is not available offline."}),e.jsxs("a",{href:`https://www.biblegateway.com/passage/?search=${encodeURIComponent(i)}&version=ESV`,target:"_blank",rel:"noopener noreferrer",className:"flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-500/15 text-gold-400 text-sm font-semibold hover:bg-gold-500/25 transition-colors",children:[e.jsx(ee,{size:14}),"View ESV on Bible Gateway"]})]}):P?e.jsx("div",{className:"text-center py-4",children:e.jsx("p",{className:"text-white/50 text-sm",children:P})}):S?e.jsxs("div",{className:"space-y-3",children:[S.verses.map(s=>e.jsxs("p",{className:"text-white leading-relaxed",children:[e.jsx("sup",{className:"text-gold-400 font-bold text-xs mr-1.5 select-none",children:s.verse}),s.text]},s.verse)),e.jsx("p",{className:"text-white/25 text-xs text-right mt-1",children:S.translation})]}):null}),p&&e.jsxs("div",{className:"bg-navy-700/80 border border-gold-500/20 rounded-xl overflow-hidden",children:[e.jsxs("div",{className:"flex items-center justify-between px-4 py-3 border-b border-white/8 flex-shrink-0",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx($,{size:13,className:"text-gold-400"}),e.jsx("span",{className:"text-gold-400 text-xs font-bold tracking-wide uppercase",children:"Theological Deep Dive"}),f&&e.jsx(W,{size:11,className:"animate-spin text-gold-400/60 ml-1"})]}),e.jsxs("div",{className:"flex items-center gap-3",children:[f&&e.jsx("button",{onClick:G,className:"text-white/40 hover:text-white/70 text-xs transition-colors",children:"Stop"}),e.jsx("button",{onClick:()=>D(s=>!s),className:"text-white/40 hover:text-white/70 transition-colors",children:V?e.jsx(se,{size:16}):e.jsx(ie,{size:16})})]})]}),!V&&e.jsx("div",{ref:N,className:"px-4 py-3 space-y-0.5",style:{maxHeight:"50dvh",overflowY:"auto",WebkitOverflowScrolling:"touch"},children:O?e.jsx("p",{className:"text-red-400 text-sm",children:O}):w?e.jsx(le,{text:w}):f?e.jsx("p",{className:"text-white/40 text-sm italic animate-pulse",children:"Studying the scripture…"}):null})]})]}),e.jsxs("div",{className:"flex items-center gap-3 px-5 pt-3 border-t border-white/8 flex-shrink-0",children:[e.jsx("button",{onClick:H,disabled:!S,className:I("flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl text-sm font-semibold transition-all","bg-white/8 text-white/70 hover:bg-white/15 hover:text-white","disabled:opacity-30 disabled:cursor-not-allowed"),children:m?e.jsxs(e.Fragment,{children:[e.jsx(te,{size:15,className:"text-green-400"}),e.jsx("span",{className:"text-green-400",children:"Copied!"})]}):e.jsxs(e.Fragment,{children:[e.jsx(ne,{size:15}),e.jsx("span",{children:"Copy"})]})}),n&&e.jsxs("button",{onClick:()=>{n(i),t()},className:"flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl text-sm font-semibold bg-gold-500/15 text-gold-400 hover:bg-gold-500/25 transition-all",children:[e.jsx(q,{size:15}),e.jsx("span",{children:"Open in Reader"})]})]})]})]})}export{pe as B,ie as C,se as a,me as b};
