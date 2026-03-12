import { styles } from "../styles";

export default function QuestionScreen({ onStart }) {
  return (
    <div style={styles.bgImageScreen} className="gradient-screen">
      <div style={styles.welcomeCenter} className="welcome-center">
        <img
          src="/img/CISCO@Desktop.png"
          srcSet="/img/CISCO@Desktop.png 2x"
          alt="Cisco"
          className="anim-fade-in question-cisco-logo"
          style={{ height: 60, objectFit: "contain", marginBottom: 120 }}
        />
        <img
          src="/img/LWYW_brand_horizontal.png"
          alt="LWYW"
          className="anim-scale-in d1 question-lwyw-brand"
          style={{ height: 60, objectFit: "contain", marginBottom: 120 }}
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
          style={{ ...styles.outlineBtn, marginBottom: 16 }}
        >
          RECORD YOUR ANSWER
        </button>
      </div>
    </div>
  );
}
