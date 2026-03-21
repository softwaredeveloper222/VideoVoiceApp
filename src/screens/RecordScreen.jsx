import { useState, useRef, useEffect, useCallback } from "react";
import { styles } from "../styles";

// ─── MediaPipe Configuration ──────────────────────────────────
const MEDIAPIPE_WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm";
const SELFIE_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite";

const SEG_WIDTH = 256;
const SEG_HEIGHT = 144;

const BACKGROUNDS = [
  { id: "none", label: "None", type: "none", card: "/card_img/none.png", preview: "#07182D" },
  { id: "lwyw-1", label: "LWYW 1", type: "image", src: "/backgrounds/LWYW_1.png", card: "/card_img/LWYW_card_1.png", preview: "linear-gradient(135deg, #c8956a, #f0ebe0)" },
  { id: "lwyw-2", label: "LWYW 2", type: "image", src: "/backgrounds/LWYW_2.png", card: "/card_img/LWYW_card_2.png", preview: "linear-gradient(135deg, #7a9ab0, #e8ecf0)" },
  { id: "lwyw-3", label: "LWYW 3", type: "image", src: "/backgrounds/LWYW_3.png", card: "/card_img/LWYW_card_3.png", cardSize: "85%", preview: "linear-gradient(135deg, #7a5c3c, #c8a050)" },
  { id: "upload", label: "Custom", type: "upload", preview: "linear-gradient(135deg, #333, #666)" },
];

const MAX_DURATION = 30;

// ─── MediaPipe Segmenter Hook ─────────────────────────────────
function useSegmenter() {
  const segmenterRef = useRef(null);
  const [segmenterReady, setSegmenterReady] = useState(false);
  const [segmenterError, setSegmenterError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_CDN);

        let segmenter;
        try {
          segmenter = await ImageSegmenter.createFromOptions(vision, {
            baseOptions: { modelAssetPath: SELFIE_MODEL_URL, delegate: "GPU" },
            runningMode: "IMAGE",
            outputConfidenceMasks: true,
            outputCategoryMask: false,
          });
        } catch {
          segmenter = await ImageSegmenter.createFromOptions(vision, {
            baseOptions: { modelAssetPath: SELFIE_MODEL_URL, delegate: "CPU" },
            runningMode: "IMAGE",
            outputConfidenceMasks: true,
            outputCategoryMask: false,
          });
        }

        if (cancelled) { segmenter.close(); return; }
        segmenterRef.current = segmenter;
        setSegmenterReady(true);
      } catch (err) {
        console.error("Failed to initialize MediaPipe segmenter:", err);
        if (!cancelled) setSegmenterError(err.message || "Segmenter failed to load");
      }
    }

    init();
    return () => {
      cancelled = true;
      if (segmenterRef.current) { segmenterRef.current.close(); segmenterRef.current = null; }
    };
  }, []);

  return { segmenterRef, segmenterReady, segmenterError };
}

// ─── WebGL2 Compositing Renderer ──────────────────────────────

const VERT_SRC = `#version 300 es
in vec2 a_pos;
in vec2 a_uv;
out vec2 v_uv;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
  v_uv = a_uv;
}`;

