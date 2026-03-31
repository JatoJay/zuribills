import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TEAL, TEAL_LIGHT, TEAL_DARK, DARK_BG, WHITE_DIM } from "../constants-zuribills";
import { jakartaFamily } from "../utils/fonts-zuribills";

const CLAMP = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

export const ZBIntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Teal accent line across top
  const accentWidth = interpolate(frame, [0, 35], [0, 100], CLAMP);

  // Logo springs in
  const logoScale = spring({
    frame: Math.max(0, frame - 5),
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.8 },
  });
  const logoOpacity = interpolate(frame, [5, 20], [0, 1], CLAMP);

  // Tagline fades up
  const tagY = interpolate(frame, [22, 42], [30, 0], CLAMP);
  const tagOpacity = interpolate(frame, [22, 42], [0, 1], CLAMP);

  // Badge fades in
  const badgeOpacity = interpolate(frame, [40, 55], [0, 1], CLAMP);
  const badgeY = interpolate(frame, [40, 55], [10, 0], CLAMP);

  // Radial glow behind logo
  const glowOpacity = interpolate(frame, [10, 30], [0, 0.15], CLAMP);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: DARK_BG,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Top teal accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${accentWidth}%`,
          height: 3,
          background: `linear-gradient(90deg, ${TEAL_DARK}, ${TEAL}, ${TEAL_LIGHT})`,
        }}
      />

      {/* Radial glow */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${TEAL} 0%, transparent 70%)`,
          opacity: glowOpacity,
        }}
      />

      {/* Logo text */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 108,
            fontWeight: 700,
            fontFamily: jakartaFamily,
            letterSpacing: -2,
            lineHeight: 1.1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
          }}
        >
          <span style={{ color: "#ffffff" }}>Zuri</span>
          <span style={{ color: TEAL }}>Bills</span>
        </div>
      </div>

      {/* Tagline */}
      <div
        style={{
          position: "absolute",
          top: "57%",
          opacity: tagOpacity,
          transform: `translateY(${tagY}px)`,
          fontSize: 32,
          fontWeight: 300,
          color: WHITE_DIM,
          fontFamily: jakartaFamily,
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        Get Paid Faster
      </div>

      {/* Badge */}
      <div
        style={{
          position: "absolute",
          top: "68%",
          opacity: badgeOpacity,
          transform: `translateY(${badgeY}px)`,
          fontSize: 16,
          fontWeight: 500,
          color: TEAL,
          fontFamily: jakartaFamily,
          padding: "8px 20px",
          borderRadius: 20,
          border: `1px solid ${TEAL}40`,
          background: `${TEAL}10`,
        }}
      >
        Built for freelancers, artisans & small businesses
      </div>
    </AbsoluteFill>
  );
};
