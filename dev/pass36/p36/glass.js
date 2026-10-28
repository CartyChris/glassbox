/* ═══════════════════ PASS 36 — "Living" background ═══════════════════
   An opt-in effect (Customise → Effects → Living): a slow flowing light field behind the glass bars, drawn
   by one WebGL fragment shader. Raw WebGL, not three.js — this is one full-screen quad, and a 600 KB
   library for a gradient is the wrong trade. Costs, kept small on purpose:
     · drawn at a quarter of the screen's pixels and stretched (it is all soft gradients anyway)
     · 20 frames a second, and none at all while the page is hidden or a 3D tab owns the GPU
     · reduced motion → one still frame; no WebGL → the CSS gradient that is already there */
const LIVING36={on:false,cv:null,gl:null,raf:0,last:0,t0:0,prog:null,uRes:null,uT:null,uA:null,uB:null};
const LIVING36_FS=`precision mediump float;uniform vec2 r;uniform float t;uniform vec3 a;uniform vec3 b;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
void main(){vec2 uv=gl_FragCoord.xy/r;vec2 p=uv*vec2(r.x/r.y,1.)*1.6;float s=t*.035;
float f=n(p+vec2(s,-s))*.55+n(p*2.1-vec2(s*1.7,s))*.3+n(p*4.3+s)*.15;
float g=smoothstep(.35,.95,f);vec3 c=mix(a,b,smoothstep(.2,.8,uv.x+.25*sin(s*3.+uv.y*3.)));
float v=1.-smoothstep(.2,1.25,length(uv-vec2(.25,.95)));
gl_FragColor=vec4(c*g*.36*v+c*.05,1.);}`;
function living36Hex(v,d){const m=String(v||'').trim().match(/^#([0-9a-f]{6})$/i);if(!m)return d;const n=parseInt(m[1],16);return[(n>>16)/255,((n>>8)&255)/255,(n&255)/255];}
function living36Start(){
  if(LIVING36.on)return true;
  const cv=document.createElement('canvas');cv.id='bg36';cv.setAttribute('aria-hidden','true');
  cv.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:-1;pointer-events:none';
  const gl=cv.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});
  if(!gl)return false;
  const sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return gl.getShaderParameter(s,gl.COMPILE_STATUS)?s:null;};
  const vs=sh(gl.VERTEX_SHADER,'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'),fs=sh(gl.FRAGMENT_SHADER,LIVING36_FS);
  if(!vs||!fs)return false;
  const pr=gl.createProgram();gl.attachShader(pr,vs);gl.attachShader(pr,fs);gl.linkProgram(pr);
  if(!gl.getProgramParameter(pr,gl.LINK_STATUS))return false;
  gl.useProgram(pr);
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  Object.assign(LIVING36,{on:true,cv,gl,prog:pr,uRes:gl.getUniformLocation(pr,'r'),uT:gl.getUniformLocation(pr,'t'),
    uA:gl.getUniformLocation(pr,'a'),uB:gl.getUniformLocation(pr,'b'),t0:performance.now()});
  document.body.prepend(cv);
  living36Frame();
  return true;
}
function living36Stop(){
  if(!LIVING36.on)return;
  cancelAnimationFrame(LIVING36.raf);clearTimeout(LIVING36.raf);
  if(LIVING36.cv)LIVING36.cv.remove();
  const ext=LIVING36.gl&&LIVING36.gl.getExtension('WEBGL_lose_context');if(ext)ext.loseContext();
  Object.assign(LIVING36,{on:false,cv:null,gl:null,prog:null});
}
function living36Frame(){
  if(!LIVING36.on)return;
  const {gl,cv}=LIVING36;
  const still=UI.motion===false||matchMedia('(prefers-reduced-motion: reduce)').matches;
  const busy3d=['three','spline','viz','brain','webos'].includes(shellCurrent36());
  const w=Math.max(160,Math.round(innerWidth/4)),h=Math.max(120,Math.round(innerHeight/4));
  if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;gl.viewport(0,0,w,h);}
  if(!document.hidden&&!busy3d){
    const css=getComputedStyle(document.documentElement);
    gl.uniform2f(LIVING36.uRes,w,h);
    gl.uniform1f(LIVING36.uT,still?40:(performance.now()-LIVING36.t0)/1000);
    gl.uniform3fv(LIVING36.uA,living36Hex(css.getPropertyValue('--acc'),[.42,.63,1]));
    gl.uniform3fv(LIVING36.uB,living36Hex(css.getPropertyValue('--acc2'),[.66,.55,1]));
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }
  if(still)return;                         // one frame is the whole effect
  LIVING36.raf=setTimeout(()=>{LIVING36.raf=requestAnimationFrame(living36Frame);},50);   // ≈20 fps
}
/* Called from shellApply36: follows the Effects setting. */
function living36Sync(){
  if(UI.fx==='living'){if(!living36Start())document.documentElement.setAttribute('data-fx','aurora');}
  else living36Stop();
}
