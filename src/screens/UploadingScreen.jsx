import { styles } from "../styles";
import Logo from "../components/Logo";

export default function UploadingScreen({ progress }) {
  const circumference = 2 * Math.PI * 28;
  return (
    <div style={styles.bgImageScreen} className="gradient-screen">

      <header style={styles.navBar} className="anim-fade-in nav-bar">
        <Logo />
      </header>

      <div style={{ ...styles.centerSection, textAlign: "center" }}>
        {/* Circular progress ring */}
        <div style={styles.progressRingWrap} className="anim-scale-in d1 progress-ring-wrap">
          <svg viewBox="0 0 64 64" style={{ width: 96, height: 96, transform: "rotate(-90deg)" }}>
            <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
            <circle cx="32" cy="32" r="28" fill="none" stroke="#fff" strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress / 100)}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.4s ease" }}
            />
          </svg>
          <span style={styles.progressPct} className="progress-pct">{Math.round(progress)}%</span>
        </div>

        <h2 style={styles.uploadTitle} className="anim-slide-up d2 upload-title">Uploading…</h2>
        <p style={styles.uploadText} className="anim-slide-up d3 upload-text">
          Sending your video securely
        </p>

        {/* Animated dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 7, marginTop: 20 }} className="anim-fade-in d4">
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.35)", display: "block", animation: `pulse 1.4s ${i * 0.22}s ease-in-out infinite` }} />
          ))}
        </div>
      </div>

      <div style={{ flexShrink: 0, height: 48 }} />
    </div>
  );
}
