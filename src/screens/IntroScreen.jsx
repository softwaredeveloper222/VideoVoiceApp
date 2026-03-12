import { styles } from "../styles";

export default function IntroScreen({ onNext }) {
  return (
    <div style={styles.bgImageScreen} className="gradient-screen">
      <div style={styles.welcomeCenter} className="welcome-center">
        <img
          src="/img/CISCO@Desktop.png"
          srcSet="/img/CISCO@Desktop.png 2x"
          alt="Cisco"
          className="anim-fade-in intro-cisco-logo"
          style={{ height: 60, objectFit: "contain", marginBottom: 48 }}
        />
        <img
          src="/img/LWYW_brand_square.png"
          alt="LWYW"
          className="anim-scale-in d2 intro-lwyw-brand"
          style={{ width: "min(380px, 50vw)", objectFit: "contain", marginBottom: 24 }}
        />
        <p className="anim-slide-up d3 intro-hashtags" style={{
          fontSize: 20, fontWeight: 200, color: "#ffffff",
          textAlign: "center", lineHeight: 1, margin: "0 0 16px",
        }}>
          #WeAreCisco<br />#LoveWhereYouWork
        </p>
        {<br />}
        {/* <div className="intro-btn-spacer" style={{ flex: 1, minHeight: 18 }} /> */}
        <p className="anim-slide-up d4 intro-description" style={{
          fontSize: 19, fontWeight: 100, color: "rgba(255,255,255,1.0)",
          fontFamily: "'Barlow', sans-serif",
          textAlign: "center", lineHeight: 1.3, margin: "0 0 0",
          maxWidth: 320, padding: "0 20px",
        }}>
          Share the love! Record a quick video about why this is your place.
        </p>
        <div className="intro-btn-spacer" style={{ flex: 1, minHeight: 16 }} />
        <button
          onClick={onNext}
          className="outline-btn anim-slide-up d5"
          style={{ ...styles.outlineBtn, marginBottom: 16 }}
        >
          GET STARTED
        </button>
      </div>
    </div>
  );
}
