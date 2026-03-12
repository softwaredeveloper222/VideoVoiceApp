const GRADIENT_BG = "linear-gradient(155deg, #0a1628 0%, #162052 20%, #3b1760 45%, #7b1a5e 70%, #c2185b 95%)";

export const styles = {
  // ── App shell
  app: {
    fontFamily: "'CiscoSansTT', sans-serif",
    color: "#fff",
    minHeight: "100vh",
    background: "#07080f",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
  },

  // ── Background image screen (Intro & Question)
  bgImageScreen: {
    minHeight: "100vh",
    background: "url('/img/Blue-AR-space@2x.png') center/100% 100% no-repeat",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
  },

  // ── Gradient screens
  gradientScreen: {
    minHeight: "100vh",
    background: GRADIENT_BG,
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
  },
  gradientOverlay: {
    position: "absolute", inset: 0,
    background: "radial-gradient(ellipse 80% 60% at 60% 0%, rgba(120,40,220,0.18) 0%, transparent 65%)",
    pointerEvents: "none",
  },

  // ── Page head (Logo + back stacked vertically, left-aligned)
  pageHead: {
    display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10,
    padding: "20px 28px",
    position: "relative", zIndex: 10, flexShrink: 0,
  },

  // ── Nav bar
  navBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 28px",
    position: "relative",
    zIndex: 10,
    flexShrink: 0,
  },
  navBack: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 34, height: 34, borderRadius: 9, padding: 0, flexShrink: 0,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.18)",
    color: "rgba(255,255,255,0.9)",
    cursor: "pointer", backdropFilter: "blur(10px)",
    transition: "all 0.2s",
  },

  // ── Logo
  logo: {
    display: "inline-flex",
    alignItems: "center",
    gap: 9,
    textDecoration: "none",
  },
  logoIcon: {
    width: 32, height: 32, borderRadius: 9,
    background: "linear-gradient(135deg, #c2185b, #7b1a5e)",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  logoText: {
    fontFamily: "'CiscoSansTT', sans-serif",
    fontSize: 18, fontWeight: 700,
    color: "#fff", letterSpacing: "0.04em",
  },

  // ── Hero (Welcome screen)
  heroSection: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    padding: "32px 28px 40px",
    gap: 48,
    position: "relative",
    zIndex: 1,
    maxWidth: 1100,
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box",
  },
  heroLeft: {
    flex: "1 1 500px",
    minWidth: 0,
  },
  heroRight: {
    flex: "0 0 320px",
    display: "none", // shown via CSS @media
  },
  heroBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: "6px 14px",
    marginBottom: 22,
    backdropFilter: "blur(8px)",
  },
  heroBadgeDot: {
    width: 7, height: 7, borderRadius: "50%",
    background: "#4ade80", flexShrink: 0,
    boxShadow: "0 0 6px #4ade80",
  },
  heroBadgeText: {
    fontSize: 12, fontWeight: 500,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: "0.03em",
  },
  welcomeHeading: {
    fontSize: 48, fontWeight: 700, lineHeight: 1.15,
    letterSpacing: "-0.01em", margin: "0 0 20px",
    textShadow: "0 2px 24px rgba(0,0,0,0.25)",
  },
  welcomeSub: {
    fontSize: 17, color: "rgba(255,255,255,0.55)",
    lineHeight: 1.65, margin: "0 0 36px",
    maxWidth: 460,
  },
  heroSteps: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    marginBottom: 40,
  },
  heroStep: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  heroStepNum: {
    width: 28, height: 28, borderRadius: "50%",
    background: "rgba(194,24,91,0.25)",
    border: "1.5px solid rgba(194,24,91,0.45)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 700, color: "#e91e8c",
    flexShrink: 0,
  },
  heroStepLabel: {
    fontSize: 14, fontWeight: 600, color: "#fff",
  },
  heroStepDesc: {
    fontSize: 12, color: "rgba(255,255,255,0.4)",
  },

  // ── Welcome center layout (intro + question screens)
  welcomeCenter: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: "60px 24px 80px",
    position: "relative",
    zIndex: 1,
  },

  // ── Hero decorative card
  heroCard: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: "24px",
    backdropFilter: "blur(16px)",
    overflow: "hidden",
  },
  heroCardBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(0,0,0,0.3)",
    borderRadius: 6,
    padding: "4px 10px",
    marginBottom: 16,
  },
  heroCardCamera: {
    height: 160,
    background: "rgba(0,0,0,0.25)",
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    border: "1px dashed rgba(255,255,255,0.1)",
  },
  heroCardControls: {
    display: "flex",
    justifyContent: "center",
    paddingTop: 20,
  },
  heroCardRecBtn: {
    width: 52, height: 52, borderRadius: "50%",
    background: "transparent",
    border: "3px solid rgba(255,255,255,0.3)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },

  // ── Camera screen
  cameraScreen: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "#050508",
    overflow: "hidden",
    position: "relative",
  },
  cameraView: {
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    background: "#000",
  },
  hiddenVideo: {
    position: "absolute",
    width: 1, height: 1,
    opacity: 0, pointerEvents: "none",
  },
  cameraFeed: {
    width: "100%", height: "100%",
    objectFit: "cover", display: "block",
  },
  cameraErrorOverlay: {
    position: "absolute", inset: 0,
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: 32,
    color: "rgba(255,255,255,0.5)",
    fontSize: 14, textAlign: "center",
    background: "rgba(0,0,0,0.55)",
    lineHeight: 1.6,
  },

  // ── AI loading badge
  segmenterLoadingOverlay: {
    position: "absolute", top: 14, right: 14,
    display: "flex", alignItems: "center", gap: 7,
    padding: "5px 13px",
    background: "rgba(0,0,0,0.6)", borderRadius: 20,
    backdropFilter: "blur(8px)", zIndex: 5,
  },
  segmenterLoadingDot: {
    width: 7, height: 7, borderRadius: "50%",
    background: "#ffa726",
    animation: "pulse 1.4s ease-in-out infinite",
    display: "block",
  },
  segmenterLoadingLabel: {
    fontSize: 11, fontWeight: 500,
    color: "rgba(255,255,255,0.7)",
  },
  segmenterLoadingText: {
    fontSize: 11, fontWeight: 400,
    color: "rgba(255,255,255,0.35)",
  },

  // ── Recording indicator
  recIndicator: {
    position: "absolute", top: 14, left: 14,
    display: "flex", alignItems: "center", gap: 8,
    padding: "7px 14px",
    background: "rgba(0,0,0,0.6)", borderRadius: 24,
    backdropFilter: "blur(8px)", zIndex: 5,
  },
  recDot: {
    width: 8, height: 8, borderRadius: "50%",
    background: "#e53935", display: "block",
    animation: "recPulse 1s ease-in-out infinite",
  },
  recText: {
    fontSize: 11, fontWeight: 700,
    fontFamily: "'CiscoSansTT', sans-serif",
    color: "#fff", letterSpacing: "0.08em",
  },
  recTime: {
    fontSize: 11,
    fontFamily: "'CiscoSansTT', sans-serif",
    color: "rgba(255,255,255,0.55)",
  },
  recRing: {
    position: "absolute", top: 12, right: 12,
    width: 44, height: 44, zIndex: 5,
    display: "flex", alignItems: "center", justifyContent: "center",
  },

  // ── Countdown overlay
  countdownOverlay: {
    position: "absolute", inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 10,
  },
  countdownNum: {
    fontSize: 112, fontWeight: 700,
    fontFamily: "'CiscoSansTT', sans-serif",
    color: "#fff", lineHeight: 1,
    textShadow: "0 0 80px rgba(194,24,91,0.55)",
  },

  // ── Progress bar (recording)
  progressBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    height: 3, background: "rgba(255,255,255,0.1)",
    zIndex: 5,
  },
  progressFill: {
    height: "100%", background: "#e53935",
    transition: "width 1s linear",
  },

  // ── Back button (camera screen)
  backBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 34, height: 34, borderRadius: 9, padding: 0, flexShrink: 0,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.18)",
    color: "rgba(255,255,255,0.9)",
    cursor: "pointer", backdropFilter: "blur(10px)",
    transition: "all 0.2s",
  },

  // ── Film set HUD
  filmHUD: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 25,
    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
    padding: "12px 14px",
    background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)",
  },
  filmHUDLeft: {
    display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8,
  },
  standbyBadge: {
    display: "flex", alignItems: "center", gap: 6,
    background: "rgba(0,0,0,0.45)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 6, padding: "5px 12px",
    fontSize: 9, fontWeight: 700,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: "0.18em",
    fontFamily: "'CiscoSansTT', sans-serif",
    backdropFilter: "blur(6px)",
  },
  standbyDot: {
    width: 6, height: 6, borderRadius: "50%",
    background: "#ffb300", flexShrink: 0,
  },
  filmHUDRight: {
    display: "flex", alignItems: "center", gap: 10,
  },
  filmReadout: {
    fontSize: 9, fontWeight: 700,
    color: "rgba(255,255,255,0.38)",
    fontFamily: "'CiscoSansTT', sans-serif",
    letterSpacing: "0.08em",
    textAlign: "right", lineHeight: 1.8,
  },
  // Viewfinder corners
  fcTL: { position: "absolute", top: 58, left: 16, width: 22, height: 22, zIndex: 15, borderTop: "1.5px solid rgba(255,255,255,0.45)", borderLeft: "1.5px solid rgba(255,255,255,0.45)" },
  fcTR: { position: "absolute", top: 58, right: 16, width: 22, height: 22, zIndex: 15, borderTop: "1.5px solid rgba(255,255,255,0.45)", borderRight: "1.5px solid rgba(255,255,255,0.45)" },
  fcBL: { position: "absolute", bottom: 218, left: 16, width: 22, height: 22, zIndex: 15, borderBottom: "1.5px solid rgba(255,255,255,0.45)", borderLeft: "1.5px solid rgba(255,255,255,0.45)" },
  fcBR: { position: "absolute", bottom: 218, right: 16, width: 22, height: 22, zIndex: 15, borderBottom: "1.5px solid rgba(255,255,255,0.45)", borderRight: "1.5px solid rgba(255,255,255,0.45)" },

  // ── Bottom panel (camera)
  bottomPanel: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    background: "rgba(55,60,75,0.96)",
    padding: "24px 20px 28px",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 10,
  },
  bottomAreaExpanded: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    padding: 0,
    zIndex: 10,
  },
  viewBgBtnAbovePanel: {
    alignSelf: "center",
    marginBottom: -2,
    boxShadow: "none",
    borderLeft: "2px solid white",
    borderRight: "2px solid white",
    borderTop: "2px solid white",
    borderBottom: "0px solid rgb(40, 48, 65)",//rgb(40, 48, 65)
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderRadius: "10px 10px 0 0",
    zIndex: 99999,
  },
  bottomPanelExpandedOnly: {
    border: "none",
    borderTop: "2px solid white",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: "14px 20px calc(20px + env(safe-area-inset-bottom, 0px))",
    background: "rgb(40,48,65)",
    width: "100%",
    boxSizing: "border-box",
  },
  bottomPanelCollapsed: {
    background: "transparent",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    padding: "20px 20px calc(24px + env(safe-area-inset-bottom, 0px))",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    alignItems: "center",
  },

  // ── Background picker
  bgSection: {
    marginBottom: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
  },
  viewBgBtnSquare: {
    width: 56, height: 48,
    display: "flex", alignItems: "center", justifyContent: "center",
    alignSelf: "center",
    background: "rgba(220,225,235,0.95)",
    border: "1.5px solid rgba(180,185,200,0.9)",
    borderRadius: 12,
    color: "rgba(70,75,90,0.95)",
    cursor: "pointer", padding: 0,
    transition: "all 0.15s",
  },
  recordBtnSquare: {
    width: 52, height: 52,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(40,48,65,0.98)",
    border: "4px solid rgba(255,255,255,0.95)",
    borderRadius: 10,
    cursor: "pointer", padding: 0,
    transition: "all 0.15s",
  },
  bgTitleBar: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px 14px",
    borderRadius: 999,
    background: "linear-gradient(120deg, rgba(7, 8, 15, 0.9), rgba(34, 16, 56, 0.9))",
    border: "1px solid rgba(255,255,255,0.16)",
    boxShadow: "0 6px 18px rgba(0,0,0,0.65)",
    marginBottom: 10,
  },
  bgTitle: {
    fontSize: 14, fontWeight: 500,
    color: "rgba(255,255,255,0.9)",
    margin: 0,
    letterSpacing: "0.02em",
  },
  bgThumbs: {
    display: "flex",
    gap: 10,
    overflow: "hidden",
    padding: "8px 4px 8px 4px",
    justifyContent: "center",
    flexWrap: "nowrap",
    width: "100%",
  },
  bgThumb: {
    width: 80, height: 52, borderRadius: 10,
    border: "2px solid rgba(255,255,255,0.12)",
    cursor: "pointer", padding: 0, flexShrink: 1, minWidth: 0,
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    backgroundSize: "cover", backgroundPosition: "center",
    transition: "all 0.15s", gap: 2,
    position: "relative",
  },
  bgThumbActive: {
    border: "2.5px solid #ffffff",
    boxShadow: "0 0 8px rgba(255,255,255,0.5), 0 0 0 1px rgba(255,255,255,0.3)",
  },
  bgThumbLabel: {
    fontSize: 8, color: "rgba(255,255,255,0.55)",
    letterSpacing: "0.05em", textTransform: "uppercase",
    position: "absolute", bottom: 3, left: 0, right: 0,
    textAlign: "center", fontWeight: 600,
    textShadow: "0 1px 2px rgba(0,0,0,0.8)",
  },

  // ── Post-processing (edge smoothness) — right side of screen
  postProcessCardOuter: {
    position: "absolute",
    right: 16,
    top: "50%",
    transform: "translateY(-50%)",
    width: 300,
    zIndex: 15,
  },
  postProcessFloatingBtn: {
    position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
    display: "flex", alignItems: "center", gap: 5,
    padding: "8px 12px",
    background: "linear-gradient(135deg, #c2185b, #7b1a5e)", border: "1.5px solid rgba(194,24,91,0.45)",
    borderRadius: 10, color: "#fff", fontSize: 12, fontWeight: 600,
    cursor: "pointer", zIndex: 16, backdropFilter: "blur(10px)",
    boxShadow: "0 0 12px rgba(194,24,91,0.2)",
  },
  postProcessCardInner: {
    padding: "12px 10px",
    borderRadius: 12,
    background: "rgba(0,0,0,0.6)",
    border: "1px solid rgba(255,255,255,0.12)",
    backdropFilter: "blur(10px)",
    width: "100%",
    boxSizing: "border-box",
  },
  postProcessHeader: {
    marginBottom: 12,
  },
  postProcessTitle: {
    fontSize: 10, fontWeight: 700,
    color: "rgba(255,255,255,0.6)",
    margin: 0,
    letterSpacing: "0.1em", textTransform: "uppercase",
  },
  postProcessActions: {
    display: "flex", gap: 6, marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.1)",
  },
  postProcessActionBtn: {
    flex: 1, padding: "8px 10px", fontSize: 11, fontWeight: 600,
    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 8, color: "#fff", cursor: "pointer",
  },
  postProcessGrid: {
    display: "flex", flexDirection: "column", gap: 12,
  },
  postProcessRow: {
    display: "flex", alignItems: "center", gap: 6,
  },
  postProcessLabel: {
    fontSize: 11, color: "rgba(255,255,255,0.7)",
    width: 76, minWidth: 76, flexShrink: 0, whiteSpace: "nowrap",
  },
  postProcessValue: {
    fontSize: 10, color: "rgba(255,255,255,0.45)",
    fontFamily: "'CiscoSansTT', sans-serif",
    width: 72, minWidth: 72, flexShrink: 0, textAlign: "right",
  },
  slider: {
    flex: 1, minWidth: 0, maxWidth: 120,
    accentColor: "rgba(194,24,91,0.8)",
    height: 12, cursor: "pointer",
  },
  select: {
    flex: 1, minWidth: 0,
    padding: "8px 8px",
    fontSize: 12,
    background: "#2a2738",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: 8,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 500,
  },

  // ── Controls row
  controlsRow: {
    display: "flex", justifyContent: "center", alignItems: "center",
    minHeight: 88,
  },
  controlsRowColumn: {
    flexDirection: "column",
    gap: 14,
  },
  viewBgBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 56, height: 48,
    padding: 0,
    background: "rgb(40,48,65)",
    border: "2px solid white",
    borderRadius: 8,
    color: "#ffffff",
    cursor: "pointer", transition: "all 0.15s",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
  },
  recordBtn: {
    width: 76, height: 76, borderRadius: "50%",
    background: "#e53935",
    border: "4px solid rgba(255,255,255,0.9)",
    boxShadow: "0 2px 12px rgba(229,57,53,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", padding: 0, transition: "all 0.15s",
  },
  recordBtnActive: {
    border: "4px solid rgba(255,255,255,0.9)",
    background: "#e53935",
    boxShadow: "0 2px 16px rgba(229,57,53,0.6)",
    animation: "recordPulse 2s ease-in-out infinite",
  },
  recordDot: {
    width: 52, height: 52, borderRadius: "50%",
    background: "transparent",
    transition: "all 0.15s",
  },
  stopSquare: {
    width: 28, height: 28, borderRadius: 7,
    background: "#e53935",
    boxShadow: "0 2px 14px rgba(229,57,53,0.55)",
  },
  previewBtns: {
    display: "flex", gap: 12, justifyContent: "center", width: "100%",
  },
  hint: {
    textAlign: "center", fontSize: 11,
    color: "rgba(255,255,255,0.25)",
    margin: "8px 0 0",
    letterSpacing: "0.05em",
  },

  // ── Buttons (shared)
  outlineBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    padding: "16px 60px",
    minWidth: 340,
    background: "#07182D",
    border: "2px solid rgba(255, 255, 255, 0.6)",
    borderRadius: 8,
    color: "#ffffff", fontSize: 15, fontWeight: 300,
    fontFamily: "'CiscoSansTT', sans-serif",
    letterSpacing: "0.18em",
    cursor: "pointer", transition: "all 0.2s",
    whiteSpace: "nowrap", backdropFilter: "blur(8px)",
    textTransform: "uppercase",
  },
  startBtnDot: {
    width: 8, height: 8, borderRadius: "50%",
    background: "#ff4d4d",
    marginRight: 10, flexShrink: 0,
    animation: "recPulse 1s ease-in-out infinite",
  },
  filledBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    padding: "14px 28px", minWidth: 260,
    background: "rgba(194,24,91,0.9)",
    border: "1.5px solid rgba(194,24,91,0.7)",
    borderRadius: 10,
    color: "#fff", fontSize: 14, fontWeight: 600,
    fontFamily: "'CiscoSansTT', sans-serif",
    letterSpacing: "0.01em",
    cursor: "pointer", transition: "all 0.2s",
    whiteSpace: "nowrap",
    boxShadow: "0 4px 20px rgba(194,24,91,0.3)",
  },
  filledBtnFull: {
    width: "100%",
    marginTop: 8,
  },
  ghostBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "100%", marginTop: 10,
    padding: "11px 0",
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    color: "rgba(255,255,255,0.5)",
    fontSize: 13, fontWeight: 500,
    fontFamily: "'CiscoSansTT', sans-serif",
    cursor: "pointer", transition: "all 0.2s",
  },

  // ── Center section
  centerSection: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 20px",
    position: "relative",
    zIndex: 1,
  },

  // ── Email screen
  emailCard: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 18,
    padding: "36px 32px",
    backdropFilter: "blur(20px)",
    width: "100%",
    maxWidth: 480,
    boxSizing: "border-box",
  },
  emailIcon: {
    width: 56, height: 56, borderRadius: 14,
    background: "rgba(194,24,91,0.15)",
    border: "1px solid rgba(194,24,91,0.25)",
    display: "flex", alignItems: "center", justifyContent: "center",
    marginBottom: 20,
  },
  emailHeading: {
    fontSize: 26, fontWeight: 700, color: "#fff",
    margin: "0 0 8px", letterSpacing: "-0.01em",
  },
  emailSub: {
    fontSize: 15, color: "rgba(255,255,255,0.48)",
    margin: "0 0 24px", lineHeight: 1.55,
  },
  inputWrap: {
    display: "flex", flexDirection: "column", gap: 7,
  },
  inputLabel: {
    fontSize: 13, fontWeight: 600,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: "0.02em",
  },
  underlineInput: {
    width: "100%",
    padding: "13px 16px",
    background: "rgba(255,255,255,0.06)",
    border: "1.5px solid rgba(255,255,255,0.18)",
    borderRadius: 10,
    color: "#fff", fontSize: 16,
    fontFamily: "'CiscoSansTT', sans-serif",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
    boxSizing: "border-box",
    WebkitAppearance: "none",
    marginBottom: 16,
  },
  errorBox: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "10px 14px",
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.25)",
    borderRadius: 9,
    color: "#fca5a5", fontSize: 13,
    lineHeight: 1.4, marginBottom: 8,
  },

  // ── Upload screen
  progressRingWrap: {
    position: "relative",
    display: "flex", alignItems: "center", justifyContent: "center",
    marginBottom: 28,
  },
  progressPct: {
    position: "absolute",
    fontSize: 18, fontWeight: 700,
    fontFamily: "'CiscoSansTT', sans-serif", color: "#fff",
  },
  uploadTitle: {
    fontSize: 24, fontWeight: 700,
    margin: "0 0 8px", letterSpacing: "-0.01em",
  },
  uploadText: {
    fontSize: 15, color: "rgba(255,255,255,0.48)",
    margin: 0, lineHeight: 1.5,
  },

  // ── Success screen
  checkCircle: {
    width: 88, height: 88, borderRadius: "50%",
    background: "linear-gradient(135deg, rgba(194,24,91,0.45), rgba(123,26,94,0.45))",
    border: "1.5px solid rgba(255,255,255,0.1)",
    display: "flex", alignItems: "center", justifyContent: "center",
    marginBottom: 28, backdropFilter: "blur(8px)",
    boxShadow: "0 8px 36px rgba(194,24,91,0.25)",
  },
  successTitle: {
    fontSize: 32, fontWeight: 700,
    letterSpacing: "-0.01em",
    margin: "0 0 14px",
  },
  successSubtext: {
    fontSize: 15, color: "rgba(255,255,255,0.52)",
    lineHeight: 1.65, textAlign: "center",
    maxWidth: 380, margin: 0,
  },
};

