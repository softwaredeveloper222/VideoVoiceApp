import { styles } from "../styles";

export default function QuestionScreen({ onStart }) {
  return (
    <div style={styles.bgImageScreen} className="gradient-screen">
      <div style={styles.welcomeCenter} className="welcome-center">
        <picture>
          <source media="(max-width: 360px)" srcSet="/img/CISCO@0.75.png" />
          <source media="(max-width: 480px)" srcSet="/img/CISCO.png" />
          <source media="(max-width: 768px)" srcSet="/img/CISCO@1.5x.png" />
          <img
            src="/img/CISCO@2x.png"
            alt="Cisco"
            className="anim-fade-in question-cisco-logo"
            style={{ height: 60, objectFit: "contain", marginTop: 48, marginBottom: 90 }}
          />
        </picture>
        <img
          src="/img/LWYW_brand_horizontal.png"
          alt="LWYW"
          className="anim-scale-in d1 question-lwyw-brand"
          style={{ height: 60, objectFit: "contain", marginBottom: 90 }}
        />
        <h1 className="anim-slide-up d2 welcome-heading question-heading" style={{
          fontSize: 52, fontWeight: 300, color: "#fff",
          textAlign: "center", lineHeight: 1.3,
          letterSpacing: "-0.01em", margin: "0 0 0",
          maxWidth: 420, padding: "0 20px",
          textTransform: "uppercase",
        }}>
          Why are you proud to be a Cisco employee?
        </h1>
        {/* Bottom spacer — equal flex to center heading */}
        <div className="question-spacer-bottom" style={{ flex: 1, minHeight: 16 }} />
        <button
          onClick={onStart}
          className="outline-btn anim-slide-up d4"
          style={{ ...styles.outlineBtn, marginBottom: 100 }}
        >
          RECORD YOUR ANSWER
        </button>
      </div>
    </div>
  );
}
