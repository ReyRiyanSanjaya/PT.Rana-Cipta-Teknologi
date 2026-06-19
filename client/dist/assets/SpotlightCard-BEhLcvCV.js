import{h as y,r as o,j as n,m as b}from"./index-QA1NWkMA.js";/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M=y("CheckCircle2",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]),C=({children:i,className:c="",spotlightColor:l="rgba(47, 122, 217, 0.15)"})=>{const t=o.useRef(null),[s,d]=o.useState({x:0,y:0}),[u,e]=o.useState(0),p=r=>{if(!t.current)return;const a=t.current.getBoundingClientRect();d({x:r.clientX-a.left,y:r.clientY-a.top})},x=()=>{e(1)},h=()=>{e(0)},v=()=>{e(1)},m=()=>{e(0)};return n.jsxs(b.div,{ref:t,onMouseMove:p,onFocus:x,onBlur:h,onMouseEnter:v,onMouseLeave:m,className:`relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl ${c}`,whileHover:{y:-5},transition:{duration:.3},children:[n.jsx("div",{className:"pointer-events-none absolute -inset-px opacity-0 transition duration-300",style:{opacity:u,background:`radial-gradient(600px circle at ${s.x}px ${s.y}px, ${l}, transparent 40%)`}}),n.jsx("div",{className:"relative h-full",children:i})]})};export{M as C,C as S};
