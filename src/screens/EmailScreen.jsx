import { useState } from "react";
import { styles } from "../styles";

export default function EmailScreen({ onNext, error: serverError }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError("Please enter a valid email address");
      return;
    }
    setError("");
    onNext(email);
  };

  return (
    <div style={styles.bgImageScreen} className="gradient-screen">
      <div style={styles.welcomeCenter} className="welcome-center">
        {/* Cisco logo */}
        <img
          src="/img/CISCO.png"
          srcSet="/img/CISCO@2x.png 2x"
          alt="Cisco"
          className="anim-fade-in email-cisco-logo"
          style={{ height: 36, objectFit: "contain", marginBottom: 120 }}
        />

        {/* LWYW horizontal brand */}
        <img
          src="/img/LWYW_brand_horizontal.png"
          alt="LWYW"
          className="anim-scale-in d1 email-lwyw-brand"
          style={{ height: 40, objectFit: "contain", marginBottom: 120 }}
        />

        {/* Email input */}
        <div className="anim-slide-up d2 email-input-wrap" style={{ width: "100%", maxWidth: 340, padding: "0 20px" }}>
          <input
            id="email-input"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
placeholder="Please enter your email"
            style={{
              width: "100%",
              padding: "14px 16px",
              background: "transparent",
              border: "none",
              borderBottom: `1px solid ${
                error
                  ? "rgba(239,68,68,0.6)"
                  : "#fff"
              }`,
              borderRadius: 0,
              color: "#fff",
              fontSize: 15,
              fontFamily: "'CiscoSansTT', sans-serif",
              outline: "none",
              boxSizing: "border-box",
              WebkitAppearance: "none",
              textAlign: "center",
              transition: "border-color 0.2s, box-shadow 0.2s",
              boxShadow: "none",
            }}
            className="email-input"
            autoCapitalize="off"
            autoCorrect="off"
          />
        </div>

        {/* Error */}
        {(error || serverError) && (
          <div style={{ ...styles.errorBox, marginTop: 12, maxWidth: 340 }} className="anim-slide-up">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error || serverError}
          </div>
        )}

        {/* Spacer: center group ↔ Button */}
        <div style={{ flex: 1, minHeight: 16 }} />

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          className="outline-btn anim-slide-up d3"
          style={{ ...styles.outlineBtn, marginBottom: 16 }}
        >
          SUBMIT YOUR VIDEO
        </button>
      </div>
    </div>
  );
}
