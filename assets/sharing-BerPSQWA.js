import{c as s}from"./index-CdQ4hyRs.js";/**
 * @license lucide-react v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const r=s("Copy",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]]);/**
 * @license lucide-react v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i=s("Share2",[["circle",{cx:"18",cy:"5",r:"3",key:"gq8acd"}],["circle",{cx:"6",cy:"12",r:"3",key:"w7nqdw"}],["circle",{cx:"18",cy:"19",r:"3",key:"1xt0gg"}],["line",{x1:"8.59",x2:"15.42",y1:"13.51",y2:"17.49",key:"47mynk"}],["line",{x1:"15.41",x2:"8.59",y1:"6.51",y2:"10.49",key:"1n3mei"}]]),n="leemcq.github.io/joy-in-the-journey";function y(e){const t=["✝️ *SDA Bible Study Companion*","📖 Ek het voltooi / I just completed:",`*Study ${e.studyNumber}: ${e.studyTitle}*`,""];return e.keyAnswer&&(t.push("My reflection:"),t.push(`_"${e.keyAnswer.slice(0,150)}${e.keyAnswer.length>150?"…":""}"_`),t.push("")),e.keyVerse&&(t.push(`📖 Key verse: ${e.keyVerse}`),t.push("")),e.streakDays>1&&(t.push(`🔥 ${e.streakDays} day study streak`),t.push("")),t.push("Join the 28-study journey:",n),t.join(`
`)}function c(e){return[`✝️ *${e.reference}* (${e.translation.toUpperCase()})`,"",`_"${e.text}"_`,"","— SDA Bible Study Companion",n].join(`
`)}function u(e){return["✝️ *SDA Bible Study Companion*",`📖 Studying: _${e.studyTitle}_`,"",`*Question:* ${e.question.slice(0,100)}`,"","*My reflection:*",`_"${e.answer.slice(0,200)}${e.answer.length>200?"…":""}"_`,"",n].join(`
`)}async function a(e){if(navigator.share){await navigator.share({text:e});return}window.open(`https://wa.me/?text=${encodeURIComponent(e)}`,"_blank")}async function p(e,t){try{await a(e)}catch{try{await navigator.clipboard.writeText(e),t("Copied to clipboard — paste into WhatsApp")}catch{t("Could not share — please copy manually")}}}export{r as C,i as S,c as a,u as b,y as f,p as s};
