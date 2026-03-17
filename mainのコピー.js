const canvas = document.querySelector("#glcanvas");
const gl = canvas.getContext("webgl");

if (!gl) {
  throw new Error("WebGL is not supported");
}

const vertexShaderSource = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform vec2 u_click;
uniform float u_clickTime;

// GUI Uniforms
uniform int u_theme;
uniform float u_swirl;
uniform float u_density;
uniform float u_shift;

vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

mat2 rot2d(float a) {
  float s = sin(a), c = cos(a);
  return mat2(c, -s, s, c);
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  vec2 mouse = (u_mouse.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  vec2 click = (u_click.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  
  float t = u_time;
  
  // Shockwave
  float dt = t - u_clickTime;
  float wavePos = dt * 2.5;
  float shock = (smoothstep(wavePos - 0.15, wavePos, length(uv - click)) - 
                 smoothstep(wavePos, wavePos + 0.15, length(uv - click))) * exp(-dt * 1.5) * 0.8;
  
  // Interaction Logic (Theme dependent)
  float distToMouse = length(uv - mouse);
  float swirl = exp(-distToMouse * 2.5) * 4.0 * u_swirl;
  
  if (u_theme == 3) { // Cyber Glitch: Special warping
    uv.x += sin(uv.y * 10.0 + t * 5.0) * 0.02 * (1.0 + shock * 5.0);
  }
  
  uv = rot2d(swirl + shock * 2.0) * uv;
  
  // Domain Warping (FBM)
  float noiseFreq = u_density * 0.3;
  vec2 q = vec2(snoise(uv + vec2(0, t * 0.2)), snoise(uv + vec2(1, t * 0.3)));
  vec2 r = vec2(snoise(uv + 6.0 * q + vec2(1.7, 9.2) + 0.5 * t * noiseFreq), 
                snoise(uv + 6.0 * q + vec2(8.3, 2.8) + 0.4 * t * noiseFreq));
  float f = snoise(uv + 5.0 * r);
  
  // Theme Palettes
  vec3 colorA, colorB, colorC, colorD;
  
  if (u_theme == 0) { // Vortex (Default)
    colorA = vec3(0.02, 0.02, 0.08); colorB = vec3(0.1, 0.3, 1.0);
    colorC = vec3(1.0, 0.1, 0.5);    colorD = vec3(1.0, 0.9, 0.2);
  } else if (u_theme == 1) { // Solar Flare
    colorA = vec3(0.1, 0.02, 0.0);   colorB = vec3(1.0, 0.4, 0.0);
    colorC = vec3(1.0, 0.1, 0.0);    colorD = vec3(1.0, 0.9, 0.5);
  } else if (u_theme == 2) { // Frozen Abyss
    colorA = vec3(0.0, 0.05, 0.1);   colorB = vec3(0.0, 0.5, 0.8);
    colorC = vec3(0.6, 0.9, 1.0);    colorD = vec3(1.0, 1.0, 1.0);
  } else { // Cyber Glitch
    colorA = vec3(0.05, 0.0, 0.05);  colorB = vec3(1.0, 0.0, 1.0);
    colorC = vec3(0.0, 1.0, 1.0);    colorD = vec3(1.0, 1.0, 1.0);
  }
  
  // Color Shifting (GUI)
  colorB = mix(colorB, colorC, u_shift);
  
  // Final composite
  vec3 color = mix(colorA, colorB, clamp(f * 3.0, 0.0, 1.0));
  color = mix(color, colorC, clamp(length(q), 0.0, 1.0));
  color = mix(color, colorD, clamp(length(r.x) * shock * 5.0, 0.0, 1.0));
  
  color *= (f * f * 3.0 + 0.5);
  color += shock * colorD * 0.6;
  
  // Sparks
  float sparks = pow(max(0.0, snoise(uv * (20.0 * u_density) + t)), 10.0);
  color += sparks * colorD;
  
  gl_FragColor = vec4(color, 1.0);
}
`;

// State object for parameters
const state = {
  theme: 0,
  swirl: 1.0,
  density: 1.0,
  shift: 0.0,
  mouseX: 0,
  mouseY: 0,
  clickX: 0,
  clickY: 0,
  clickTime: -100
};

// --- GUI Listeners ---
document.querySelectorAll(".theme-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".theme-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.theme = parseInt(btn.dataset.theme);
  });
});

const setupSlider = (id, key) => {
  const slider = document.getElementById(`slider-${id}`);
  const valDisp = document.getElementById(`val-${id}`);
  slider.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    state[key] = val;
    valDisp.textContent = val.toFixed(2);
  });
};

setupSlider("swirl", "swirl");
setupSlider("density", "density");
setupSlider("shift", "shift");

// --- WebGL Core ---
const createProgram = (vs, fs) => {
  const p = gl.createProgram();
  const s = (t, src) => {
    const sh = gl.createShader(t);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  };
  gl.attachShader(p, s(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, s(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
};

const program = createProgram(vertexShaderSource, fragmentShaderSource);
const locs = {
  pos: gl.getAttribLocation(program, "a_position"),
  res: gl.getUniformLocation(program, "u_resolution"),
  time: gl.getUniformLocation(program, "u_time"),
  mouse: gl.getUniformLocation(program, "u_mouse"),
  click: gl.getUniformLocation(program, "u_click"),
  clickTime: gl.getUniformLocation(program, "u_clickTime"),
  theme: gl.getUniformLocation(program, "u_theme"),
  swirl: gl.getUniformLocation(program, "u_swirl"),
  density: gl.getUniformLocation(program, "u_density"),
  shift: gl.getUniformLocation(program, "u_shift"),
};

const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);

window.addEventListener("pointermove", (e) => {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  state.mouseX = e.clientX * dpr;
  state.mouseY = (window.innerHeight - e.clientY) * dpr;
});

window.addEventListener("pointerdown", (e) => {
  if (e.target.closest(".gui-panel") || e.target.closest(".hud")) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  state.clickX = e.clientX * dpr;
  state.clickY = (window.innerHeight - e.clientY) * dpr;
  state.clickTime = performance.now() * 0.001;
});

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(canvas.clientWidth * dpr);
  canvas.height = Math.floor(canvas.clientHeight * dpr);
  gl.viewport(0, 0, canvas.width, canvas.height);
}

function render(time) {
  resize();
  gl.useProgram(program);
  gl.enableVertexAttribArray(locs.pos);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(locs.pos, 2, gl.FLOAT, false, 0, 0);

  gl.uniform2f(locs.res, canvas.width, canvas.height);
  gl.uniform1f(locs.time, time * 0.001);
  gl.uniform2f(locs.mouse, state.mouseX, state.mouseY);
  gl.uniform2f(locs.click, state.clickX, state.clickY);
  gl.uniform1f(locs.clickTime, state.clickTime);
  
  // Pass GUI state
  gl.uniform1i(locs.theme, state.theme);
  gl.uniform1f(locs.swirl, state.swirl);
  gl.uniform1f(locs.density, state.density);
  gl.uniform1f(locs.shift, state.shift);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
  requestAnimationFrame(render);
}

window.addEventListener("resize", resize);
requestAnimationFrame(render);