const FRAG_SRC = `#version 300 es
precision highp float;
uniform sampler2D u_video;
uniform sampler2D u_mask;     // EMA-smoothed mask  — stable bg/fg, no flicker
uniform sampler2D u_rawMask;  // current-frame mask — zero temporal lag
uniform sampler2D u_bg;
uniform int u_mode;
uniform vec2 u_texelSize;     // full-res video texel (1/W, 1/H) — for Sobel
uniform vec2 u_maskTexelSize; // mask-space texel  (1/256, 1/144)
uniform float u_sigmaSpace;   // spatial blur (0-10), higher = softer edges
uniform float u_edgeBlur;     // extra boundary blur (0-8), smooths character/background edge
uniform float u_sigmaColor;   // color-aware (0-1), lower = smoother across edges
uniform vec2 u_coverage;      // smoothstep min,max — wider = softer transition
uniform float u_lightWrapping;// background bleed onto person edge (0-1)
uniform int u_blendMode;      // 0=Screen, 1=Linear dodge
uniform int u_hasImageBg;     // 1 = image/upload bg (light wrap applies)
uniform vec4 u_bgCover;       // xy = scale, zw = offset for cover crop
in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec4 vid = texture(u_video, v_uv);
  if (u_mode == 0) { fragColor = vid; return; }

  const vec3 luma = vec3(0.299, 0.587, 0.114);

  // ── Pass 1: Joint Bilateral Upsampling ───
  float sigmaSpaceEff = u_sigmaSpace + u_edgeBlur * 1.5;
  float sigmaSq = max(0.01, sigmaSpaceEff * sigmaSpaceEff);
  float sigmaColorSq = max(0.0001, u_sigmaColor * u_sigmaColor);
  float lumC  = dot(vid.rgb, luma);
  float totalW = 0.0;
  float mRaw = 0.0, mBlend = 0.0;
  int r = (u_edgeBlur > 0.0) ? 2 : 1;
  for (int dy = -2; dy <= 2; dy++) {
    for (int dx = -2; dx <= 2; dx++) {
      if (abs(dx) > r || abs(dy) > r) continue;
      vec2  mUV   = v_uv + vec2(float(dx), float(dy)) * u_maskTexelSize;
      float rawV  = texture(u_rawMask, mUV).r;
      float blndV = texture(u_mask,    mUV).r;
      float lumN  = dot(texture(u_video, mUV).rgb, luma);
      float d2 = float(dx*dx + dy*dy);
      float wS = exp(-d2 / (2.0 * sigmaSq));
      float dL = lumN - lumC;
      float wR = exp(-dL * dL / (2.0 * sigmaColorSq));
      float w  = wS * wR;
      mRaw   += rawV  * w;
      mBlend += blndV * w;
      totalW += w;
    }
  }
  mRaw   /= totalW;
  mBlend /= totalW;

  // ── Pass 2: Boundary-aware raw / blend mix ────────────────────────────────
  float uncertainty = 1.0 - abs(mRaw * 2.0 - 1.0);
  float m = mix(mBlend, mRaw, clamp(0.25 + uncertainty * 1.5, 0.0, 1.0));

  // ── Pass 3: Full-resolution video-space edge snap (Sobel) ─────────────────
  float lumR = dot(texture(u_video, v_uv + vec2( u_texelSize.x, 0.0)).rgb, luma);
  float lumL = dot(texture(u_video, v_uv + vec2(-u_texelSize.x, 0.0)).rgb, luma);
  float lumU = dot(texture(u_video, v_uv + vec2(0.0,  u_texelSize.y)).rgb, luma);
  float lumD = dot(texture(u_video, v_uv + vec2(0.0, -u_texelSize.y)).rgb, luma);
  float videoEdge = clamp(length(vec2(lumR - lumL, lumU - lumD)) * 7.0, 0.0, 1.0);
  float mSnap = step(0.5, m);
  float snapStrength = 0.85 * (1.0 - u_edgeBlur * 0.06);
  m = mix(m, mSnap, videoEdge * uncertainty * max(0.0, snapStrength));

  // ── Coverage (smoothstep) — configurable for softer transition ─────────────
  m = smoothstep(u_coverage.x, u_coverage.y, m);

  vec2 bgUV = v_uv * u_bgCover.xy + u_bgCover.zw;
  vec4 bg = texture(u_bg, bgUV);
  vec4 base = mix(bg, vid, m);

  // ── Light wrapping (image/upload bg only): bleed bg onto person at edge ────
  if (u_hasImageBg == 1 && u_lightWrapping > 0.0) {
    float edge = m * (1.0 - m);
    vec4 wrap = u_lightWrapping * edge * bg;
    if (u_blendMode == 0) {
      base.rgb = 1.0 - (1.0 - base.rgb) * (1.0 - wrap.rgb);
    } else {
      base.rgb = min(vec3(1.0), base.rgb + wrap.rgb);
    }
  }
  fragColor = base;
}`;

function compileShader(gl, src, type) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(s));
  }
  return s;
}

function createGLTexture(gl, filter) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  return tex;
}

