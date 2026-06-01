import{r as t}from"./index-BAeXWbVN.js";import{z as M,A as _,U as R,t as P,i as E,E as k,V as z,S as O,x as S,G as j,u as T,_ as U,a as V,o as I}from"./constants-BtsA4DUg.js";function $(e,r,o,i){const l=class extends _{constructor(c={}){const u=Object.entries(e);super({uniforms:u.reduce((a,[m,n])=>{const d=R.clone({[m]:{value:n}});return{...a,...d}},{}),vertexShader:r,fragmentShader:o}),this.key="",u.forEach(([a])=>Object.defineProperty(this,a,{get:()=>this.uniforms[a].value,set:m=>this.uniforms[a].value=m})),Object.assign(this,c)}};return l.key=M.generateUUID(),l}const N=t.forwardRef(({children:e,enabled:r=!0,speed:o=1,rotationIntensity:i=1,floatIntensity:l=1,floatingRange:f=[-.1,.1],...c},u)=>{const a=t.useRef(null);t.useImperativeHandle(u,()=>a.current,[]);const m=t.useRef(Math.random()*1e4);return P(n=>{var d,p;if(!r||o===0)return;const s=m.current+n.clock.getElapsedTime();a.current.rotation.x=Math.cos(s/4*o)/8*i,a.current.rotation.y=Math.sin(s/4*o)/8*i,a.current.rotation.z=Math.sin(s/4*o)/20*i;let g=Math.sin(s/4*o)/10;g=M.mapLinear(g,-.1,.1,(d=f==null?void 0:f[0])!==null&&d!==void 0?d:-.1,(p=f==null?void 0:f[1])!==null&&p!==void 0?p:.1),a.current.position.y=g*l,a.current.updateMatrix()}),t.createElement("group",c,t.createElement("group",{ref:a,matrixAutoUpdate:!1},e))});class G extends _{constructor(){super({uniforms:{time:{value:0},fade:{value:1}},vertexShader:`
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
	      #include <${S>=154?"colorspace_fragment":"encodings_fragment"}>
      }`})}}const H=e=>new z().setFromSpherical(new O(e,Math.acos(1-Math.random()*2),Math.random()*2*Math.PI)),q=t.forwardRef(({radius:e=100,depth:r=50,count:o=5e3,saturation:i=0,factor:l=4,fade:f=!1,speed:c=1},u)=>{const a=t.useRef(),[m,n,d]=t.useMemo(()=>{const s=[],g=[],A=Array.from({length:o},()=>(.5+.5*Math.random())*l),y=new E;let b=e+r;const x=r/o;for(let v=0;v<o;v++)b-=x*Math.random(),s.push(...H(b).toArray()),y.setHSL(v/o,i,.9),g.push(y.r,y.g,y.b);return[new Float32Array(s),new Float32Array(g),new Float32Array(A)]},[o,r,l,e,i]);P(s=>a.current&&(a.current.uniforms.time.value=s.clock.getElapsedTime()*c));const[p]=t.useState(()=>new G);return t.createElement("points",{ref:u},t.createElement("bufferGeometry",null,t.createElement("bufferAttribute",{attach:"attributes-position",args:[m,3]}),t.createElement("bufferAttribute",{attach:"attributes-color",args:[n,3]}),t.createElement("bufferAttribute",{attach:"attributes-size",args:[d,1]})),t.createElement("primitive",{ref:a,object:p,attach:"material",blending:k,"uniforms-fade-value":f,depthWrite:!1,transparent:!0,vertexColors:!0}))}),D=$({time:0,pixelRatio:1},` uniform float pixelRatio;
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
      #include <${S>=154?"colorspace_fragment":"encodings_fragment"}>
    }`),w=e=>e&&e.constructor===Float32Array,L=e=>[e.r,e.g,e.b],C=e=>e instanceof V||e instanceof z||e instanceof I,F=e=>Array.isArray(e)?e:C(e)?e.toArray():[e,e,e];function h(e,r,o){return t.useMemo(()=>{if(r!==void 0){if(w(r))return r;if(r instanceof E){const i=Array.from({length:e*3},()=>L(r)).flat();return Float32Array.from(i)}else if(C(r)||Array.isArray(r)){const i=Array.from({length:e*3},()=>F(r)).flat();return Float32Array.from(i)}return Float32Array.from({length:e},()=>r)}return Float32Array.from({length:e},o)},[r])}const K=t.forwardRef(({noise:e=1,count:r=100,speed:o=1,opacity:i=1,scale:l=1,size:f,color:c,children:u,...a},m)=>{t.useMemo(()=>j({SparklesImplMaterial:D}),[]);const n=t.useRef(null),d=T(v=>v.viewport.dpr),p=F(l),s=t.useMemo(()=>Float32Array.from(Array.from({length:r},()=>p.map(M.randFloatSpread)).flat()),[r,...p]),g=h(r,f,Math.random),A=h(r,i),y=h(r,o),b=h(r*3,e),x=h(c===void 0?r*3:r,w(c)?c:new E(c),()=>1);return P(v=>{n.current&&n.current.material&&(n.current.material.time=v.clock.elapsedTime)}),t.useImperativeHandle(m,()=>n.current,[]),t.createElement("points",U({key:`particle-${r}-${JSON.stringify(l)}`},a,{ref:n}),t.createElement("bufferGeometry",null,t.createElement("bufferAttribute",{attach:"attributes-position",args:[s,3]}),t.createElement("bufferAttribute",{attach:"attributes-size",args:[g,1]}),t.createElement("bufferAttribute",{attach:"attributes-opacity",args:[A,1]}),t.createElement("bufferAttribute",{attach:"attributes-speed",args:[y,1]}),t.createElement("bufferAttribute",{attach:"attributes-color",args:[x,3]}),t.createElement("bufferAttribute",{attach:"attributes-noise",args:[b,3]})),u||t.createElement("sparklesImplMaterial",{transparent:!0,pixelRatio:d,depthWrite:!1}))});export{N as F,q as S,K as a};
