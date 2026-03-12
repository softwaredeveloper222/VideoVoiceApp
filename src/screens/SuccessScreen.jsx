import { styles } from "../styles";

export default function SuccessScreen({ onReset }) {
  return (
    <div style={styles.bgImageScreen} className="gradient-screen">
      <div style={styles.welcomeCenter} className="welcome-center">
        {/* Cisco logo */}
        <img
          src="/img/CISCO@Desktop.png"
          srcSet="/img/CISCO@Desktop.png 2x"
          alt="Cisco"
          className="anim-fade-in intro-cisco-logo"
          style={{ height: 60, objectFit: "contain", marginBottom: 48 }}
        />

        {/* LWYW square brand */}
        <img
          src="/img/LWYW_brand_square.png"
          alt="LWYW"
          className="anim-scale-in d2 intro-lwyw-brand success-lwyw-brand"
          style={{ width: "min(380px, 50vw)", objectFit: "contain", marginBottom: 80 }}
        />

        {/* Thank you heading */}
        <h1
          className="anim-slide-up d2 success-title"
          style={{
            fontSize: 44,
            fontWeight: 300,
            color: "#fff",
            textAlign: "center",
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
            margin: "0 0 20px",
            textTransform: "uppercase",
          }}
        >
          Thank you!
        </h1>

        {/* Subtext */}
        <p
          className="anim-slide-up d3 success-subtext"
          style={{
            fontSize: 18,
            fontFamily: "'Barlow', sans-serif",
            color: "rgba(255,255,255,1.0)",
            lineHeight: 1.4,
            textAlign: "center",
            maxWidth: 320,
            margin: 0,
            padding: "0 20px",
          }}
        >
          Please keep an eye on your email —
          we'll be sending a special gift as a
          token of our appreciation.
        </p>

        {/* Bottom spacer */}
        <div style={{ flex: 1, minHeight: 16 }} />
      </div>
    </div>
  );
}