function initWebGL(gl) {
  const hasFloatLinear = gl.getExtension("OES_texture_float_linear");
  const maskFilter = hasFloatLinear ? gl.LINEAR : gl.NEAREST;

  const vs = compileShader(gl, VERT_SRC, gl.VERTEX_SHADER);
  const fs = compileShader(gl, FRAG_SRC, gl.FRAGMENT_SHADER);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  const verts = new Float32Array([
    -1, -1, 0, 1,
     1, -1, 1, 1,
    -1,  1, 0, 0,
     1,  1, 1, 0,
  ]);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "a_pos");
  const aUv = gl.getAttribLocation(program, "a_uv");
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
  gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8);
  gl.enableVertexAttribArray(aPos);
  gl.enableVertexAttribArray(aUv);
  gl.bindVertexArray(null);

  const videoTex = createGLTexture(gl, gl.LINEAR);
  const maskTex = createGLTexture(gl, maskFilter);
  const rawMaskTex = createGLTexture(gl, maskFilter);
  const bgTex = createGLTexture(gl, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([26, 26, 46, 255]));

  gl.useProgram(program);
  const uniforms = {
    u_video: gl.getUniformLocation(program, "u_video"),
    u_mask: gl.getUniformLocation(program, "u_mask"),
    u_rawMask: gl.getUniformLocation(program, "u_rawMask"),
    u_bg: gl.getUniformLocation(program, "u_bg"),
    u_mode: gl.getUniformLocation(program, "u_mode"),
    u_texelSize: gl.getUniformLocation(program, "u_texelSize"),
    u_sigmaSpace: gl.getUniformLocation(program, "u_sigmaSpace"),
    u_edgeBlur: gl.getUniformLocation(program, "u_edgeBlur"),
    u_sigmaColor: gl.getUniformLocation(program, "u_sigmaColor"),
    u_coverage: gl.getUniformLocation(program, "u_coverage"),
    u_lightWrapping: gl.getUniformLocation(program, "u_lightWrapping"),
    u_blendMode: gl.getUniformLocation(program, "u_blendMode"),
    u_hasImageBg: gl.getUniformLocation(program, "u_hasImageBg"),
    u_bgCover: gl.getUniformLocation(program, "u_bgCover"),
  };
  gl.uniform1i(uniforms.u_video, 0);
  gl.uniform1i(uniforms.u_mask, 1);
  gl.uniform1i(uniforms.u_bg, 2);
  gl.uniform1i(uniforms.u_rawMask, 3);
  gl.uniform4f(uniforms.u_bgCover, 1.0, 1.0, 0.0, 0.0);

  const u_maskTexelSizeLoc = gl.getUniformLocation(program, "u_maskTexelSize");
  gl.uniform2f(u_maskTexelSizeLoc, 1.0 / SEG_WIDTH, 1.0 / SEG_HEIGHT);

  return { program, vao, buf, textures: { video: videoTex, mask: maskTex, rawMask: rawMaskTex, bg: bgTex }, uniforms };
}

// ─── Default post-processing (soft edges preset) ───────────────
const DEFAULT_POST_PROCESSING = {
  sigmaSpace: 3,
  edgeBlur: 8.0,
  sigmaColor: 0.12,
  coverageMin: 0.58,
  coverageMax: 0.87,
  lightWrapping: 0.30,
  blendMode: "screen",
};

