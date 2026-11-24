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

      // Factory-like plume motion: buoyant upward lift, shifting crosswind and irregular eddies.
      // Avoid neat circular vortices; large smoke masses should swell, shear and break apart.
      float formationTime=uTime*0.068;
      float height=p.y;
      // The plume rises continuously, widens as it climbs and bends with slow industrial crosswinds.
      float plumeCenter=aspect.x*(0.50+0.088*sin(height*2.1-formationTime*0.38)
                         +0.044*sin(height*5.2+formationTime*0.27)
                         +0.018*sin(height*8.4-formationTime*0.52));
      float plumeWidth=0.16+0.13*smoothstep(0.04,0.92,height);
      float crossWind=sin(height*1.65-formationTime*0.48)*0.14
                    +sin(height*3.8+formationTime*0.31)*0.055
                    +sin(height*6.1-formationTime*0.24)*0.022;
      float gust=sin(formationTime*0.28+height*1.1)*0.088;
      vec2 formedP=vec2(
        p.x+crossWind+gust,
        p.y-uTime*0.032
      );
      // Large, wandering eddies roll the plume edges rather than spinning the whole image.
      vec2 eddyA=formedP-vec2(plumeCenter-aspect.x*0.20,0.40+0.18*cos(formationTime*0.27));
      vec2 eddyB=formedP-vec2(plumeCenter+aspect.x*0.19,0.58+0.16*sin(formationTime*0.31+1.1));
      float vortexA=exp(-dot(eddyA*vec2(1.0,0.72),eddyA*vec2(1.0,0.72))*2.2)*sin(formationTime*0.39+0.7);
      float vortexB=exp(-dot(eddyB*vec2(1.0,0.78),eddyB*vec2(1.0,0.78))*2.6)*cos(formationTime*0.34+0.8);
      formedP+=vec2(-eddyA.y,eddyA.x)*vortexA*0.25;
      formedP+=vec2(eddyB.y,-eddyB.x)*vortexB*0.21;

      // Several independent turbulent currents move at different speeds and angles.
      float t=uTime*0.032;
      vec2 driftA=vec2(t*0.52,-t*0.38);
      vec2 driftB=vec2(-t*0.34,t*0.46);
      vec2 driftC=vec2(t*0.18,t*0.22);
      vec2 flow=vec2(
        fbm(formedP*0.72+driftA+vec2(1.7,2.4)),
        fbm(formedP*0.72+driftB+vec2(5.3,1.1))
      );
      vec2 flow2=vec2(
        fbm(formedP*1.05+flow*0.52+driftC+vec2(0.0,-t*0.30)),
        fbm(formedP*1.05+flow*0.52-driftB*0.42+vec2(3.8,t*0.24))
      );
      // Broad billows form the body; smaller turbulent scales fray their edges into wisps.
      vec2 plumeScale=vec2(1.16,0.78);
      float broad=fbm(formedP*plumeScale*0.92+flow*0.78+flow2*0.24+driftA);
      float middle=fbm(formedP*plumeScale*1.52+flow2*0.58+driftB+vec2(2.2,-1.6));
      float fine=fbm(formedP*plumeScale*3.05+flow*0.42+driftC+vec2(-1.3,4.1));
      float wisps=fbm(formedP*vec2(3.8,2.4)+flow2*0.34+driftC*1.4);
      float cloud=broad*0.62+middle*0.25+fine*0.09+wisps*0.04;

      // Lumpy density envelope: broad stacked billows gather around a shifting central column.
      float localX=abs(p.x-plumeCenter);
      float plumeEnvelope=1.0-smoothstep(plumeWidth*0.62,plumeWidth*1.75,localX);
      float billowNoise=fbm(vec2(formedP.x*2.7,formedP.y*1.65)+flow*0.42+vec2(0.0,-uTime*0.014));
      float billowRidges=0.5+0.5*sin(formedP.y*9.2+billowNoise*4.8+sin(formedP.x*5.8+formationTime*0.28));
      float density=cloud*0.78+billowNoise*0.17+billowRidges*0.12;
      float cloudA=smoothstep(-0.54,0.34,density+plumeEnvelope*0.34-0.18);
      float cloudB=smoothstep(-0.30,0.52,middle*0.62+broad*0.28+wisps*0.10+plumeEnvelope*0.20);
      float vapor=0.5+0.5*sin((broad-middle)*3.0+wisps*1.8+billowNoise+uTime*0.085);
      float edgeFray=smoothstep(-0.38,0.30,wisps*0.72+fine*0.42);
      float vaporShape=clamp(cloudA*0.57+cloudB*0.24+vapor*0.10+edgeFray*0.09,0.0,1.0);

      // Approximate a height field and its normal for soft volumetric lighting.
      float h=fbm(formedP*1.18+flow*0.72+driftA)*0.62
             +fbm(formedP*2.15+flow2*0.62+driftB)*0.24
             +fine*0.14;
      float hx=fbm((formedP+vec2(0.012,0.0))*1.18+flow*0.72+driftA)*0.62
              +fbm((formedP+vec2(0.012,0.0))*2.15+flow2*0.62+driftB)*0.24
              +fbm((formedP+vec2(0.012,0.0))*2.65+flow*0.42+driftC+vec2(-1.3,4.1))*0.14;
      float hy=fbm((formedP+vec2(0.0,0.012))*1.18+flow*0.72+driftA)*0.62
              +fbm((formedP+vec2(0.0,0.012))*2.15+flow2*0.62+driftB)*0.24
              +fbm((formedP+vec2(0.0,0.012))*2.65+flow*0.42+driftC+vec2(-1.3,4.1))*0.14;
      vec3 normal=normalize(vec3((h-hx)*8.0,(h-hy)*8.0,0.72));
      vec3 lightDir=normalize(vec3(-0.42,0.58,0.82));
      float diffuse=0.5+0.5*max(dot(normal,lightDir),0.0);
      float rim=pow(1.0-max(normal.z,0.0),2.0);
      float depthShade=0.88+0.24*diffuse+rim*0.12;

      // Artwork-reactive colour: keep the smoke dark overall, but let selected folds catch the Hero palette.
      vec3 base=mix(uColorA,uColorB,0.28+cloudA*0.12);
      vec3 highlight=mix(uColorA,uColorC,0.22+cloudB*0.12);
      vec3 smoke=mix(base*0.72,highlight*1.02,vaporShape*0.62+0.08);
      smoke=mix(smoke,uColorA*1.02,cloudA*0.18);
      smoke=mix(smoke,vec3(0.018,0.021,0.030),0.10);
      // Deep folds borrow a stronger, darker version of the film's secondary colour.
      float darkPockets=smoothstep(0.26,0.72,1.0-vaporShape+(0.50-h)*0.34);
      vec3 secondaryCharcoal=mix(vec3(0.008,0.010,0.016),uColorB*0.48,0.68);
      smoke=mix(smoke,secondaryCharcoal,darkPockets*0.48);
      // Thin rolling wave crests catch the primary and tertiary artwork colours.
      float waveMask=smoothstep(0.48,0.82,billowRidges)*smoothstep(-0.34,0.22,density)*vaporShape;
      float wavePulse=0.78+0.22*sin(uTime*0.22+formedP.y*2.4+flow.x*2.0);
      vec3 waveTint=mix(uColorA,uColorC,0.28+0.22*cloudB);
      smoke=mix(smoke,waveTint*1.18,waveMask*0.30*wavePulse);
      // Soft coloured side-light travels through the folds instead of tinting the whole frame.
      float colourRibbons=smoothstep(0.38,0.78,0.5+0.5*sin(formedP.y*5.4+flow.x*3.2+flow2.y*2.4+uTime*0.12));
      smoke+=uColorB*colourRibbons*vaporShape*0.075;
      smoke*=depthShade;

      // Highlights drift a little faster, giving the plume subtle moving depth.
      float glow1=exp(-length((vUv-vec2(0.34+0.055*sin(uTime*0.078),0.48+0.045*cos(uTime*0.064)))*vec2(0.72,0.58))*1.35);
      float glow2=exp(-length((vUv-vec2(0.72+0.045*cos(uTime*0.061),0.62+0.05*sin(uTime*0.071)))*vec2(0.82,0.68))*1.55);
      float highlightPulse=0.90+0.10*sin(uTime*0.19+cloud*2.4);
      smoke+=uColorA*(glow1*0.15+glow2*0.10)*highlightPulse;
      smoke+=uColorC*rim*0.055;

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

    // Keep a stable render surface while iOS Safari expands/collapses its browser bars.
    // Scrolling must never resize or restart the smoke simulation.
    let renderWidth = 0;
    let renderHeight = 0;
    const resize = (force = false) => {
      if (!renderer) return;
      const width = Math.max(1, document.documentElement.clientWidth || window.innerWidth);
      const height = Math.max(1, host.clientHeight || window.innerHeight);
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      // iOS may fire resize while its address/tab bars move. Ignore height-only changes there.
      if (!force && isMobile && renderWidth && Math.abs(width - renderWidth) < 2) return;
      if (!force && width === renderWidth && height === renderHeight) return;
      renderWidth = width;
      renderHeight = height;
      // Keep the full-viewport shader light enough for mobile GPUs while preserving sharp UI and posters.
      const pixelRatio = Math.min(window.devicePixelRatio || 1, isMobile ? 0.7 : 1.0);
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      material.uniforms.uResolution.value.set(width * pixelRatio, height * pixelRatio);
    };
    let playerFocused = false;
    let scrolling = false;
    let scrollIdleTimer = 0;
    let pageObserver = null;
    const homePage = () => {
      const page = document.getElementById("home-page");
      return !page || !page.hidden;
    };
    const canAnimate = () => !disposed && !document.hidden && !playerFocused && !scrolling && homePage();
    const stopRender = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const startRender = () => {
      if (!canAnimate() || raf) return;
      last = 0;
      raf = requestAnimationFrame(render);
    };
    const pauseForScroll = () => {
      scrolling = true;
      stopRender();
      clearTimeout(scrollIdleTimer);
      scrollIdleTimer = setTimeout(() => {
        scrolling = false;
        startRender();
      }, 520);
    };
    const render = now => {
      if (!canAnimate()) { raf = 0; return; }
      raf = requestAnimationFrame(render);
      if (now - last < 50) return;
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
    const appScroller = document.getElementById("app");
    if (appScroller) appScroller.addEventListener("scroll", pauseForScroll, { passive: true });
    window.addEventListener("scroll", pauseForScroll, { passive: true });
    const homeNode = document.getElementById("home-page");
    if (homeNode && "MutationObserver" in window) {
      pageObserver = new MutationObserver(() => {
        if (homePage()) startRender();
        else stopRender();
      });
      pageObserver.observe(homeNode, { attributes: true, attributeFilter: ["hidden", "class", "style"] });
    }
    window.addEventListener("orientationchange", () => setTimeout(() => resize(true), 220), { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (!canAnimate()) stopRender();
      else startRender();
    });
    window.addEventListener("flxtv:player-focus", event => {
      playerFocused = !!event.detail?.active;
      if (!canAnimate()) stopRender();
      else startRender();
    });
    window.addEventListener("flxtv:ambient-palette", readPalette);
        canvas.addEventListener("webglcontextlost", event => {
      event.preventDefault();
      cancelAnimationFrame(raf);
    });
    canvas.addEventListener("webglcontextrestored", () => {
      last = 0;
      raf = requestAnimationFrame(render);
    });
    startRender();
    window.__FLIXTV_WEBGL_SMOKE__ = { renderer, canvas, dispose() {
      disposed = true;
      stopRender();
      clearTimeout(scrollIdleTimer);
      pageObserver?.disconnect();
      window.removeEventListener("resize", resize);
      appScroller?.removeEventListener("scroll", pauseForScroll);
      window.removeEventListener("scroll", pauseForScroll);
      material.dispose();
      renderer.dispose();
      canvas.remove();
    }};
  } catch (error) {
    console.warn("[FLIXTV] WebGL smoke unavailable; retaining dark ambient fallback.", error);
    canvas.remove();
  }
})();
