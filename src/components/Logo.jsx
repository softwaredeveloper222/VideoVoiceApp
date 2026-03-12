import { styles } from "../styles";

export default function Logo({ onClick, compact, label }) {
  return (
    <div className="logo" style={{ ...styles.logo, ...(onClick ? { cursor: "pointer" } : {}) }} onClick={onClick}>
      {/* <div style={styles.logoIcon}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      </div> */}
      {/* {!compact && <span style={styles.logoText}>{label ?? "VideoVoice"}</span>} */}
    </div>
  );
}
