import{c as F,j as e,r as a,X as q,L,S as D,b as z,E as K,n as Y,m as Q,d as Z,B as ee,g as te,P as V,F as se}from"./index-Cf0nbteY.js";import{W as ie}from"./wifi-off-Dj9b1UWO.js";/**
 * @license lucide-react v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xe=F("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);/**
 * @license lucide-react v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ne=F("Copy",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]]);async function re(i,t){try{const n=encodeURIComponent(i),o=await fetch(`https://bible-api.com/${n}?translation=${t}`);if(!o.ok)return null;const p=await o.json();return p?.verses?.length?{reference:p.reference??i,translation:t.toUpperCase(),verses:p.verses.map(c=>({verse:c.verse,text:c.text.trim()}))}:null}catch{return null}}function ae(i,t){return`You are a Christian theologian with strong expertise in Seventh-day Adventist Church doctrine, biblical exegesis, and systematic theology. Your goal is not only accuracy, but to help the reader grow in clear understanding step-by-step.

The verse being studied is: **${i}**
"${t}"

Guide me through this passage using the following progressive structure. Build each section upon the previous one, moving from simple understanding to deeper biblical insight. Keep Christ at the center and ensure every conclusion is supported by Scripture. Distinguish clearly between what the text explicitly states and reasonable theological implications. Skip any section that is not genuinely applicable rather than forcing an answer.

1. Simple Meaning (Clarity First)

Explain the passage in plain, modern language. What is the author directly saying? Avoid theological jargon.

---

2. Deeper Meaning (Understanding the Message)

Identify the central themes, spiritual principles, and doctrinal significance. Clearly distinguish:

- What the text says
- What the text teaches
- What should not be inferred beyond the text

---

3. Original Language Insight (Precision Layer)

Highlight key Hebrew or Greek words by providing:

- Original word
- Transliteration
- Literal meaning
- Meaning within this context
- Why the word choice matters

---

4. Biblical Context (Big Picture)

Explain how this passage fits within:

- The surrounding chapter
- The overall purpose of the book
- The unfolding biblical story of Creation, Fall, Redemption, and Restoration

---

5. Spirit of Prophecy Insight

Provide relevant insights from Ellen G. White that directly illuminate the passage, including the source reference. Use only where genuinely applicable.

---

6. Supporting Biblical Connections

List key cross-references and briefly explain how each passage reinforces, expands, or balances the teaching.

---

7. Adventist Understanding

Explain how Seventh-day Adventist theology understands this passage, especially regarding themes such as:

- The Great Controversy
- Law and Grace
- The Sanctuary
- The Sabbath
- The State of the Dead
- The Second Coming
- The Character of God

Include only themes relevant to the passage.

---

8. Broader Christian Perspective

Briefly summarize how respected evangelical scholars (particularly John Piper and Desiring God) interpret or apply the passage when their insights add meaningful theological or practical value.

---

9. Advanced Insights

Where applicable, discuss:

- Literary structure
- Symbolism
- Typology
- Covenant themes
- Messianic fulfillment
- Prophetic significance
- Daniel/Revelation or end-time connections

Do not force these if absent.

---

10. Practical Application (Transformation)

Explain how this passage should shape:

- My understanding of God
- My relationship with Christ
- My character
- My daily decisions
- My spiritual walk and mission

Provide specific, practical applications.

---

11. Sermon Insight (Memorable Summary)

Summarize the heart of the passage in 3–5 powerful sentences that capture its central message and can be remembered or taught to others.

---

12. Key Takeaway

State the single most important truth the passage teaches in one concise sentence.

---

13. Further Study

Provide three progressively deeper research questions:

1. Understanding the text
2. Exploring the theology
3. Applying the truth to Christian living`}async function oe(i,t,n,o){const p=ae(i,t),c=te(),C=[...c?V.filter(d=>d.id===c):[],...V.filter(d=>d.id!==c)];for(const d of C){const f=se(d.id);if(!f)continue;const k=[{role:"user",content:p}];try{if(d.id==="claude"){const l=await fetch(d.endpoint,{method:"POST",headers:{"Content-Type":"application/json","x-api-key":f,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:d.model,max_tokens:4096,stream:!0,messages:k}),signal:o});if(!l.ok||!l.body)continue;const u=l.body.getReader(),b=new TextDecoder;for(;;){const{done:v,value:y}=await u.read();if(v)break;for(const m of b.decode(y).split(`
`))if(m.startsWith("data: "))try{const x=JSON.parse(m.slice(6))?.delta?.text??"";x&&n(x)}catch{}}return}else{const l={"Content-Type":"application/json",Authorization:`Bearer ${f}`};d.id==="openrouter"&&(l["HTTP-Referer"]="https://leemcq.github.io/joy-in-the-journey/",l["X-Title"]="Joy in the Journey");const u=await fetch(d.endpoint,{method:"POST",headers:l,body:JSON.stringify({model:d.model,max_tokens:4096,stream:!0,messages:k}),signal:o});if(!u.ok||!u.body)continue;const b=u.body.getReader(),v=new TextDecoder;for(;;){const{done:y,value:m}=await b.read();if(y)break;for(const x of v.decode(m).split(`
`))if(!(!x.startsWith("data: ")||x.includes("[DONE]")))try{const w=JSON.parse(x.slice(6))?.choices?.[0]?.delta?.content??"";w&&n(w)}catch{}}return}}catch(l){if(l.name==="AbortError")throw l;continue}}throw new Error("No AI provider configured. Add an API key in More → Settings.")}function le({text:i}){return e.jsx(e.Fragment,{children:i.split(`
`).map((t,n)=>t.startsWith("**")&&t.endsWith("**")&&t.length>4?e.jsx("p",{className:"text-gold-400 font-bold text-sm mt-4 mb-1 leading-snug",children:t.slice(2,-2)},n):t.startsWith("---")?e.jsx("hr",{className:"border-white/10 my-3"},n):t.startsWith("- ")||t.startsWith("• ")?e.jsxs("div",{className:"flex gap-2 text-sm text-white/80 mb-1",children:[e.jsx("span",{className:"text-gold-400 flex-shrink-0 mt-0.5",children:"•"}),e.jsx("span",{children:$(t.slice(2))})]},n):t.trim()===""?e.jsx("div",{className:"h-1"},n):e.jsx("p",{className:"text-sm text-white/85 leading-relaxed mb-0.5",children:$(t)},n))})}function $(i){return i.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((t,n)=>t.startsWith("**")&&t.endsWith("**")?e.jsx("strong",{className:"text-white font-semibold",children:t.slice(2,-2)},n):t.startsWith("*")&&t.endsWith("*")?e.jsx("em",{className:"text-gold-200 italic",children:t.slice(1,-1)},n):t)}function P({label:i,active:t,onClick:n}){return e.jsx("button",{onClick:n,className:z("px-4 py-1.5 rounded-xl text-sm font-bold transition-all flex-shrink-0",t?"bg-gold-500 text-navy-900 shadow-md":"bg-white/8 text-white/60 hover:bg-white/15 hover:text-white"),children:i})}function pe({reference:i,onClose:t,onOpenReader:n}){return i?e.jsx(ce,{reference:i,onClose:t,onOpenReader:n}):null}function ce({reference:i,onClose:t,onOpenReader:n}){const[o,p]=a.useState("kjv"),[c,C]=a.useState({}),[d,f]=a.useState({kjv:!0}),[k,l]=a.useState({}),[u,b]=a.useState(!1),[v,y]=a.useState(navigator.onLine),[m,x]=a.useState(!1),[w,B]=a.useState(""),[g,T]=a.useState(!1),[I,O]=a.useState(null),[R,M]=a.useState(!1),j=a.useRef(null),N=a.useRef(null);a.useEffect(()=>{const s=()=>y(!0),r=()=>y(!1);return window.addEventListener("online",s),window.addEventListener("offline",r),()=>{window.removeEventListener("online",s),window.removeEventListener("offline",r)}},[]);const E=a.useCallback(async s=>{if(!c[s]){f(r=>({...r,[s]:!0})),l(r=>({...r,[s]:void 0}));try{const r=await re(i,s);r?C(h=>({...h,[s]:r})):l(h=>({...h,[s]:s==="esv"?"ESV_EXTERNAL":"Verse not found. Check your connection."}))}catch{l(r=>({...r,[s]:"Could not load verse."}))}finally{f(r=>({...r,[s]:!1}))}}},[i,c]);a.useEffect(()=>{E("kjv")},[i,E]),a.useEffect(()=>()=>{j.current?.abort()},[]);const A=s=>{p(s),E(s)},G=()=>{const s=c[o];if(!s)return;const r=`${s.reference} (${s.translation})

${s.verses.map(h=>`${h.verse} ${h.text}`).join(`
`)}`;navigator.clipboard.writeText(r).then(()=>{b(!0),setTimeout(()=>b(!1),2e3)})},J=async()=>{j.current?.abort(),j.current=new AbortController;const r=(c[o]??c.kjv)?.verses.map(h=>h.text).join(" ")??i;x(!0),M(!1),B(""),O(null),T(!0);try{await oe(i,r,h=>{B(_=>_+h),requestAnimationFrame(()=>{N.current&&(N.current.scrollTop=N.current.scrollHeight)})},j.current.signal)}catch(h){h.name!=="AbortError"&&O(h.message??"AI request failed.")}finally{T(!1)}},U=()=>{j.current?.abort(),T(!1)},S=c[o],H=d[o],W=k[o],X=W==="ESV_EXTERNAL";return e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"fixed inset-0 z-40 bg-black/60 backdrop-blur-sm",onClick:t,"aria-hidden":"true"}),e.jsxs("div",{className:"fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-navy-800 rounded-t-2xl shadow-2xl",style:{maxHeight:"88dvh",paddingBottom:"max(env(safe-area-inset-bottom, 0px), 16px)"},role:"dialog","aria-modal":"true","aria-label":`Scripture: ${i}`,onClick:s=>s.stopPropagation(),children:[e.jsx("div",{className:"flex justify-center pt-3 pb-1 flex-shrink-0",children:e.jsx("div",{className:"w-10 h-1 rounded-full bg-white/20"})}),e.jsxs("div",{className:"flex items-start justify-between px-5 pb-3 flex-shrink-0",children:[e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("p",{className:"text-gold-500 text-xs font-bold tracking-widest uppercase mb-1",children:"Scripture"}),e.jsx("h2",{className:"text-white text-xl font-bold leading-tight pr-4",children:i})]}),e.jsx("button",{onClick:t,className:"p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 mt-1","aria-label":"Close",children:e.jsx(q,{size:20})})]}),e.jsxs("div",{className:"flex items-center gap-2 px-5 pb-3 flex-shrink-0",style:{overflowX:"auto",WebkitOverflowScrolling:"touch"},children:[e.jsx(P,{label:"KJV",active:o==="kjv",onClick:()=>A("kjv")}),e.jsx(P,{label:"WEB",active:o==="web",onClick:()=>A("web")}),e.jsx(P,{label:"ESV",active:o==="esv",onClick:()=>A("esv")}),e.jsx("div",{className:"w-px h-6 bg-white/15 mx-1 flex-shrink-0"}),e.jsxs("button",{onClick:J,disabled:g,className:z("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold","border transition-all duration-200 flex-shrink-0",m?"bg-gold-500/25 border-gold-500/50 text-gold-300":"bg-white/8 border-white/20 text-white/70 hover:bg-gold-500/15 hover:border-gold-500/40 hover:text-gold-300",g&&"cursor-not-allowed opacity-70"),children:[g?e.jsx(L,{size:12,className:"animate-spin"}):e.jsx(D,{size:12}),e.jsx("span",{children:g?"Thinking…":"Ask AI"})]}),!v&&e.jsxs("div",{className:"flex items-center gap-1 text-white/40 flex-shrink-0 ml-1",children:[e.jsx(ie,{size:12}),e.jsx("span",{className:"text-xs",children:"Offline"})]})]}),e.jsxs("div",{className:"flex-1 overflow-y-auto px-5 space-y-3 pb-2",style:{WebkitOverflowScrolling:"touch"},children:[e.jsx("div",{className:"bg-navy-700/60 rounded-xl p-4 min-h-[80px]",children:H?e.jsx("div",{className:"flex items-center justify-center py-8",children:e.jsx(L,{size:24,className:"animate-spin text-gold-400"})}):X?e.jsxs("div",{className:"flex flex-col items-center gap-3 py-4",children:[e.jsx("p",{className:"text-white/50 text-sm text-center",children:"ESV is not available offline."}),e.jsxs("a",{href:`https://www.biblegateway.com/passage/?search=${encodeURIComponent(i)}&version=ESV`,target:"_blank",rel:"noopener noreferrer",className:"flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-500/15 text-gold-400 text-sm font-semibold hover:bg-gold-500/25 transition-colors",children:[e.jsx(K,{size:14}),"View ESV on Bible Gateway"]})]}):W?e.jsx("div",{className:"text-center py-4",children:e.jsx("p",{className:"text-white/50 text-sm",children:W})}):S?e.jsxs("div",{className:"space-y-3",children:[S.verses.map(s=>e.jsxs("p",{className:"text-white leading-relaxed",children:[e.jsx("sup",{className:"text-gold-400 font-bold text-xs mr-1.5 select-none",children:s.verse}),s.text]},s.verse)),e.jsx("p",{className:"text-white/25 text-xs text-right mt-1",children:S.translation})]}):null}),m&&e.jsxs("div",{className:"bg-navy-700/80 border border-gold-500/20 rounded-xl overflow-hidden",children:[e.jsxs("div",{className:"flex items-center justify-between px-4 py-3 border-b border-white/8 flex-shrink-0",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(D,{size:13,className:"text-gold-400"}),e.jsx("span",{className:"text-gold-400 text-xs font-bold tracking-wide uppercase",children:"Theological Deep Dive"}),g&&e.jsx(L,{size:11,className:"animate-spin text-gold-400/60 ml-1"})]}),e.jsxs("div",{className:"flex items-center gap-3",children:[g&&e.jsx("button",{onClick:U,className:"text-white/40 hover:text-white/70 text-xs transition-colors",children:"Stop"}),e.jsx("button",{onClick:()=>M(s=>!s),className:"text-white/40 hover:text-white/70 transition-colors",children:R?e.jsx(Y,{size:16}):e.jsx(Q,{size:16})})]})]}),!R&&e.jsx("div",{ref:N,className:"px-4 py-3 space-y-0.5",style:{maxHeight:"50dvh",overflowY:"auto",WebkitOverflowScrolling:"touch"},children:I?e.jsx("p",{className:"text-red-400 text-sm",children:I}):w?e.jsx(le,{text:w}):g?e.jsx("p",{className:"text-white/40 text-sm italic animate-pulse",children:"Studying the scripture…"}):null})]})]}),e.jsxs("div",{className:"flex items-center gap-3 px-5 pt-3 border-t border-white/8 flex-shrink-0",children:[e.jsx("button",{onClick:G,disabled:!S,className:z("flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl text-sm font-semibold transition-all","bg-white/8 text-white/70 hover:bg-white/15 hover:text-white","disabled:opacity-30 disabled:cursor-not-allowed"),children:u?e.jsxs(e.Fragment,{children:[e.jsx(Z,{size:15,className:"text-green-400"}),e.jsx("span",{className:"text-green-400",children:"Copied!"})]}):e.jsxs(e.Fragment,{children:[e.jsx(ne,{size:15}),e.jsx("span",{children:"Copy"})]})}),n&&e.jsxs("button",{onClick:()=>{n(i),t()},className:"flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl text-sm font-semibold bg-gold-500/15 text-gold-400 hover:bg-gold-500/25 transition-all",children:[e.jsx(ee,{size:15}),e.jsx("span",{children:"Open in Reader"})]})]})]})]})}export{pe as B,xe as C};