// ─── WebGL background compositing with ML segmentation ────────
function useBackgroundEffect(videoRef, canvasRef, selectedBg, segmenterRef, segmenterReady, uploadedImage, bgImagesRef, postProcessing = DEFAULT_POST_PROCESSING) {
  const selectedBgRef = useRef(selectedBg);
  const segmenterReadyRef = useRef(segmenterReady);
  const uploadedImageRef = useRef(uploadedImage);
  const postProcessingRef = useRef(postProcessing);
  selectedBgRef.current = selectedBg;
  segmenterReadyRef.current = segmenterReady;
  uploadedImageRef.current = uploadedImage;
  postProcessingRef.current = postProcessing;

  const rendererRef = useRef(null);
  const blurCanvasRef = useRef(null);
  const blurCtxRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastDimsRef = useRef({ w: 0, h: 0 });
  const lastBgKeyRef = useRef(null);
  const maskAllocRef = useRef({ w: 0, h: 0 });
  const hasMaskRef = useRef(false);
  const segCanvasRef = useRef(null);
  const segCtxRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true, antialias: false, alpha: false });
    if (!gl) { console.error("WebGL2 not supported"); return; }
    rendererRef.current = initWebGL(gl);

    blurCanvasRef.current = document.createElement("canvas");
    blurCtxRef.current = blurCanvasRef.current.getContext("2d");

    const segCanvas = document.createElement("canvas");
    segCanvas.width = SEG_WIDTH;
    segCanvas.height = SEG_HEIGHT;
    segCanvasRef.current = segCanvas;
    segCtxRef.current = segCanvas.getContext("2d");

    const draw = () => {
      const video = videoRef.current;
      if (!gl || !video || video.paused || video.ended) {
        animFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;
      const r = rendererRef.current;
      const curBg = selectedBgRef.current;
      const curReady = segmenterReadyRef.current;
      const curUploaded = uploadedImageRef.current;

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, r.textures.video);
      if (lastDimsRef.current.w !== w || lastDimsRef.current.h !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.useProgram(r.program);
        gl.uniform2f(r.uniforms.u_texelSize, 1.0 / w, 1.0 / h);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        lastDimsRef.current = { w, h };
        lastBgKeyRef.current = null; // recalculate bg cover on resize
      }

      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, video);

      if (curBg === "none" || !curReady || !segmenterRef.current) {
        gl.useProgram(r.program);
        gl.uniform1i(r.uniforms.u_mode, 0);
        gl.bindVertexArray(r.vao);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        animFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      segCtxRef.current.drawImage(video, 0, 0, SEG_WIDTH, SEG_HEIGHT);

      let mask = null;
      try {
        const result = segmenterRef.current.segment(segCanvasRef.current);
        if (result.confidenceMasks?.length > 0) {
          mask = result.confidenceMasks[0].getAsFloat32Array();
        }
      } catch { /* fall through */ }

      if (mask) {
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, r.textures.rawMask);
        if (maskAllocRef.current.w !== SEG_WIDTH || maskAllocRef.current.h !== SEG_HEIGHT) {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, SEG_WIDTH, SEG_HEIGHT, 0, gl.RED, gl.FLOAT, mask);
        } else {
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, SEG_WIDTH, SEG_HEIGHT, gl.RED, gl.FLOAT, mask);
        }

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, r.textures.mask);
        if (maskAllocRef.current.w !== SEG_WIDTH || maskAllocRef.current.h !== SEG_HEIGHT) {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, SEG_WIDTH, SEG_HEIGHT, 0, gl.RED, gl.FLOAT, mask);
          maskAllocRef.current = { w: SEG_WIDTH, h: SEG_HEIGHT };
        } else {
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, SEG_WIDTH, SEG_HEIGHT, gl.RED, gl.FLOAT, mask);
        }
        hasMaskRef.current = true;
      }

      if (!hasMaskRef.current) {
        gl.useProgram(r.program);
        gl.uniform1i(r.uniforms.u_mode, 0);
        gl.bindVertexArray(r.vao);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        animFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      const bg = BACKGROUNDS.find((b) => b.id === curBg);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, r.textures.bg);

      if (bg?.type === "blur") {
        const bw = Math.round(w / 2), bh = Math.round(h / 2);
        const bc = blurCanvasRef.current, bctx = blurCtxRef.current;
        if (bc.width !== bw || bc.height !== bh) { bc.width = bw; bc.height = bh; }
        bctx.filter = `blur(${Math.max(1, Math.round(bg.blurPx / 2))}px)`;
        bctx.drawImage(video, 0, 0, bw, bh);
        bctx.filter = "none";
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bc);
        lastBgKeyRef.current = null;
      } else if (bg?.type === "image") {
        const img = bgImagesRef?.current?.[bg.id];
        if (img && lastBgKeyRef.current !== bg.id) {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          // Compute fit: show entire bg image without cropping
          const videoAspect = w / h;
          const bgAspect = img.naturalWidth / img.naturalHeight;
          let sx = 1, sy = 1, ox = 0, oy = 0;
          if (bgAspect > videoAspect) {
            // bg is wider → fit width, pad top/bottom
            sy = bgAspect / videoAspect;
            oy = (1 - sy) / 2;
          } else {
            // bg is taller → fit height, pad sides
            sx = videoAspect / bgAspect;
            ox = (1 - sx) / 2;
          }
          gl.uniform4f(r.uniforms.u_bgCover, sx, sy, ox, oy);
          lastBgKeyRef.current = bg.id;
        }
      } else if (bg?.type === "upload" && curUploaded) {
        const key = "upload:" + curUploaded.src;
        if (lastBgKeyRef.current !== key) {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, curUploaded);
          const videoAspect = w / h;
          const bgAspect = curUploaded.naturalWidth / curUploaded.naturalHeight;
          let sx = 1, sy = 1, ox = 0, oy = 0;
          if (bgAspect > videoAspect) {
            sy = bgAspect / videoAspect;
            oy = (1 - sy) / 2;
          } else {
            sx = videoAspect / bgAspect;
            ox = (1 - sx) / 2;
          }
          gl.uniform4f(r.uniforms.u_bgCover, sx, sy, ox, oy);
          lastBgKeyRef.current = key;
        }
      }

      // Reset cover for blur bg (uses full video frame)
      if (bg?.type === "blur") {
        gl.uniform4f(r.uniforms.u_bgCover, 1.0, 1.0, 0.0, 0.0);
      }

      const pp = postProcessingRef.current || DEFAULT_POST_PROCESSING;
      const hasImageBg = (bg?.type === "image" || bg?.type === "upload") ? 1 : 0;
      gl.uniform1f(r.uniforms.u_sigmaSpace, pp.sigmaSpace);
      gl.uniform1f(r.uniforms.u_edgeBlur, pp.edgeBlur ?? 0);
      gl.uniform1f(r.uniforms.u_sigmaColor, pp.sigmaColor);
      gl.uniform2f(r.uniforms.u_coverage, pp.coverageMin, pp.coverageMax);
      gl.uniform1f(r.uniforms.u_lightWrapping, pp.lightWrapping);
      gl.uniform1i(r.uniforms.u_blendMode, pp.blendMode === "linearDodge" ? 1 : 0);
      gl.uniform1i(r.uniforms.u_hasImageBg, hasImageBg);

      gl.useProgram(r.program);
      gl.uniform1i(r.uniforms.u_mode, 1);
      gl.bindVertexArray(r.vao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (rendererRef.current && gl) {
        gl.deleteProgram(rendererRef.current.program);
        gl.deleteBuffer(rendererRef.current.buf);
        Object.values(rendererRef.current.textures).forEach((t) => gl.deleteTexture(t));
        gl.deleteVertexArray(rendererRef.current.vao);
        rendererRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoRef, canvasRef]);
}

