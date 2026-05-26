import{r as t,j as f}from"./index-KE_3-qke.js";import{w as S,x as C,U as L,_,t as P,i as F,A as $,V as D,S as H,y as k,z as B,u as I,a as G,o as W}from"./constants-Bkjvtktp.js";function X(e,r,o,s){const i=class extends C{constructor(m={}){const n=Object.entries(e);super({uniforms:n.reduce((a,[l,d])=>{const u=L.clone({[l]:{value:d}});return{...a,...u}},{}),vertexShader:r,fragmentShader:o}),this.key="",n.forEach(([a])=>Object.defineProperty(this,a,{get:()=>this.uniforms[a].value,set:l=>this.uniforms[a].value=l})),Object.assign(this,m)}};return i.key=S.generateUUID(),i}function j(e,r){const o=e+"Geometry";return t.forwardRef(({args:s,children:i,...c},m)=>{const n=t.useRef(null);return t.useImperativeHandle(m,()=>n.current),t.useLayoutEffect(()=>void(r==null?void 0:r(n.current))),t.createElement("mesh",_({ref:n},c),t.createElement(o,{attach:"geometry",args:s}),i)})}const z=j("sphere"),R=j("torus"),Y=j("icosahedron"),J=j("octahedron"),N=t.forwardRef(({children:e,enabled:r=!0,speed:o=1,rotationIntensity:s=1,floatIntensity:i=1,floatingRange:c=[-.1,.1],...m},n)=>{const a=t.useRef(null);t.useImperativeHandle(n,()=>a.current,[]);const l=t.useRef(Math.random()*1e4);return P(d=>{var u,y;if(!r||o===0)return;const p=l.current+d.clock.getElapsedTime();a.current.rotation.x=Math.cos(p/4*o)/8*s,a.current.rotation.y=Math.sin(p/4*o)/8*s,a.current.rotation.z=Math.sin(p/4*o)/20*s;let h=Math.sin(p/4*o)/10;h=S.mapLinear(h,-.1,.1,(u=c==null?void 0:c[0])!==null&&u!==void 0?u:-.1,(y=c==null?void 0:c[1])!==null&&y!==void 0?y:.1),a.current.position.y=h*i,a.current.updateMatrix()}),t.createElement("group",m,t.createElement("group",{ref:a,matrixAutoUpdate:!1},e))});class q extends C{constructor(){super({uniforms:{time:{value:0},fade:{value:1}},vertexShader:`
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
	      #include <${k>=154?"colorspace_fragment":"encodings_fragment"}>
      }`})}}const K=e=>new D().setFromSpherical(new H(e,Math.acos(1-Math.random()*2),Math.random()*2*Math.PI)),Q=t.forwardRef(({radius:e=100,depth:r=50,count:o=5e3,saturation:s=0,factor:i=4,fade:c=!1,speed:m=1},n)=>{const a=t.useRef(),[l,d,u]=t.useMemo(()=>{const p=[],h=[],A=Array.from({length:o},()=>(.5+.5*Math.random())*i),g=new F;let x=e+r;const M=r/o;for(let v=0;v<o;v++)x-=M*Math.random(),p.push(...K(x).toArray()),g.setHSL(v/o,s,.9),h.push(g.r,g.g,g.b);return[new Float32Array(p),new Float32Array(h),new Float32Array(A)]},[o,r,i,e,s]);P(p=>a.current&&(a.current.uniforms.time.value=p.clock.getElapsedTime()*m));const[y]=t.useState(()=>new q);return t.createElement("points",{ref:n},t.createElement("bufferGeometry",null,t.createElement("bufferAttribute",{attach:"attributes-position",args:[l,3]}),t.createElement("bufferAttribute",{attach:"attributes-color",args:[d,3]}),t.createElement("bufferAttribute",{attach:"attributes-size",args:[u,1]})),t.createElement("primitive",{ref:a,object:y,attach:"material",blending:$,"uniforms-fade-value":c,depthWrite:!1,transparent:!0,vertexColors:!0}))}),ee=X({time:0,pixelRatio:1},` uniform float pixelRatio;
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
      #include <${k>=154?"colorspace_fragment":"encodings_fragment"}>
    }`),T=e=>e&&e.constructor===Float32Array,te=e=>[e.r,e.g,e.b],O=e=>e instanceof G||e instanceof D||e instanceof W,U=e=>Array.isArray(e)?e:O(e)?e.toArray():[e,e,e];function E(e,r,o){return t.useMemo(()=>{if(r!==void 0){if(T(r))return r;if(r instanceof F){const s=Array.from({length:e*3},()=>te(r)).flat();return Float32Array.from(s)}else if(O(r)||Array.isArray(r)){const s=Array.from({length:e*3},()=>U(r)).flat();return Float32Array.from(s)}return Float32Array.from({length:e},()=>r)}return Float32Array.from({length:e},o)},[r])}const re=t.forwardRef(({noise:e=1,count:r=100,speed:o=1,opacity:s=1,scale:i=1,size:c,color:m,children:n,...a},l)=>{t.useMemo(()=>B({SparklesImplMaterial:ee}),[]);const d=t.useRef(null),u=I(v=>v.viewport.dpr),y=U(i),p=t.useMemo(()=>Float32Array.from(Array.from({length:r},()=>y.map(S.randFloatSpread)).flat()),[r,...y]),h=E(r,c,Math.random),A=E(r,s),g=E(r,o),x=E(r*3,e),M=E(m===void 0?r*3:r,T(m)?m:new F(m),()=>1);return P(v=>{d.current&&d.current.material&&(d.current.material.time=v.clock.elapsedTime)}),t.useImperativeHandle(l,()=>d.current,[]),t.createElement("points",_({key:`particle-${r}-${JSON.stringify(i)}`},a,{ref:d}),t.createElement("bufferGeometry",null,t.createElement("bufferAttribute",{attach:"attributes-position",args:[p,3]}),t.createElement("bufferAttribute",{attach:"attributes-size",args:[h,1]}),t.createElement("bufferAttribute",{attach:"attributes-opacity",args:[A,1]}),t.createElement("bufferAttribute",{attach:"attributes-speed",args:[g,1]}),t.createElement("bufferAttribute",{attach:"attributes-color",args:[M,3]}),t.createElement("bufferAttribute",{attach:"attributes-noise",args:[x,3]})),n||t.createElement("sparklesImplMaterial",{transparent:!0,pixelRatio:u,depthWrite:!1}))});function b({position:e,rotation:r,color:o,geometry:s,scale:i=1,speed:c=1,introDelay:m=0}){const n=t.useRef(),a=t.useRef(r||[0,0,0]),l=t.useRef(null);return P(d=>{if(!n.current)return;const u=d.clock.getElapsedTime();l.current===null&&(l.current=u);const h=(u-l.current-m)/2.2,A=Math.min(Math.max(h,0),1),g=1-Math.pow(1-A,3),x=Array.isArray(e)&&e[0]||0,M=Array.isArray(e)&&e[1]||0,v=Array.isArray(e)&&e[2]||0,w=v+10,V=w+(v-w)*g,Z=i*(.4+.6*g);n.current.position.set(x,M,V),n.current.scale.setScalar(Z),n.current.rotation.x=a.current[0]+Math.sin(u*.2*c)*.5*g,n.current.rotation.y=a.current[1]+Math.cos(u*.3*c)*.5*g,n.current.rotation.z=a.current[2]}),f.jsx(N,{speed:2*c,rotationIntensity:1,floatIntensity:1,children:f.jsx(s,{ref:n,position:e,rotation:r,scale:i,children:f.jsx("meshStandardMaterial",{color:o,roughness:.05,metalness:.9,emissive:o,emissiveIntensity:.7})})})}function se(){const{camera:e,mouse:r}=I(),o=t.useRef(null);return P(s=>{if(!e)return;const i=s.clock.getElapsedTime();o.current===null&&(o.current=i);const c=i-o.current,n=Math.min(Math.max(c/2.8,0),1),a=1-Math.pow(1-n,3),l=14,u=l+(8-l)*a,y=s.mouse.x*.5,p=s.mouse.y*.5;e.position.set(y,p,u),e.lookAt(0,0,0)}),f.jsxs(f.Fragment,{children:[f.jsx("ambientLight",{intensity:.5}),f.jsx("directionalLight",{position:[10,10,5],intensity:1.5,color:"#ffffff"}),f.jsx("pointLight",{position:[-10,-10,-10],intensity:1,color:"#4F46E5"}),f.jsx(Q,{radius:100,depth:50,count:3e3,factor:4,saturation:0,fade:!0,speed:1}),f.jsx(re,{count:50,scale:10,size:4,speed:.4,opacity:.5,color:"#818cf8"}),f.jsx(b,{geometry:R,position:[2,0,0],rotation:[Math.PI/4,0,0],scale:1.5,color:"#6366F1",speed:1,introDelay:0}),f.jsx(b,{geometry:z,position:[-2,1,-2],scale:1,color:"#8B5CF6",speed:.8,introDelay:.15}),f.jsx(b,{geometry:J,position:[3,-2,-1],scale:1.2,color:"#06B6D4",speed:1.2,introDelay:.3}),f.jsx(b,{geometry:Y,position:[-3,-1.5,0],scale:.8,color:"#EC4899",speed:.9,introDelay:.45}),f.jsx(b,{geometry:z,position:[-5,4,-8],scale:.5,color:"#C7D2FE",speed:.5,introDelay:.6}),f.jsx(b,{geometry:R,position:[6,-4,-6],scale:.8,color:"#DDD6FE",speed:.7,introDelay:.75})]})}export{se as E,N as F,z as S,R as T};