// ─── CSS Injection ────────────────────────────────────────────
if (typeof document !== "undefined") {
  const el = document.createElement("style");
  el.textContent = `
    *, *::before, *::after { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    body { margin: 0; overscroll-behavior: none; }

    /* ── Keyframes ──────────────────────────────────────────── */
    @keyframes fadeIn    { from{opacity:0}                             to{opacity:1} }
    @keyframes slideUp   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
    @keyframes slideDown { from{opacity:0;transform:translateY(-18px)} to{opacity:1;transform:translateY(0)} }
    @keyframes scaleIn   { from{opacity:0;transform:scale(0.88)}       to{opacity:1;transform:scale(1)} }
    @keyframes popIn     { 0%{opacity:0;transform:scale(0.5)} 70%{transform:scale(1.1)} 100%{opacity:1;transform:scale(1)} }
    @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:0.2} }
    @keyframes recPulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.45;transform:scale(0.82)} }
    @keyframes recordPulse { 0%,100%{box-shadow:0 0 0 0 rgba(229,57,53,0)} 50%{box-shadow:0 0 0 12px rgba(229,57,53,0.15)} }
    @keyframes camGlow { 0%,100%{box-shadow:0 4px 20px rgba(194,24,91,0.35),0 0 0 0 rgba(194,24,91,0)} 50%{box-shadow:0 8px 40px rgba(194,24,91,0.65),0 0 0 14px rgba(194,24,91,0)} }
    @keyframes standbyPulse { 0%,100%{opacity:1} 50%{opacity:0.2} }
    @keyframes edgePanelSlideIn  { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
    @keyframes edgePanelSlideOut { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(20px)} }
    @keyframes magicWandShine { 0%,100%{opacity:1;filter:drop-shadow(0 0 2px rgba(194,24,91,0.4))} 50%{opacity:0.9;filter:drop-shadow(0 0 6px rgba(194,24,91,0.7))} }
    @keyframes magicWandFloat { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-2px) rotate(2deg)} }
    @keyframes edgeBtnBgPulse { 0%,100%{background-position:0% 50%;box-shadow:0 0 12px rgba(194,24,91,0.2)} 50%{background-position:100% 50%;box-shadow:0 0 20px rgba(194,24,91,0.4)} }
    @keyframes scrollFadeIn  { from{transform:translateY(75%)} to{transform:translateY(0)} }
    @keyframes scrollFadeOut { from{transform:translateY(0)} to{transform:translateY(75%)} }
    @keyframes controlsBtnIn  { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
    @keyframes controlsBtnOut { from{opacity:1;transform:scale(1)} to{opacity:0;transform:scale(0.85)} }
    @keyframes recordBtnPress { 0%{transform:scale(1)} 40%{transform:scale(0.82)} 100%{transform:scale(1)} }
    .record-btn-pressed { animation: recordBtnPress 0.35s cubic-bezier(.25,.46,.45,.94); }

    /* ── Animation utility classes ────────────────────────────── */
    .anim-fade-in   { animation: fadeIn    0.5s ease both; }
    .anim-slide-up  { animation: slideUp   0.5s ease both; }
    .bottom-area-expanded.anim-scroll-fade-in  { animation: scrollFadeIn  0.35s linear both; }
    .bottom-area-expanded.anim-scroll-fade-out { animation: scrollFadeOut 0.3s linear forwards; pointer-events: none; }
    .anim-slide-down{ animation: slideDown 0.45s ease both; }
    .anim-scale-in  { animation: scaleIn   0.5s ease both; }
    .anim-pop-in    { animation: popIn     0.55s cubic-bezier(.34,1.56,.64,1) both; }
    .anim-controls-btn-in  { animation: controlsBtnIn 0.3s cubic-bezier(.34,1.56,.64,1) both; }
    .anim-controls-btn-out { animation: controlsBtnOut 0.25s ease forwards; }
    .anim-edge-panel-in  { animation: edgePanelSlideIn  0.3s ease both; }
    .anim-edge-panel-out { animation: edgePanelSlideOut 0.25s ease forwards; pointer-events: none; }

    /* Staggered delays */
    .d1 { animation-delay: 0.05s; }
    .d2 { animation-delay: 0.12s; }
    .d3 { animation-delay: 0.2s;  }
    .d4 { animation-delay: 0.28s; }
    .d5 { animation-delay: 0.38s; }

    /* ── Screen entrance ──────────────────────────────────────── */
    .gradient-screen { animation: fadeIn 0.35s ease both; }

    /* ── Welcome ──────────────────────────────────────────────── */
    .welcome-heading { animation: slideUp 0.6s 0.1s ease both; }

    /* ── Record screen ──────────────────────────────────────── */
    .countdown-num { animation: popIn 0.32s cubic-bezier(.34,1.56,.64,1) both !important; }
    .rec-dot { animation: recPulse 1s ease-in-out infinite !important; }
    .standby-dot { animation: standbyPulse 1.8s ease-in-out infinite !important; }

    /* ── Success ──────────────────────────────────────────────── */
    .success-circle { animation: popIn 0.55s 0.05s cubic-bezier(.34,1.56,.64,1) both !important; }

    /* ── Start button (Welcome CTA) ──────────────────────────── */
    .start-btn {
      padding: 18px 52px !important;
      font-size: 17px !important;
      border-radius: 14px !important;
      letter-spacing: 0.02em !important;
      animation: camGlow 2.2s 1.1s ease-in-out infinite !important;
    }
    @media (max-width: 480px) {
      .start-btn { width: 100% !important; padding: 16px 24px !important; }
    }

    /* ── Button interactions ──────────────────────────────────── */
    .filled-btn:hover  { filter:brightness(1.12); transform:translateY(-2px); box-shadow:0 8px 28px rgba(194,24,91,0.4) !important; }
    .filled-btn:active { transform:scale(0.97) translateY(0) !important; }
    .outline-btn:hover  { background:rgba(255,255,255,0.12) !important; transform:translateY(-1px); }
    .outline-btn:active { transform:scale(0.97) !important; }
    .back-btn:hover  { filter:brightness(1.25); }
    .back-btn:active { transform:scale(0.92); }
    .record-btn {
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s ease, box-shadow 0.2s ease !important;
    }
    .record-btn:hover { border-color:#fff !important; transform:scale(1.04); }
    .record-btn:active { transform:scale(0.92); }
    .view-bg-btn {
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease, border-color 0.2s ease !important;
    }
    .view-bg-btn:hover { transform:translateY(-2px) scale(1.03); }
    .view-bg-btn:active { transform:scale(0.94); }
    .controls-row .view-bg-btn:hover { background:linear-gradient(135deg,rgba(45,52,72,0.98),rgba(55,45,85,0.98)) !important; border-color:rgba(255,255,255,0.35) !important; }
    .view-bg-btn-panel:hover { transform:none !important; background:rgb(40,48,65) !important; border-left-color:white !important; border-right-color:white !important; border-top-color:white !important; }
    .record-btn-square:hover { border-color:#fff !important; background:rgba(50,58,78,0.98) !important; }
    .record-btn-square:active { transform:scale(0.95) !important; }
    .bg-thumb:hover  { transform:scale(1.08); opacity:0.88; }
    .bg-thumb:active { transform:scale(0.94); }
    .hero-rec-btn:after {
      content:''; width:34px; height:34px; borderRadius:50%;
      background:#e53935; display:block; margin:auto;
    }

    /* ── Form focus ──────────────────────────────────────────── */
    .email-input::placeholder { color:rgba(255,255,255,0.22); }
    .email-input:focus { background:rgba(255,255,255,0.09) !important; outline:none; }

    /* ── Blend mode select (readable dropdown) ───────────────── */
    .post-process-card select { color:#fff !important; }
    .post-process-card select option { background:#2a2738; color:#fff; }

    /* ── Edge panel hide animation ──────────────────────────── */
    .post-process-card--animating-out { animation: edgePanelSlideOut 0.3s ease forwards !important; pointer-events: none; }

    /* ── Magic wand icon animation ──────────────────────────── */
    .magic-wand-icon { display: inline-flex; animation: magicWandFloat 3s ease-in-out infinite; }
    .magic-wand-icon svg { animation: magicWandShine 2s ease-in-out infinite; }

    /* ── Edge button background animation ───────────────────── */
    .post-process-floating-btn {
      background: linear-gradient(270deg, #c2185b, #7b1a5e, #c2185b) !important;
      background-size: 200% 100% !important;
      animation: edgeBtnBgPulse 3s ease-in-out infinite !important;
      transition: transform 0.15s ease, box-shadow 0.15s ease !important;
    }
    .post-process-floating-btn:active {
      transform: translateY(-50%) scale(0.92) !important;
      box-shadow: 0 0 8px rgba(194,24,91,0.4) !important;
    }

    /* ── Scrollbar hide ──────────────────────────────────────── */
    .bg-thumbs::-webkit-scrollbar { display:none; }

    // /* ── Responsive ──────────────────────────────────────────── */

    // /* Mobile — keep layout comfortable */
    // @media (max-width: 480px) {
    //   .welcome-heading { font-size: 36px !important; }
    // }

    // /* Tablet — show hero right column */
    // @media (min-width: 768px) {
    //   .hero-right { display: block !important; }
    // }

    // /* Desktop — larger headings */
    // @media (min-width: 1024px) {
    //   .welcome-heading { font-size: 56px !important; }
    // }
  `;
  document.head.appendChild(el);
}
