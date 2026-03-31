import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  DARK_BG,
  TEAL,
  TEAL_LIGHT,
  WHITE,
  TEXT_PRIMARY,
  TEXT_MUTED,
  ACCENT_CATALOG,
} from "../constants-zuribills";
import { jakartaFamily } from "../utils/fonts-zuribills";
import { ChromeFrame } from "../scenes/chrome-frame";

const CLAMP = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const services = [
  { name: "Logo Design", price: "$150", duration: "3-5 days" },
  { name: "Brand Identity", price: "$400", duration: "1-2 weeks" },
  { name: "Social Media Kit", price: "$200", duration: "3 days" },
];

export const ServiceCatalogScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Browser frame fades in
  const browserOpacity = interpolate(frame, [0, 10], [0, 1], CLAMP);
  const browserScale = spring({
    frame: Math.max(0, frame - 2),
    fps,
    config: { damping: 20, stiffness: 100, mass: 0.9 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: DARK_BG,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          opacity: browserOpacity,
          transform: `scale(${browserScale})`,
        }}
      >
        <ChromeFrame url="zuribills.com/catalog" scale={0.85}>
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              position: "relative",
            }}
          >
            {/* Catalog page */}
            <div
              style={{
                width: 540,
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              {/* Page header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: TEXT_PRIMARY,
                      fontFamily: jakartaFamily,
                    }}
                  >
                    My Services
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: TEXT_MUTED,
                      fontFamily: jakartaFamily,
                      marginTop: 4,
                    }}
                  >
                    Share your catalog link with clients
                  </div>
                </div>
                {/* Add service button */}
                <div
                  style={{
                    padding: "8px 18px",
                    borderRadius: 24,
                    background: `linear-gradient(135deg, ${TEAL}, ${TEAL_LIGHT})`,
                    fontSize: 13,
                    fontWeight: 600,
                    color: WHITE,
                    fontFamily: jakartaFamily,
                    boxShadow: `0 2px 8px ${TEAL}44`,
                  }}
                >
                  + Add Service
                </div>
              </div>

              {/* Service cards */}
              {services.map((service, i) => {
                const cardDelay = 15 + i * 12;
                const cardOpacity = interpolate(
                  frame,
                  [cardDelay, cardDelay + 8],
                  [0, 1],
                  CLAMP
                );
                const cardX = interpolate(
                  frame,
                  [cardDelay, cardDelay + 10],
                  [40, 0],
                  CLAMP
                );

                return (
                  <div
                    key={service.name}
                    style={{
                      opacity: cardOpacity,
                      transform: `translateX(${cardX}px)`,
                      background: WHITE,
                      borderRadius: 16,
                      padding: "20px 24px",
                      boxShadow:
                        "0 2px 12px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      {/* Service icon */}
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          backgroundColor: `${ACCENT_CATALOG}12`,
                          border: `1.5px solid ${ACCENT_CATALOG}25`,
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 4,
                            backgroundColor: ACCENT_CATALOG,
                            opacity: 0.7,
                          }}
                        />
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 600,
                            color: TEXT_PRIMARY,
                            fontFamily: jakartaFamily,
                          }}
                        >
                          {service.name}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: TEXT_MUTED,
                            fontFamily: jakartaFamily,
                            marginTop: 2,
                          }}
                        >
                          {service.duration}
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: TEAL,
                        fontFamily: jakartaFamily,
                      }}
                    >
                      {service.price}
                    </div>
                  </div>
                );
              })}

              {/* Share link bar */}
              {(() => {
                const linkDelay = 55;
                const linkOpacity = interpolate(
                  frame,
                  [linkDelay, linkDelay + 10],
                  [0, 1],
                  CLAMP
                );
                const linkY = interpolate(
                  frame,
                  [linkDelay, linkDelay + 10],
                  [15, 0],
                  CLAMP
                );
                const copied = frame >= 75;
                const copyOpacity = interpolate(
                  frame,
                  [75, 80],
                  [0, 1],
                  CLAMP
                );

                return (
                  <div
                    style={{
                      opacity: linkOpacity,
                      transform: `translateY(${linkY}px)`,
                      background: `${TEAL}08`,
                      border: `1px solid ${TEAL}20`,
                      borderRadius: 12,
                      padding: "14px 18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      {/* Link icon */}
                      <svg
                        width={16}
                        height={16}
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M6.5 9.5L9.5 6.5M7 4L8.5 2.5a3.182 3.182 0 114.5 4.5L11.5 8.5M9 12L7.5 13.5a3.182 3.182 0 11-4.5-4.5L4.5 7.5"
                          stroke={TEAL}
                          strokeWidth={1.5}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span
                        style={{
                          fontSize: 13,
                          color: TEXT_MUTED,
                          fontFamily: jakartaFamily,
                        }}
                      >
                        zuribills.com/c/amara-designs
                      </span>
                    </div>

                    <div
                      style={{
                        padding: "6px 14px",
                        borderRadius: 8,
                        backgroundColor: copied ? "#065f46" : TEAL,
                        fontSize: 12,
                        fontWeight: 600,
                        color: WHITE,
                        fontFamily: jakartaFamily,
                      }}
                    >
                      {copied ? (
                        <span style={{ opacity: copyOpacity }}>Copied!</span>
                      ) : (
                        "Copy Link"
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </ChromeFrame>
      </div>
    </AbsoluteFill>
  );
};
