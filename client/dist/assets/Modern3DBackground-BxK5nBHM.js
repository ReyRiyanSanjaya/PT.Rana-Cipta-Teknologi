import{r,j as o}from"./index-QA1NWkMA.js";import{M as A,S as z,U as k,R as I,C as E,u as M,A as O,V as C,a as V,e as T,b as U,_ as D,c as B,d as N,f as $,F as G}from"./Float-4YxLV3Jx.js";function H(e,t,a,i){const l=class extends z{constructor(c={}){const f=Object.entries(e);super({uniforms:f.reduce((n,[u,s])=>{const g=k.clone({[u]:{value:s}});return{...n,...g}},{}),vertexShader:t,fragmentShader:a}),this.key="",f.forEach(([n])=>Object.defineProperty(this,n,{get:()=>this.uniforms[n].value,set:u=>this.uniforms[n].value=u})),Object.assign(this,c)}};return l.key=A.generateUUID(),l}const L=()=>parseInt(I.replace(/\D+/g,"")),F=L();class W extends z{constructor(){super({uniforms:{time:{value:0},fade:{value:1}},vertexShader:`
      uniform float time;
      attribute float size;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 0.5);
        gl_PointSize = size * (30.0 / -mvPosition.z) * (3.0 + sin(time + 100.0));
        gl_Position = projectionMatrix * mvPosition;
      }`,fragmentShader:`
      uniform sampler2D pointTexture;
      uniform float fade;
      varying vec3 vColor;
      void main() {
        float opacity = 1.0;
        if (fade == 1.0) {
          float d = distance(gl_PointCoord, vec2(0.5, 0.5));
          opacity = 1.0 / (1.0 + exp(16.0 * (d - 0.25)));
        }
        gl_FragColor = vec4(vColor, opacity);

        #include <tonemapping_fragment>
	      #include <${F>=154?"colorspace_fragment":"encodings_fragment"}>
      }`})}}const J=e=>new C().setFromSpherical(new V(e,Math.acos(1-Math.random()*2),Math.random()*2*Math.PI)),q=r.forwardRef(({radius:e=100,depth:t=50,count:a=5e3,saturation:i=0,factor:l=4,fade:y=!1,speed:c=1},f)=>{const n=r.useRef(),[u,s,g]=r.useMemo(()=>{const d=[],b=[],j=Array.from({length:a},()=>(.5+.5*Math.random())*l),p=new E;let x=e+t;const P=t/a;for(let m=0;m<a;m++)x-=P*Math.random(),d.push(...J(x).toArray()),p.setHSL(m/a,i,.9),b.push(p.r,p.g,p.b);return[new Float32Array(d),new Float32Array(b),new Float32Array(j)]},[a,t,l,e,i]);M(d=>n.current&&(n.current.uniforms.time.value=d.clock.getElapsedTime()*c));const[h]=r.useState(()=>new W);return r.createElement("points",{ref:f},r.createElement("bufferGeometry",null,r.createElement("bufferAttribute",{attach:"attributes-position",args:[u,3]}),r.createElement("bufferAttribute",{attach:"attributes-color",args:[s,3]}),r.createElement("bufferAttribute",{attach:"attributes-size",args:[g,1]})),r.createElement("primitive",{ref:n,object:h,attach:"material",blending:O,"uniforms-fade-value":y,depthWrite:!1,transparent:!0,vertexColors:!0}))}),K=H({time:0,pixelRatio:1},` uniform float pixelRatio;
    uniform float time;
    attribute float size;  
    attribute float speed;  
    attribute float opacity;
    attribute vec3 noise;
    attribute vec3 color;
    varying vec3 vColor;
    varying float vOpacity;
    void main() {
      vec4 modelPosition = modelMatrix * vec4(position, 1.0);
      modelPosition.y += sin(time * speed + modelPosition.x * noise.x * 100.0) * 0.2;
      modelPosition.z += cos(time * speed + modelPosition.x * noise.y * 100.0) * 0.2;
      modelPosition.x += cos(time * speed + modelPosition.x * noise.z * 100.0) * 0.2;
      vec4 viewPosition = viewMatrix * modelPosition;
      vec4 projectionPostion = projectionMatrix * viewPosition;
      gl_Position = projectionPostion;
      gl_PointSize = size * 25. * pixelRatio;
      gl_PointSize *= (1.0 / - viewPosition.z);
      vColor = color;
      vOpacity = opacity;
    }`,` varying vec3 vColor;
    varying float vOpacity;
    void main() {
      float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
      float strength = 0.05 / distanceToCenter - 0.1;
      gl_FragColor = vec4(vColor, strength * vOpacity);
      #include <tonemapping_fragment>
      #include <${F>=154?"colorspace_fragment":"encodings_fragment"}>
    }`),_=e=>e&&e.constructor===Float32Array,Q=e=>[e.r,e.g,e.b],w=e=>e instanceof B||e instanceof C||e instanceof N,R=e=>Array.isArray(e)?e:w(e)?e.toArray():[e,e,e];function v(e,t,a){return r.useMemo(()=>{if(t!==void 0){if(_(t))return t;if(t instanceof E){const i=Array.from({length:e*3},()=>Q(t)).flat();return Float32Array.from(i)}else if(w(t)||Array.isArray(t)){const i=Array.from({length:e*3},()=>R(t)).flat();return Float32Array.from(i)}return Float32Array.from({length:e},()=>t)}return Float32Array.from({length:e},a)},[t])}const S=r.forwardRef(({noise:e=1,count:t=100,speed:a=1,opacity:i=1,scale:l=1,size:y,color:c,children:f,...n},u)=>{r.useMemo(()=>T({SparklesImplMaterial:K}),[]);const s=r.useRef(null),g=U(m=>m.viewport.dpr),h=R(l),d=r.useMemo(()=>Float32Array.from(Array.from({length:t},()=>h.map(A.randFloatSpread)).flat()),[t,...h]),b=v(t,y,Math.random),j=v(t,i),p=v(t,a),x=v(t*3,e),P=v(c===void 0?t*3:t,_(c)?c:new E(c),()=>1);return M(m=>{s.current&&s.current.material&&(s.current.material.time=m.clock.elapsedTime)}),r.useImperativeHandle(u,()=>s.current,[]),r.createElement("points",D({key:`particle-${t}-${JSON.stringify(l)}`},n,{ref:s}),r.createElement("bufferGeometry",null,r.createElement("bufferAttribute",{attach:"attributes-position",args:[d,3]}),r.createElement("bufferAttribute",{attach:"attributes-size",args:[b,1]}),r.createElement("bufferAttribute",{attach:"attributes-opacity",args:[j,1]}),r.createElement("bufferAttribute",{attach:"attributes-speed",args:[p,1]}),r.createElement("bufferAttribute",{attach:"attributes-color",args:[P,3]}),r.createElement("bufferAttribute",{attach:"attributes-noise",args:[x,3]})),f||r.createElement("sparklesImplMaterial",{transparent:!0,pixelRatio:g,depthWrite:!1}))}),X=()=>{const e=r.useRef();return M(t=>{e.current&&(e.current.rotation.y=t.clock.getElapsedTime()*.05,e.current.rotation.x=Math.sin(t.clock.getElapsedTime()*.05)*.1)}),o.jsx("group",{ref:e,children:o.jsx(q,{radius:100,depth:50,count:5e3,factor:4,saturation:0,fade:!0,speed:1})})},Y=()=>{const e=r.useRef();return M(t=>{if(e.current){const{x:a,y:i}=t.pointer;e.current.rotation.x=A.lerp(e.current.rotation.x,-i*.2,.1),e.current.rotation.y=A.lerp(e.current.rotation.y,a*.2,.1)}}),o.jsxs("group",{ref:e,children:[o.jsx(S,{count:200,scale:12,size:4,speed:.4,opacity:.5,color:"#14B8A6"}),o.jsx(S,{count:100,scale:10,size:2,speed:.2,opacity:.3,color:"#38BDF8"})]})},Z=()=>o.jsxs(o.Fragment,{children:[o.jsx("color",{attach:"background",args:["#0f172a"]})," ",o.jsx("ambientLight",{intensity:.5}),o.jsx(X,{}),o.jsx(G,{speed:2,rotationIntensity:.5,floatIntensity:.5,children:o.jsx(Y,{})}),o.jsx("fog",{attach:"fog",args:["#0f172a",5,20]})]}),oe=()=>o.jsxs("div",{className:"fixed inset-0 z-0 w-full h-full pointer-events-none bg-slate-900",children:[o.jsx($,{camera:{position:[0,0,5],fov:60},children:o.jsx(r.Suspense,{fallback:null,children:o.jsx(Z,{})})}),o.jsx("div",{className:"absolute inset-0 bg-gradient-to-b from-slate-900/50 via-transparent to-slate-900/80 pointer-events-none"})]});export{oe as M};
