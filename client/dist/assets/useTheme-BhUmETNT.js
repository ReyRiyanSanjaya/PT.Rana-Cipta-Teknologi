import{h as d,r as s}from"./index-QA1NWkMA.js";/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=d("Menu",[["line",{x1:"4",x2:"20",y1:"12",y2:"12",key:"1e0a9i"}],["line",{x1:"4",x2:"20",y1:"6",y2:"6",key:"1owob3"}],["line",{x1:"4",x2:"20",y1:"18",y2:"18",key:"yk5zj1"}]]);/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w=d("Moon",[["path",{d:"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z",key:"a7tn18"}]]);/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=d("Sun",[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]]),h=()=>{if(typeof window>"u")return"light";const e=localStorage.getItem("theme");return e==="dark"||e==="light"?e:document.documentElement.classList.contains("dark")||window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"},r=e=>{const t=window.document.documentElement;e==="dark"?t.classList.add("dark"):t.classList.remove("dark"),localStorage.setItem("theme",e)},g=()=>{const[e,t]=s.useState(h);s.useEffect(()=>{r(e)},[e]),s.useEffect(()=>{const n=o=>{const c=o.detail||h();t(i=>i!==c?c:i)},a=o=>{o.key==="theme"&&(o.newValue==="dark"||o.newValue==="light")&&t(o.newValue)};return window.addEventListener("themechange",n),window.addEventListener("storage",a),()=>{window.removeEventListener("themechange",n),window.removeEventListener("storage",a)}},[]);const m=s.useCallback(n=>{t(n),r(n),window.dispatchEvent(new CustomEvent("themechange",{detail:n}))},[]),l=s.useCallback(()=>{t(n=>{const a=n==="dark"?"light":"dark";return r(a),window.dispatchEvent(new CustomEvent("themechange",{detail:a})),a})},[]);return{theme:e,setTheme:m,toggleTheme:l}};export{w as M,y as S,u as a,g as u};
