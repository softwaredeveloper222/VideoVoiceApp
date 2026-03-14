import { styles } from "../styles";

export default function IntroScreen({ onNext }) {
  return (
    <div style={styles.bgImageScreen} className="gradient-screen">
      <div style={styles.welcomeCenter} className="welcome-center">
        <picture>
          <source media="(max-width: 360px)" srcSet="/img/CISCO@0.5.png" />
          <source media="(max-width: 480px)" srcSet="/img/CISCO.png" />
          <source media="(max-width: 768px)" srcSet="/img/CISCO@1.5x.png" />
          <img
            src="/img/CISCO@2x.png"
            alt="Cisco"
            className="anim-fade-in intro-cisco-logo"
            style={{ height: 60, objectFit: "contain", marginTop: 48, marginBottom: 48 }}
          />
        </picture>
        <picture>
          <source media="(max-width: 360px)" srcSet="/img/LWYW@0.5.png" />
          <source media="(max-width: 480px)" srcSet="/img/LWYW@0.75.png" />
          <source media="(max-width: 768px)" srcSet="/img/LWYW.png" />
          <img
            src="/img/LWYW@1.5x.png"
            alt="LWYW"
            className="anim-scale-in d2 intro-lwyw-brand"
            style={{ width: "min(380px, 50vw)", objectFit: "contain", marginBottom: 24 }}
          />
        </picture>
        <p className="anim-slide-up d3 intro-hashtags" style={{
          fontSize: 24, fontWeight: 200, color: "#ffffff",
          textAlign: "center", lineHeight: 1, margin: "0 0 16px",
        }}>
          #WeAreCisco<br />#LoveWhereYouWork
        </p>
        {/* <div className="intro-btn-spacer" style={{ flex: 1, minHeight: 18 }} /> */}
        <p className="anim-slide-up d4 intro-description" style={{
          fontSize: 24, fontWeight: 100, color: "rgba(255,255,255,1.0)",
          fontFamily: "'Barlow', sans-serif",
          textAlign: "center", lineHeight: 1.3, margin: "16px 0 0",
          maxWidth: 390, padding: "0 20px",
        }}>
          Share the love! Record a quick video about why this is your place.
        </p>
        <div className="intro-btn-spacer" style={{ flex: 1, minHeight: 16 }} />
        <button
          onClick={onNext}
          className="outline-btn anim-slide-up d5"
          style={{ ...styles.outlineBtn, marginBottom: 100 }}
        >
          GET STARTED
        </button>
      </div>
    </div>
  );
}
