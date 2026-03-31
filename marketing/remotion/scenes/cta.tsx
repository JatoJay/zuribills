import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TEAL, TEAL_LIGHT, TEAL_DARK, DARK_BG, WHITE } from "../constants-zuribills";
import { jakartaFamily } from "../utils/fonts-zuribills";

const CLAMP = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

export const ZBCTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // "Start free" springs in
  const ctaScale = spring({
    frame: Math.max(0, frame - 5),
    fps,
    config: { damping: 12, stiffness: 100, mass: 0.9 },
  });
  const ctaOpacity = interpolate(frame, [5, 18], [0, 1], CLAMP);

  // Subtitle fades up
  const subOpacity = interpolate(frame, [18, 30], [0, 1], CLAMP);
  const subY = interpolate(frame, [18, 30], [15, 0], CLAMP);

  // URL fades up
  const urlOpacity = interpolate(frame, [30, 42], [0, 1], CLAMP);
  const urlY = interpolate(frame, [30, 42], [15, 0], CLAMP);

  // Teal shimmer sweeps across text
  const shimmerPos = interpolate(frame, [18, 60], [-100, 200], CLAMP);

  // Bottom accent bar
  const barWidth = interpolate(frame, [8, 45], [0, 100], CLAMP);

  // Radial glow pulse
  const glowOpacity = interpolate(frame, [10, 30], [0, 0.1], CLAMP);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: DARK_BG,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Subtle radial glow */}
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${TEAL} 0%, transparent 70%)`,
          opacity: glowOpacity,
        }}
      />

      <div style={{ textAlign: "center" }}>
        {/* "Start free" */}
        <div
          style={{
            opacity: ctaOpacity,
            transform: `scale(${ctaScale})`,
            fontSize: 88,
            fontWeight: 700,
            fontFamily: jakartaFamily,
            lineHeight: 1.2,
            marginBottom: 16,
            position: "relative",
            overflow: "hidden",
            color: TEAL,
            letterSpacing: -2,
          }}
        >
          Start free
          {/* Shimmer overlay */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: `${shimmerPos}%`,
              width: 100,
              height: "100%",
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
              transform: "skewX(-15deg)",
            }}
          />
        </div>

        {/* Subtitle */}
        <div
          style={{
            opacity: subOpacity,
            transform: `translateY(${subY}px)`,
            fontSize: 24,
            fontWeight: 400,
            color: "rgba(255,255,255,0.5)",
            fontFamily: jakartaFamily,
            marginBottom: 24,
          }}
        >
          No credit card required
        </div>

        {/* URL */}
        <div
          style={{
            opacity: urlOpacity,
            transform: `translateY(${urlY}px)`,
            fontSize: 30,
            fontWeight: 400,
            color: WHITE,
            fontFamily: '"SF Mono", "Fira Code", "Consolas", monospace',
            letterSpacing: 2,
          }}
        >
          zuribills.com
        </div>
      </div>

      {/* Bottom teal accent bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: `${barWidth}%`,
          height: 3,
          background: `linear-gradient(90deg, ${TEAL_DARK}, ${TEAL}, ${TEAL_LIGHT})`,
        }}
      />
    </AbsoluteFill>
  );
};