// ─── RecordScreen Component ───────────────────────────────────

export default function RecordScreen({ onNext }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  const [phase, setPhase] = useState("setup");
  const [countdown, setCountdown] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [selectedBg, setSelectedBg] = useState("none");
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const POST_PROCESSING_KEY = "videoVoiceApp_edgeSmoothness";
  const loadSavedPostProcessing = () => {
    try {
      const s = localStorage.getItem(POST_PROCESSING_KEY);
      if (s) {
        const parsed = JSON.parse(s);
        return { ...DEFAULT_POST_PROCESSING, ...parsed };
      }
    } catch (_) {}
    return { ...DEFAULT_POST_PROCESSING };
  };
  const [postProcessing, setPostProcessing] = useState(loadSavedPostProcessing);
  const [postProcessVisible, setPostProcessVisible] = useState(() => !window.matchMedia("(max-width: 480px)").matches);
  const [postProcessAnimatingOut, setPostProcessAnimatingOut] = useState(false);

  const [recordBtnPressed, setRecordBtnPressed] = useState(false);
  const [showBgPanel, setShowBgPanel] = useState(false);
  const [bottomPanelAnimatingOut, setBottomPanelAnimatingOut] = useState(false);


  const handleBottomPanelHide = () => {
    setBottomPanelAnimatingOut(true);
  };
  const handleBottomPanelAnimEnd = (e) => {
    if (e.animationName === "scrollFadeOut") {
      setShowBgPanel(false);
      setBottomPanelAnimatingOut(false);
    }
  };
  const handleViewBgClick = () => {
    if (showBgPanel) {
      handleBottomPanelHide();
    } else {
      setShowBgPanel(true);
    }
  };

  const bgImagesRef = useRef({});
  const { segmenterRef, segmenterReady, segmenterError } = useSegmenter();
  useBackgroundEffect(videoRef, canvasRef, selectedBg, segmenterRef, segmenterReady, uploadedImage, bgImagesRef, postProcessing);

  useEffect(() => {
    BACKGROUNDS.filter((bg) => bg.type === "image" && bg.src).forEach((bg) => {
      const img = new Image();
      img.onload = () => {
        bgImagesRef.current[bg.id] = img;
      };
      img.onerror = (e) => console.error(`[BG] Failed to load ${bg.id}:`, bg.src, e);
      img.src = bg.src;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: "user" },
          audio: true,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraReady(true);
      } catch (err) {
        setCameraError("Camera access denied. Please allow camera & microphone permissions.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startCountdown = useCallback(() => {
    setPhase("countdown");
    let c = 3;
    setCountdown(c);
    const iv = setInterval(() => {
      c--;
      if (c <= 0) {
        clearInterval(iv);
        startRecording();
      } else {
        setCountdown(c);
      }
    }, 1000);
  }, []); // eslint-disable-line

  const startRecording = useCallback(() => {
    chunksRef.current = [];
    const canvasStream = canvasRef.current.captureStream(30);
    const audioTrack = streamRef.current?.getAudioTracks()[0];
    if (audioTrack) canvasStream.addTrack(audioTrack);

    const mr = new MediaRecorder(canvasStream, { mimeType: "video/webm;codecs=vp9,opus" });
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setRecordedBlob(blob);
      setRecordedUrl(URL.createObjectURL(blob));
      setPhase("preview");
    };
    mediaRecorderRef.current = mr;
    mr.start(100);
    setPhase("recording");
    setElapsed(0);

    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        if (prev + 1 >= MAX_DURATION) {
          stopRecording();
          return MAX_DURATION;
        }
        return prev + 1;
      });
    }, 1000);
  }, []); // eslint-disable-line

  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const retake = () => {
    setRecordedBlob(null);
    setRecordedUrl(null);
    setPhase("setup");
    setElapsed(0);
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play();
    }
  };

  const handleImageUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    e.target.value = "";
    if (uploadedImage?.src?.startsWith("blob:")) {
      URL.revokeObjectURL(uploadedImage.src);
    }
    const img = new Image();
    img.onload = () => {
      setUploadedImage(img);
      setSelectedBg("upload");
    };
    img.src = URL.createObjectURL(file);
  }, [uploadedImage]);

  const progress = (elapsed / MAX_DURATION) * 100;
  const timeLeft = MAX_DURATION - elapsed;

  return (
    <div style={styles.cameraScreen} className="camera-screen">

      {/* Hidden source video */}
      <video ref={videoRef} style={styles.hiddenVideo} muted playsInline />

      {/* Camera / preview canvas */}
      <div style={styles.cameraView} className="camera-view">
        <canvas ref={canvasRef} style={{ ...styles.cameraFeed, display: phase === "preview" ? "none" : "block" }} />
        {phase === "preview" && (
          <video src={recordedUrl} style={styles.cameraFeed} controls autoPlay loop />
        )}

        {cameraError && (
          <div style={styles.cameraErrorOverlay}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{cameraError}</span>
          </div>
        )}

        {/* Countdown */}
        {phase === "countdown" && (
          <div style={styles.countdownOverlay}>
            <span key={countdown} style={styles.countdownNum} className="countdown-num">{countdown}</span>
          </div>
        )}

        {/* Recording indicator + timer */}
        {phase === "recording" && (
          <>
            <div style={styles.recIndicator} className="anim-slide-down">
              <span style={styles.recDot} className="rec-dot" />
              <span style={styles.recText}>REC</span>
              <span style={styles.recTime}>{elapsed}s / {MAX_DURATION}s</span>
            </div>
            {/* Countdown ring top-right */}
            <div style={styles.recRing} className="anim-fade-in">
              <svg viewBox="0 0 44 44" style={{ width: 44, height: 44, transform: "rotate(-90deg)" }}>
                <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3.5" />
                <circle cx="22" cy="22" r="18" fill="none"
                  stroke={timeLeft <= 10 ? "#e53935" : "#fff"} strokeWidth="3.5"
                  strokeDasharray={`${2 * Math.PI * 18}`}
                  strokeDashoffset={`${2 * Math.PI * 18 * (elapsed / MAX_DURATION)}`}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
                />
              </svg>
              <span style={{ position: "absolute", fontSize: 11, fontFamily: "'CiscoSansTT', sans-serif", fontWeight: 700, color: timeLeft <= 10 ? "#e53935" : "#fff" }}>
                {timeLeft}
              </span>
            </div>
          </>
        )}

        {/* Progress bar — recording */}
        {phase === "recording" && (
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>
        )}

        {/* Gear / settings button */}
        {phase === "setup" && selectedBg !== "none" && (
          <button
            type="button"
            onClick={() => {
              if (postProcessVisible && !postProcessAnimatingOut) {
                setPostProcessAnimatingOut(true);
              } else if (!postProcessVisible && !postProcessAnimatingOut) {
                setPostProcessVisible(true);
              }
            }}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.45)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 10,
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            aria-label="Edge smoothness settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
        )}

        {/* Post-processing settings panel */}
        {phase === "setup" && selectedBg !== "none" && (postProcessVisible || postProcessAnimatingOut) && (
          <div
            className={postProcessAnimatingOut ? "anim-edge-panel-out" : "anim-edge-panel-in"}
            onAnimationEnd={(e) => {
              if (e.animationName === "edgePanelSlideOut") {
                setPostProcessVisible(false);
                setPostProcessAnimatingOut(false);
              }
            }}
            style={{
              position: "absolute",
              top: 64,
              right: 16,
              width: 220,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderRadius: 12,
              padding: "14px 16px",
              zIndex: 10,
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'CiscoSansTT', sans-serif" }}>
              Edge Smoothness
            </p>
            {[
              { key: "sigmaSpace", label: "Spatial blur", min: 0, max: 10, step: 0.5 },
              { key: "edgeBlur", label: "Edge blur", min: 0, max: 8, step: 0.5 },
              { key: "sigmaColor", label: "Color aware", min: 0.01, max: 1, step: 0.01 },
              { key: "coverageMin", label: "Coverage min", min: 0, max: 1, step: 0.01 },
              { key: "coverageMax", label: "Coverage max", min: 0, max: 1, step: 0.01 },
              { key: "lightWrapping", label: "Light wrap", min: 0, max: 1, step: 0.01 },
            ].map(({ key, label, min, max, step }) => (
              <div key={key} style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "'CiscoSansTT', sans-serif", marginBottom: 2 }}>
                  <span>{label}</span>
                  <span>{Number(postProcessing[key]).toFixed(step < 0.1 ? 2 : 1)}</span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={postProcessing[key]}
                  onChange={(e) => setPostProcessing((prev) => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                  style={{ width: "100%", accentColor: "#00bceb", height: 4 }}
                />
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                onClick={() => setPostProcessing({ ...DEFAULT_POST_PROCESSING })}
                style={{
                  flex: 1, padding: "6px 0", fontSize: 11, fontFamily: "'CiscoSansTT', sans-serif",
                  background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 6, color: "#fff", cursor: "pointer", letterSpacing: "0.04em",
                }}
              >
                Default
              </button>
              <button
                onClick={() => {
                  try { localStorage.setItem(POST_PROCESSING_KEY, JSON.stringify(postProcessing)); } catch (_) {}
                  setPostProcessAnimatingOut(true);
                }}
                style={{
                  flex: 1, padding: "6px 0", fontSize: 11, fontFamily: "'CiscoSansTT', sans-serif",
                  background: "rgba(0,188,235,0.25)", border: "1px solid rgba(0,188,235,0.4)",
                  borderRadius: 6, color: "#fff", cursor: "pointer", letterSpacing: "0.04em",
                }}
              >
                Save
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Virtual background — button + panel as one unit */}
      {phase === "setup" && (
        <div
          style={styles.bottomAreaExpanded}
          className={`bottom-area-expanded${showBgPanel && !bottomPanelAnimatingOut ? " anim-scroll-fade-in" : ""}${bottomPanelAnimatingOut ? " anim-scroll-fade-out" : ""}`}
          onAnimationEnd={handleBottomPanelAnimEnd}
        >
          <button
            type="button"
            onClick={handleViewBgClick}
            disabled={bottomPanelAnimatingOut}
            style={{ ...styles.viewBgBtn, ...styles.viewBgBtnAbovePanel }}
            className="view-bg-btn view-bg-btn-panel"
            aria-label={showBgPanel ? "Hide virtual backgrounds" : "View virtual backgrounds"}
          >
            <img src="/img/virtual_background_button_img.png" alt="Virtual Background" style={{ width: 24, height: 24, objectFit: "contain" }} />
          </button>
          {(showBgPanel || bottomPanelAnimatingOut) && (
          <div style={styles.bottomPanelExpandedOnly} className="bottom-panel">
            <div style={styles.bgSection} className="bg-section">
            <p style={{ ...styles.bgTitle, marginBottom: 14, textAlign: "center" }}>
              Choose your background
              {!segmenterReady && !segmenterError && (
                <span style={styles.segmenterLoadingText}> · loading AI…</span>
              )}
            </p>
            <div style={styles.bgThumbs} className="bg-thumbs">
              {BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => {
                      if (bg.type === "upload") {
                        fileInputRef.current?.click();
                      } else {
                        setSelectedBg(bg.id);
                      }
                    }}
                    style={{
                      ...styles.bgThumb,
                      background: bg.id === "upload" && uploadedImage
                        ? `url(${uploadedImage.src}) center/cover`
                        : bg.type === "none" && bg.card
                        ? `${bg.preview} url(${bg.card}) center/50% no-repeat`
                        : bg.card
                        ? `url(${bg.card}) center/${bg.cardSize || "cover"} no-repeat`
                        : bg.type === "image" && bg.src
                        ? `url(${bg.src}) center/cover`
                        : bg.preview,
                      ...(selectedBg === bg.id ? styles.bgThumbActive : {}),
                    }}
                    className="bg-thumb"
                    title={bg.label}
                  >
                    {bg.type === "upload" && !uploadedImage && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    )}
                    {bg.type === "upload" && <span style={styles.bgThumbLabel}>{bg.label}</span>}
                  </button>
                ))}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: "none" }}
            />
            </div>
          </div>
          )}
        </div>
      )}

      {/* Controls row — record button + View Virtual Background (when collapsed); countdown/recording/preview */}
        <div
          style={{
            ...styles.bottomPanel,
            ...styles.bottomPanelCollapsed,
            zIndex: 5,
            ...(phase !== "preview" ? { paddingBottom: "calc(56px + env(safe-area-inset-bottom, 0px))" } : {}),
          }}
          className={`bottom-panel${phase !== "preview" ? " bottom-panel-with-bg-btn" : ""}`}
        >
        <div
          style={{
            ...styles.controlsRow,
            ...styles.controlsRowColumn,
          }}
          className="controls-row"
        >
          {phase === "setup" && (
            <button
              onClick={() => {
                setRecordBtnPressed(true);
                setTimeout(() => {
                  setRecordBtnPressed(false);
                  startCountdown();
                }, 350);
              }}
              disabled={!cameraReady || recordBtnPressed}
              style={{ ...styles.recordBtn, opacity: cameraReady ? 1 : 0.4 }}
              className={`record-btn${recordBtnPressed ? " record-btn-pressed" : ""}`}
              aria-label="Start recording"
            >
              <span style={styles.recordDot} />
            </button>
          )}
          {phase === "countdown" && (
              <button style={{ ...styles.recordBtn, opacity: 0.4 }} className="record-btn" disabled aria-label="Preparing…">
                <span style={styles.recordDot} />
              </button>
          )}
          {phase === "recording" && (
              <button onClick={stopRecording} style={{ ...styles.recordBtn, ...styles.recordBtnActive }} className="record-btn" aria-label="Stop recording">
                <span style={styles.stopSquare} />
              </button>
          )}
          {phase === "preview" && (
            <div style={styles.previewBtns} className="preview-btns anim-slide-up">
              <button onClick={retake} style={styles.outlineBtn} className="outline-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 7 }}>
                  <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                </svg>
                Retake
              </button>
              <button onClick={() => onNext(recordedBlob)} style={styles.filledBtn} className="filled-btn">
                Use This
                <svg style={{ marginLeft: 8 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          )}
        </div>
        </div>


    </div>
  );
}
