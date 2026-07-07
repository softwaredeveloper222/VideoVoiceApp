import { useState, useRef, useEffect, useCallback } from "react";
import { styles } from "../styles";

// ─── MediaPipe Configuration ──────────────────────────────────
const MEDIAPIPE_WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm";
const SELFIE_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite";

const SEG_WIDTH = 256;
const SEG_HEIGHT = 144;

const BACKGROUNDS = [
  { id: "none", label: "None", type: "none", card: "/card_img/none.png", preview: "#07182D" },
  { id: "lwyw-1", label: "LWYW 1", type: "image", src: "/backgrounds/Rectangle.png", card: "/card_img/Rectangle.png", preview: "linear-gradient(135deg, #c8956a, #f0ebe0)" },
  { id: "lwyw-2", label: "LWYW 2", type: "image", src: "/backgrounds/Horizontal.png", card: "/card_img/Horizontal.png",cardSize: "85%", preview: "linear-gradient(135deg, #7a9ab0, #e8ecf0)" },
  { id: "lwyw-3", label: "LWYW 3", type: "image", src: "/backgrounds/Square.png", card: "/card_img/Square.png", cardSize: "70%", preview: "linear-gradient(135deg, #7a5c3c, #c8a050)" },
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
uniform sampler2D u_overlay;
uniform vec4 u_overlayRect; // x,y,width,height in UV coords (lower-left origin)
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
  // Mirror only the video/mask sampling (character) — bg stays unflipped.
  vec2 vidUV = vec2(1.0 - v_uv.x, v_uv.y);
  vec4 vid = texture(u_video, vidUV);
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
      vec2  mUV   = vidUV + vec2(float(dx), float(dy)) * u_maskTexelSize;
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
  float lumR = dot(texture(u_video, vidUV + vec2( u_texelSize.x, 0.0)).rgb, luma);
  float lumL = dot(texture(u_video, vidUV + vec2(-u_texelSize.x, 0.0)).rgb, luma);
  float lumU = dot(texture(u_video, vidUV + vec2(0.0,  u_texelSize.y)).rgb, luma);
  float lumD = dot(texture(u_video, vidUV + vec2(0.0, -u_texelSize.y)).rgb, luma);
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
  // Overlay compositing: sample overlay texture if UV inside rect
  vec2 oRectPos = u_overlayRect.xy;
  vec2 oRectSize = u_overlayRect.zw;
  vec2 rel = (v_uv - oRectPos) / oRectSize;
  if (rel.x >= 0.0 && rel.x <= 1.0 && rel.y >= 0.0 && rel.y <= 1.0) {
    // overlay texture assumed not mirrored
    vec2 oUV = vec2(rel.x, rel.y);
    vec4 oCol = texture(u_overlay, oUV);
    // simple alpha blend
    fragColor = mix(fragColor, oCol, oCol.a);
  }
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
  const overlayTex = createGLTexture(gl, gl.LINEAR);
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
    u_overlay: gl.getUniformLocation(program, "u_overlay"),
    u_overlayRect: gl.getUniformLocation(program, "u_overlayRect"),
  };
  gl.uniform1i(uniforms.u_video, 0);
  gl.uniform1i(uniforms.u_mask, 1);
  gl.uniform1i(uniforms.u_bg, 2);
  gl.uniform1i(uniforms.u_rawMask, 3);
  gl.uniform4f(uniforms.u_bgCover, 1.0, 1.0, 0.0, 0.0);
  gl.uniform1i(uniforms.u_overlay, 4);
  gl.uniform4f(uniforms.u_overlayRect, 0.0, 0.0, 0.0, 0.0);

  const u_maskTexelSizeLoc = gl.getUniformLocation(program, "u_maskTexelSize");
  gl.uniform2f(u_maskTexelSizeLoc, 1.0 / SEG_WIDTH, 1.0 / SEG_HEIGHT);

  return { program, vao, buf, textures: { video: videoTex, mask: maskTex, rawMask: rawMaskTex, bg: bgTex, overlay: overlayTex }, uniforms };
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
function useBackgroundEffect(
  videoRef,
  canvasRef,
  selectedBg,
  segmenterRef,
  segmenterReady,
  uploadedImage,
  bgImagesRef,
  postProcessing = DEFAULT_POST_PROCESSING,
  disableBgFilter = false,
  previewRef,
  recordCanvasRef,
  recordCanvasCtxRef,
  isRecordingRef
) {
  const selectedBgRef = useRef(selectedBg);
  const segmenterReadyRef = useRef(segmenterReady);
  const uploadedImageRef = useRef(uploadedImage);
  const disableBgFilterRef = useRef(disableBgFilter);
  useEffect(() => {
    selectedBgRef.current = selectedBg;
  }, [selectedBg]);

  // selectedStickerSrc is derived from selectedBg/bgImagesRef when needed

  useEffect(() => {
    segmenterReadyRef.current = segmenterReady;
  }, [segmenterReady]);

  useEffect(() => {
    uploadedImageRef.current = uploadedImage;
  }, [uploadedImage]);

  useEffect(() => {
    disableBgFilterRef.current = disableBgFilter;
  }, [disableBgFilter]);

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
      const curStickerSrc = !!(bgImagesRef?.current?.[curBg]);
      const curReady = segmenterReadyRef.current;
      const curUploaded = uploadedImageRef.current;
      const curDisableBg = disableBgFilterRef.current;

      // helper: upload overlay texture and set overlay rect uniform so shader composes it
      const uploadOverlayToGL = () => {
        if (!r || !r.textures || !r.textures.overlay) return;
        const overlayImg = bgImagesRef?.current?.[curBg];
        if (!overlayImg || !overlayImg.complete || !curStickerSrc) {
          gl.useProgram(r.program);
          gl.uniform4f(r.uniforms.u_overlayRect, 0.0, 0.0, 0.0, 0.0);
          return;
        }
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, r.textures.overlay);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, overlayImg);
        // compute overlay rect in UV coords (lower-left origin)
        let uvx = 0, uvy = 0, uvw = 0, uvh = 0;
        // Prefer DOM-measured preview bounds when available for pixel-perfect alignment
        if (previewRef && previewRef.current) {
          try {
            const pr = previewRef.current.getBoundingClientRect();
            const cr = canvas.getBoundingClientRect();
            const scaleX = canvas.width / cr.width;
            const scaleY = canvas.height / cr.height;
            const xPx = Math.round((pr.left - cr.left) * scaleX);
            const yPxTop = Math.round((pr.top - cr.top) * scaleY);
            const overlayWidthPx = Math.round(pr.width * scaleX);
            const overlayHeightPx = Math.round(pr.height * scaleY);
            uvx = xPx / canvas.width;
            // shader expects origin at lower-left, while DOM rect uses top-left
            uvy = (canvas.height - yPxTop - overlayHeightPx) / canvas.height;
            uvw = overlayWidthPx / canvas.width;
            uvh = overlayHeightPx / canvas.height;
          } catch (err) {
            // fallback to CSS-based calc below
          }
        }
        if (uvw === 0 || uvh === 0) {
          // fallback: center-bottom based on CSS heuristics
          const overlayWidthCss = curBg === "lwyw-2" ? 320 : Math.min(overlayImg.naturalWidth, 320);
          const overlayHeightCss = Math.round((overlayWidthCss / overlayImg.naturalWidth) * overlayImg.naturalHeight);
          const overlayBottomCss = curBg === "lwyw-2" ? 200 : 250;
          const cssToCanvasScale = (canvas.width && canvas.clientWidth) ? (canvas.width / canvas.clientWidth) : 1;
          const overlayWidth = Math.round(overlayWidthCss * cssToCanvasScale);
          const overlayHeight = Math.round(overlayHeightCss * cssToCanvasScale);
          const overlayBottom = Math.round(overlayBottomCss * cssToCanvasScale);
          uvx = (canvas.width - overlayWidth) / 2 / canvas.width;
          const yPx = Math.round(canvas.height - overlayBottom - overlayHeight);
          uvy = yPx / canvas.height;
          uvw = overlayWidth / canvas.width;
          uvh = overlayHeight / canvas.height;
        }
        gl.useProgram(r.program);
        gl.uniform4f(r.uniforms.u_overlayRect, uvx, uvy, uvw, uvh);
      };

      const maybeCopyToRecordCanvas = () => {
        if (!isRecordingRef.current || !recordCanvasRef.current || !recordCanvasCtxRef.current) return;
        const rc = recordCanvasRef.current;
        const rctx = recordCanvasCtxRef.current;
        if (rc.width !== canvas.width || rc.height !== canvas.height) {
          rc.width = canvas.width;
          rc.height = canvas.height;
        }
        // copy the visible canvas pixels
        rctx.clearRect(0, 0, rc.width, rc.height);
        rctx.drawImage(canvas, 0, 0);
        const overlayImg = bgImagesRef?.current?.[curBg];
        if (overlayImg && overlayImg.complete && curStickerSrc) {
          let drawX = null, drawY = null, drawW = null, drawH = null;
          if (previewRef && previewRef.current) {
            try {
              const pr = previewRef.current.getBoundingClientRect();
              const cr = canvas.getBoundingClientRect();
              const scaleX = rc.width / cr.width;
              const scaleY = rc.height / cr.height;
              drawX = Math.round((pr.left - cr.left) * scaleX);
              drawY = Math.round((pr.top - cr.top) * scaleY);
              drawW = Math.round(pr.width * scaleX);
              drawH = Math.round(pr.height * scaleY);
            } catch (err) {
              drawX = null;
            }
          }
          if (drawW == null || drawH == null) {
            const overlayWidthCss = curBg === "lwyw-2" ? 320 : Math.min(overlayImg.naturalWidth, 320);
            const overlayHeightCss = Math.round((overlayWidthCss / overlayImg.naturalWidth) * overlayImg.naturalHeight);
            const overlayBottomCss = curBg === "lwyw-2" ? 200 : 250;
            const cssToCanvasScale = (rc.width && canvas.clientWidth) ? (rc.width / canvas.clientWidth) : 1;
            const overlayWidthPx = Math.round(overlayWidthCss * cssToCanvasScale);
            const overlayHeightPx = Math.round(overlayHeightCss * cssToCanvasScale);
            const overlayBottomPx = Math.round(overlayBottomCss * cssToCanvasScale);
            drawX = Math.round((rc.width - overlayWidthPx) / 2);
            drawY = Math.round(rc.height - overlayBottomPx - overlayHeightPx);
            drawW = overlayWidthPx;
            drawH = overlayHeightPx;
          }
          if (drawW > 0 && drawH > 0) rctx.drawImage(overlayImg, drawX, drawY, drawW, drawH);
        }
      };

      // Canvas = screen CSS size (no DPR scaling — produces standard video dimensions)
      const cw = canvas.clientWidth || window.innerWidth;
      const ch = canvas.clientHeight || window.innerHeight;

      // Cover-fit viewport: video fills canvas, overflow is clipped
      const coverScale = Math.max(cw / w, ch / h);
      const vw = Math.round(w * coverScale);
      const vh = Math.round(h * coverScale);
      const vx = Math.round((cw - vw) / 2);
      const vy = Math.round((ch - vh) / 2);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, r.textures.video);
      if (lastDimsRef.current.cw !== cw || lastDimsRef.current.ch !== ch || lastDimsRef.current.w !== w || lastDimsRef.current.h !== h) {
        canvas.width = cw;
        canvas.height = ch;
        gl.useProgram(r.program);
        gl.uniform2f(r.uniforms.u_texelSize, 1.0 / w, 1.0 / h);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        lastDimsRef.current = { w, h, cw, ch };
        lastBgKeyRef.current = null;
      }

      gl.viewport(vx, vy, vw, vh);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, video);

      if (curBg === "none" || !curReady || !segmenterRef.current || curDisableBg) {
        gl.useProgram(r.program);
        gl.uniform1i(r.uniforms.u_mode, 0);
        gl.bindVertexArray(r.vao);
        uploadOverlayToGL();
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        maybeCopyToRecordCanvas();
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
        uploadOverlayToGL();
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        maybeCopyToRecordCanvas();
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
          // Contain fit: bg covers full canvas
          const canvasAspect = w / h;
          const bgAspect = img.naturalWidth / img.naturalHeight;
          let sx = 1, sy = 1, ox = 0, oy = 0;
          if (bgAspect > canvasAspect) {
            sy = bgAspect / canvasAspect;
            oy = (1 - sy) / 2;
          } else {
            sx = canvasAspect / bgAspect;
            ox = (1 - sx) / 2;
          }
          gl.uniform4f(r.uniforms.u_bgCover, sx, sy, ox, oy);
          lastBgKeyRef.current = bg.id;
        }
      } else if (bg?.type === "upload" && curUploaded) {
        const key = "upload:" + curUploaded.src;
        if (lastBgKeyRef.current !== key) {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, curUploaded);
          const canvasAspect = w / h;
          const bgAspect = curUploaded.naturalWidth / curUploaded.naturalHeight;
          let sx = 1, sy = 1, ox = 0, oy = 0;
          if (bgAspect > canvasAspect) {
            sy = bgAspect / canvasAspect;
            oy = (1 - sy) / 2;
          } else {
            sx = canvasAspect / bgAspect;
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

      gl.useProgram(r.program);
      gl.uniform1i(r.uniforms.u_mode, 1);
      gl.bindVertexArray(r.vao);
      uploadOverlayToGL();
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      maybeCopyToRecordCanvas();
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
  const recordCanvasRef = useRef(null);
  const recordCanvasCtxRef = useRef(null);
  const isRecordingRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const [phase, setPhase] = useState("setup");
  const [countdown, setCountdown] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [selectedBg, setSelectedBg] = useState("none");
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isLandscape, setIsLandscape] = useState(() => window.innerWidth > window.innerHeight);
  const [disableBgFilter, setDisableBgFilter] = useState(false);

  const [recordBtnPressed, setRecordBtnPressed] = useState(false);
  const [showBgPanel, setShowBgPanel] = useState(false);
  const [bottomPanelAnimatingOut, setBottomPanelAnimatingOut] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.innerWidth > 768
  );


  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth > 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Lock to portrait orientation on mobile only
  useEffect(() => {
    if (window.innerWidth > 768) return;

    const lockPortrait = async () => {
      try {
        await screen.orientation?.lock?.("portrait");
      } catch (_) { /* not supported or not fullscreen */ }
    };
    lockPortrait();
    return () => {
      try { screen.orientation?.unlock?.(); } catch (_) {}
    };
  }, []);

  // Detect landscape orientation
  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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
  const previewRef = useRef(null);
  useBackgroundEffect(
    videoRef,
    canvasRef,
    selectedBg,
    segmenterRef,
    segmenterReady,
    null,
    bgImagesRef,
    undefined,
    disableBgFilter,
    previewRef,
    recordCanvasRef,
    recordCanvasCtxRef,
    isRecordingRef
  );

  const selectedBgData = BACKGROUNDS.find((bg) => bg.id === selectedBg);
  const selectedStickerSrc = selectedBgData?.type === "image" ? selectedBgData.src : null;

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
        const isMobile = window.innerWidth <= 768;
        const screenAspect = window.innerHeight / window.innerWidth;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: isMobile
            ? {
                facingMode: "user",
                aspectRatio: { ideal: screenAspect },
                width: { ideal: 1080 },
                height: { ideal: Math.round(1080 * screenAspect) },
              }
            : { width: 1280, height: 720, facingMode: "user" },
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
    // ensure hidden record canvas exists and matches GL canvas size
    const canvas = canvasRef.current;
    if (!recordCanvasRef.current) {
      const rc = document.createElement("canvas");
      recordCanvasRef.current = rc;
      recordCanvasCtxRef.current = rc.getContext("2d");
    }
    const rc = recordCanvasRef.current;
    const rctx = recordCanvasCtxRef.current;
    rc.width = canvas.width;
    rc.height = canvas.height;
    isRecordingRef.current = true;
    const canvasStream = rc.captureStream(30);
    const audioTrack = streamRef.current?.getAudioTracks()[0];
    if (audioTrack) canvasStream.addTrack(audioTrack);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus"
      : "video/webm";
    let mr;
    try {
      mr = new MediaRecorder(canvasStream, { mimeType });
    } catch (err) {
      console.error("MediaRecorder constructor failed:", err);
      setCameraError("Recording is not supported in this browser.");
      setPhase("setup");
      return;
    }
    mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const recordedChunks = chunksRef.current.filter((chunk) => chunk && chunk.size > 0);
      if (recordedChunks.length === 0) {
        console.error("Recording finished with no data.");
        setCameraError("Recording failed. Please try again.");
        setPhase("setup");
        return;
      }
      const blob = new Blob(recordedChunks, { type: mimeType || "video/webm" });
      setRecordedBlob(blob);
      setRecordedUrl(URL.createObjectURL(blob));
      setPhase("preview");
    };
    mr.onerror = (err) => {
      console.error("MediaRecorder error:", err);
      setCameraError("Recording failed. Please try again.");
      setPhase("setup");
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

  const progress = (elapsed / MAX_DURATION) * 100;
  const timeLeft = MAX_DURATION - elapsed;

  const renderStickerThumbs = (disabled = false) => (
    <div style={styles.bgThumbs} className="bg-thumbs">
      {BACKGROUNDS.map((bg) => (
        <button
          key={bg.id}
          onClick={() => {
            setSelectedBg(bg.id);
            setDisableBgFilter(bg.type === "image");
          }}
          disabled={disabled}
          style={{
            ...styles.bgThumb,
            background: bg.type === "none" && bg.card
              ? `${bg.preview} url(${bg.card}) center/50% no-repeat`
              : bg.id === "lwyw-1" && isDesktop && bg.card
              ? `url(${bg.card}) center 72% / ${bg.cardSize || "contain"} no-repeat`
              : bg.card
              ? `url(${bg.card}) center/${bg.cardSize || "contain"} no-repeat`
              : bg.type === "image" && bg.src
              ? `url(${bg.src}) center/cover`
              : bg.preview,
            ...(selectedBg === bg.id ? styles.bgThumbActive : {}),
          }}
          className="bg-thumb"
          title={bg.label}
        />
      ))}
    </div>
  );

  const renderRecordControls = (btnStyle = {}) => (
    <>
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
          style={{ ...styles.recordBtn, ...btnStyle, opacity: cameraReady ? 1 : 0.4 }}
          className={`record-btn${recordBtnPressed ? " record-btn-pressed" : ""}`}
          aria-label="Start recording"
        >
          <span style={styles.recordDot} />
        </button>
      )}
      {phase === "countdown" && (
        <button style={{ ...styles.recordBtn, ...btnStyle, opacity: 0.4 }} className="record-btn" disabled aria-label="Preparing…">
          <span style={styles.recordDot} />
        </button>
      )}
      {phase === "recording" && (
        <button onClick={stopRecording} style={{ ...styles.recordBtn, ...styles.recordBtnActive, ...btnStyle }} className="record-btn" aria-label="Stop recording">
          <span style={styles.stopSquare} />
        </button>
      )}
    </>
  );

  const renderPreviewControls = (wrapperStyle = {}) => (
    <div style={{ ...styles.previewBtns, ...wrapperStyle }} className="preview-btns anim-slide-up">
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
  );

  if (isLandscape && !isDesktop) {
    return (
      <div style={{
        ...styles.cameraScreen,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "#0d0d0f",
      }}>
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.7)", fontFamily: "'CiscoSansTT', sans-serif" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16, opacity: 0.6 }}>
            <rect x="4" y="2" width="16" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
          <p style={{ fontSize: 18, fontWeight: 500, margin: "0 0 8px" }}>Please rotate your device</p>
          <p style={{ fontSize: 14, fontWeight: 300, opacity: 0.6, margin: 0 }}>This app works in portrait mode only</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={isDesktop ? styles.cameraScreenDesktop : styles.cameraScreen}
      className="camera-screen"
    >

      {/* Hidden source video */}
      <video ref={videoRef} style={styles.hiddenVideo} muted playsInline />

      {/* Camera / preview canvas */}
      <div
        style={isDesktop ? styles.cameraViewDesktop : styles.cameraView}
        className="camera-view"
      >
        <canvas ref={canvasRef} style={{ ...styles.cameraFeed, display: phase === "preview" ? "none" : "block" }} />
        {phase === "preview" && (
          <video src={recordedUrl} style={styles.cameraFeed} controls={isDesktop} autoPlay loop playsInline />
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

        {!isDesktop && selectedStickerSrc && phase !== "preview" && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 80,
              transform: "translateX(-50%)",
              width: selectedBg === "lwyw-2" ? 200 : "auto",
              maxWidth: selectedBg === "lwyw-2" ? 200 : 130,
              height: selectedBg === "lwyw-2" ? 110 : "auto",
              maxHeight: selectedBg === "lwyw-2" ? 110 : 130,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 8,
              zIndex: 4,
              overflow: "hidden",
              pointerEvents: "none",
            }}
            ref={previewRef}
          >
            <img
              src={selectedStickerSrc}
              alt="Sticker Preview"
              style={{
                width: selectedBg === "lwyw-2" ? "100%" : "auto",
                height: "auto",
                objectFit: "contain",
                maxWidth: "100%",
              }}
            />
          </div>
        )}

        {!isDesktop && (
          <div style={styles.recordControlsAbsolute} className="controls-row">
            {renderRecordControls(styles.recordControlsAbsoluteBtn)}
          </div>
        )}

        {/* Edge smoothness controls removed */}

      </div>

      {isDesktop ? (
        <>
          {phase === "setup" && (
            <div
              style={styles.bottomAreaExpanded}
              className={`bottom-area-expanded${showBgPanel && !bottomPanelAnimatingOut ? " anim-scroll-fade-in" : ""}${bottomPanelAnimatingOut ? " anim-scroll-fade-out" : ""}`}
              onAnimationEnd={handleBottomPanelAnimEnd}
            >
              <div style={{ position: "relative", display: "inline-flex", alignSelf: "center" }}>
                <button
                  type="button"
                  onClick={handleViewBgClick}
                  disabled={bottomPanelAnimatingOut}
                  style={{ ...styles.viewBgBtn, ...styles.viewBgBtnAbovePanel }}
                  className="view-bg-btn view-bg-btn-panel"
                  aria-label={showBgPanel ? "Hide virtual backgrounds" : "View virtual backgrounds"}
                >
                  <img
                    src={showBgPanel ? "/img/Sticker.png" : "/img/virtual_background_button_img.png"}
                    alt="Virtual Background"
                    style={{
                      width: showBgPanel ? 32 : 24,
                      height: showBgPanel ? 32 : 24,
                      objectFit: "contain",
                      transition: "width 200ms ease, height 200ms ease, transform 200ms ease",
                      transform: showBgPanel ? "scale(1.08)" : "scale(1)",
                    }}
                  />
                </button>
              </div>
              {(showBgPanel || bottomPanelAnimatingOut) && (
                <div style={styles.bottomPanelExpandedOnly} className="bottom-panel">
                  <div style={styles.bgSection} className="bg-section">
                    <p style={{ ...styles.bgTitle, marginBottom: 14, textAlign: "center" }}>
                      Choose your sticker
                    </p>
                    {renderStickerThumbs()}
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedStickerSrc && phase !== "preview" && (
            <div
              style={{
                position: "fixed",
                left: "50%",
                bottom: selectedBg === "lwyw-2" ? 170 : 190,
                transform: "translateX(-50%)",
                width: selectedBg === "lwyw-2" ? 200 : "auto",
                maxWidth: selectedBg === "lwyw-2" ? 200 : 200,
                height: selectedBg === "lwyw-2" ? 160 : "auto",
                maxHeight: selectedBg === "lwyw-2" ? 160 : 145,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 8,
                zIndex: 1000,
                overflow: "hidden",
              }}
              ref={previewRef}
            >
              <img
                src={selectedStickerSrc}
                alt="Sticker Preview"
                style={{
                  width: selectedBg === "lwyw-2" ? "100%" : "auto",
                  height: "auto",
                  objectFit: "contain",
                  maxWidth: "100%",
                  maxHeight: selectedBg === "lwyw-2" ? 150 : 135,
                }}
              />
            </div>
          )}

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
              {phase === "preview" ? renderPreviewControls() : renderRecordControls()}
            </div>
          </div>
        </>
      ) : (
        <div style={styles.bottomPanelFixed} className="bottom-panel">
          {phase !== "preview" ? (
            <div
              style={{
                pointerEvents: phase === "setup" ? "auto" : "none",
                opacity: phase === "setup" ? 1 : 0.85,
              }}
            >
              <div style={styles.bgSection} className="bg-section">
                <p style={{ ...styles.bgTitle, marginBottom: 14, textAlign: "center" }}>
                  Choose your sticker
                </p>
                {renderStickerThumbs(phase !== "setup")}
              </div>
            </div>
          ) : (
            <div style={styles.panelPreviewActions}>
              {renderPreviewControls()}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
