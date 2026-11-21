import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

(() => {
  "use strict";
  const host = document.getElementById("app-ambient");
  if (!host || !("WebGLRenderingContext" in window)) return;

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    precision highp float;
    varying vec2 vUv;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform vec3 uColorC;
    uniform float uOpacity;

    vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
    float snoise(vec2 v){
      const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
      vec2 i=floor(v+dot(v,C.yy));
      vec2 x0=v-i+dot(i,C.xx);
      vec2 i1=x0.x>x0.y?vec2(1.0,0.0):vec2(0.0,1.0);
      vec4 x12=x0.xyxy+C.xxzz;
      x12.xy-=i1;
      i=mod289(i);
      vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
      vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
      m=m*m;m=m*m;
      vec3 x=2.0*fract(p*C.www)-1.0;
      vec3 h=abs(x)-0.5;
      vec3 ox=floor(x+0.5);
      vec3 a0=x-ox;
      m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
      vec3 g;
      g.x=a0.x*x0.x+h.x*x0.y;
      g.yz=a0.yz*x12.xz+h.yz*x12.yw;
      return 130.0*dot(m,g);
    }
    float fbm(vec2 p){
      float value=0.0;
      float amplitude=0.5;
      for(int i=0;i<5;i++){
        value+=amplitude*snoise(p);
        p=p*2.02+vec2(13.1,-7.7);
        amplitude*=0.5;
      }
      return value;
    }
    void main(){
      vec2 aspect=vec2(uResolution.x/max(uResolution.y,1.0),1.0);
      vec2 p=vUv*aspect;

      // Slow, layered flow in several directions for a calm, drifting atmosphere.
      float t=uTime*0.026;
      vec2 driftA=vec2(t*0.42,-t*0.30);
      vec2 driftB=vec2(-t*0.24,t*0.34);
      vec2 flow=vec2(
        fbm(p*0.72+driftA+vec2(1.7,2.4)),
        fbm(p*0.72+driftB+vec2(5.3,1.1))
      );
      vec2 flow2=vec2(
        fbm(p*1.05+flow*0.52+vec2(0.0,-t*0.24)),
        fbm(p*1.05+flow*0.52+vec2(3.8,t*0.20))
      );
      float broad=fbm(p*0.92+flow*0.78+flow2*0.24+driftA);
      float middle=fbm(p*1.42+flow2*0.58+driftB+vec2(2.2,-1.6));
      float cloud=broad*0.78+middle*0.22;

      // Soft, overlapping vapor layers. No hard edges or black cut-outs.
      float cloudA=smoothstep(-0.72,0.48,cloud);
      float cloudB=smoothstep(-0.36,0.60,middle*0.72+broad*0.28);
      float vapor=0.5+0.5*sin((broad-middle)*2.1+uTime*0.10);
      float vaporShape=clamp(cloudA*0.68+cloudB*0.20+vapor*0.12,0.0,1.0);

      // Keep the whole screen in the Hero's dominant hue family and lift shadows.
      vec3 base=mix(uColorA,uColorB,0.16+cloudA*0.10);
      vec3 highlight=mix(uColorA,uColorC,0.18+cloudB*0.12);
      vec3 smoke=mix(base*0.82,highlight*1.08,vaporShape*0.72+0.12);
      smoke=mix(smoke,uColorA*1.18,cloudA*0.16);
      smoke=max(smoke,uColorA*0.58);

      // Broad luminous haze, with a gentle moving highlight.
      float glow1=exp(-length((vUv-vec2(0.34+0.035*sin(uTime*0.07),0.48))*vec2(0.72,0.58))*1.35);
      float glow2=exp(-length((vUv-vec2(0.72+0.025*cos(uTime*0.055),0.62))*vec2(0.82,0.68))*1.55);
      smoke+=uColorA*(glow1*0.10+glow2*0.07);

      gl_FragColor=vec4(smoke,1.0);
    }
  `;

  let renderer, material, raf = 0, last = 0, elapsed = 0, disposed = false;
  const canvas = document.createElement("canvas");
  canvas.className = "webgl-smoke-canvas";
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);

  const parseColor = (value, fallback) => {
    const parts = String(value || "").split(",").map(Number);
    if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return new THREE.Color(fallback);
    return new THREE.Color().setRGB(parts[0] / 255, parts[1] / 255, parts[2] / 255, THREE.SRGBColorSpace);
  };
  const paletteTargets = {
    a: new THREE.Color("#a05a42"),
    b: new THREE.Color("#52705f"),
    c: new THREE.Color("#795b97")
  };
  const readPalette = () => {
    const styles = getComputedStyle(document.documentElement);
    paletteTargets.a.copy(parseColor(styles.getPropertyValue("--hero-smoke-one"), "#a05a42"));
    paletteTargets.b.copy(parseColor(styles.getPropertyValue("--hero-smoke-two"), "#52705f"));
    paletteTargets.c.copy(parseColor(styles.getPropertyValue("--hero-smoke-three"), "#795b97"));
  };

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
      premultipliedAlpha: true
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: false,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uColorA: { value: new THREE.Color("#a05a42") },
        uColorB: { value: new THREE.Color("#52705f") },
        uColorC: { value: new THREE.Color("#795b97") },
        uOpacity: { value: 0.9 }
      }
    });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

    const resize = () => {
      if (!renderer) return;
      const width = Math.max(1, host.clientWidth || window.innerWidth);
      const height = Math.max(1, host.clientHeight || window.innerHeight);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.25 : 1.6);
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      material.uniforms.uResolution.value.set(width * pixelRatio, height * pixelRatio);
    };
    const render = now => {
      if (disposed) return;
      raf = requestAnimationFrame(render);
      if (document.hidden || now - last < 32) return;
      const delta = last ? Math.min((now - last) / 1000, 0.06) : 0.032;
      last = now;
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) elapsed += delta;
      material.uniforms.uTime.value = elapsed;
      // Smoothly morph the smoke palette after each Hero change.
      material.uniforms.uColorA.value.lerp(paletteTargets.a, 0.055);
      material.uniforms.uColorB.value.lerp(paletteTargets.b, 0.055);
      material.uniforms.uColorC.value.lerp(paletteTargets.c, 0.055);
      renderer.render(scene, camera);
    };
    resize();
    readPalette();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("orientationchange", () => setTimeout(resize, 180), { passive: true });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) last = 0; });
    window.addEventListener("flxtv:ambient-palette", readPalette);
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    canvas.addEventListener("webglcontextlost", event => {
      event.preventDefault();
      cancelAnimationFrame(raf);
    });
    canvas.addEventListener("webglcontextrestored", () => {
      last = 0;
      raf = requestAnimationFrame(render);
    });
    raf = requestAnimationFrame(render);
    window.__FLIXTV_WEBGL_SMOKE__ = { renderer, canvas, dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      material.dispose();
      renderer.dispose();
      canvas.remove();
    }};
  } catch (error) {
    console.warn("[FLIXTV] WebGL smoke unavailable; retaining dark ambient fallback.", error);
    canvas.remove();
  }
})();
