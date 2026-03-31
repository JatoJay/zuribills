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
  STATUS_PAID,
  ACCENT_PAYMENTS,
} from "../constants-zuribills";
import { jakartaFamily } from "../utils/fonts-zuribills";
import { ChromeFrame } from "../scenes/chrome-frame";

const CLAMP = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const SEND_FRAME = 40;
const DELIVERED_FRAME = 55;
const PAID_FRAME = 72;

export const InvoicePaymentScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const browserScale = spring({
    frame: Math.max(0, frame - 2),
    fps,
    config: { damping: 20, stiffness: 100, mass: 0.9 },
  });
  const browserOpacity = interpolate(frame, [0, 10], [0, 1], CLAMP);

  // Send button click
  const buttonPressed = frame >= SEND_FRAME && frame < SEND_FRAME + 4;
  const buttonScale = buttonPressed ? 0.96 : 1;

  // Delivered toast
  const showDelivered = frame >= DELIVERED_FRAME;
  const deliveredOpacity = interpolate(
    frame,
    [DELIVERED_FRAME, DELIVERED_FRAME + 8],
    [0, 1],
    CLAMP
  );
  const deliveredY = interpolate(
    frame,
    [DELIVERED_FRAME, DELIVERED_FRAME + 10],
    [-20, 0],
    CLAMP
  );

  // Paid notification
  const showPaid = frame >= PAID_FRAME;
  const paidScale = showPaid
    ? spring({
        frame: frame - PAID_FRAME,
        fps,
        config: { damping: 12, stiffness: 150, mass: 0.6 },
      })
    : 0;

  // Cursor movement
  const cursorX = interpolate(frame, [5, 25, SEND_FRAME], [600, 520, 520], CLAMP);
  const cursorY = interpolate(frame, [5, 25, SEND_FRAME], [200, 500, 500], CLAMP);

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
        <ChromeFrame url="zuribills.com/invoices/new" scale={0.85}>
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
            {/* Invoice card */}
            <div
              style={{
                width: 480,
                background: WHITE,
                borderRadius: 20,
                padding: "36px 36px",
                boxShadow:
                  "0 8px 30px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)",
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              {/* Invoice header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: TEXT_PRIMARY,
                      fontFamily: jakartaFamily,
                    }}
                  >
                    Invoice #ZB-0042
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: TEXT_MUTED,
                      fontFamily: jakartaFamily,
                      marginTop: 2,
                    }}
                  >
                    To: Kwame Asante
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: TEAL,
                    fontFamily: jakartaFamily,
                  }}
                >
                  $550
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, backgroundColor: "#e2e8f0" }} />

              {/* Line items */}
              {[
                { item: "Logo Design", qty: 1, amount: "$150" },
                { item: "Brand Identity Package", qty: 1, amount: "$400" },
              ].map((line, i) => {
                const delay = 10 + i * 6;
                const lineOpacity = interpolate(
                  frame,
                  [delay, delay + 6],
                  [0, 1],
                  CLAMP
                );
                return (
                  <div
                    key={line.item}
                    style={{
                      opacity: lineOpacity,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: TEAL,
                          opacity: 0.5,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 14,
                          color: TEXT_PRIMARY,
                          fontFamily: jakartaFamily,
                          fontWeight: 500,
                        }}
                      >
                        {line.item}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: TEXT_PRIMARY,
                        fontFamily: jakartaFamily,
                      }}
                    >
                      {line.amount}
                    </span>
                  </div>
                );
              })}

              {/* Divider */}
              <div style={{ height: 1, backgroundColor: "#e2e8f0" }} />

              {/* Payment methods */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                {["Card", "Bank", "M-Pesa"].map((method) => (
                  <div
                    key={method}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 16,
                      backgroundColor: "#f1f5f9",
                      fontSize: 11,
                      fontWeight: 500,
                      color: TEXT_MUTED,
                      fontFamily: jakartaFamily,
                    }}
                  >
                    {method}
                  </div>
                ))}
              </div>

              {/* Send button */}
              <div
                style={{
                  width: "100%",
                  height: 48,
                  borderRadius: 24,
                  background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_LIGHT} 100%)`,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  transform: `scale(${buttonScale})`,
                  boxShadow: `0 4px 16px ${TEAL}33`,
                  gap: 8,
                }}
              >
                {/* Send icon */}
                <svg width={18} height={18} viewBox="0 0 18 18" fill="none">
                  <path
                    d="M16 2L8 10M16 2L11 16L8 10M16 2L2 7L8 10"
                    stroke={WHITE}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span
                  style={{
                    fontFamily: jakartaFamily,
                    fontSize: 15,
                    fontWeight: 600,
                    color: WHITE,
                  }}
                >
                  Send Invoice via WhatsApp
                </span>
              </div>
            </div>

            {/* Delivered toast */}
            {showDelivered && (
              <div
                style={{
                  position: "absolute",
                  top: 24,
                  right: 24,
                  opacity: deliveredOpacity,
                  transform: `translateY(${deliveredY}px)`,
                  background: "#065f46",
                  color: WHITE,
                  padding: "12px 20px",
                  borderRadius: 12,
                  fontFamily: jakartaFamily,
                  fontSize: 13,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    backgroundColor: STATUS_PAID,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2.5 6L5 8.5L9.5 3.5"
                      stroke={WHITE}
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                Invoice sent to Kwame
              </div>
            )}

            {/* PAID notification overlay */}
            {showPaid && (
              <div
                style={{
                  position: "absolute",
                  top: 80,
                  right: 24,
                  transform: `scale(${paidScale})`,
                  background: `linear-gradient(135deg, ${ACCENT_PAYMENTS}15, ${STATUS_PAID}15)`,
                  border: `1.5px solid ${STATUS_PAID}40`,
                  padding: "14px 20px",
                  borderRadius: 12,
                  fontFamily: jakartaFamily,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                }}
              >
                <div
                  style={{
                    fontSize: 22,
                  }}
                >
                  {"$"}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: STATUS_PAID,
                    }}
                  >
                    Payment Received!
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: TEXT_MUTED,
                      marginTop: 1,
                    }}
                  >
                    $550 from Kwame Asante
                  </div>
                </div>
              </div>
            )}

            {/* Mouse cursor */}
            {frame < DELIVERED_FRAME && (
              <div
                style={{
                  position: "absolute",
                  left: cursorX,
                  top: cursorY,
                  zIndex: 100,
                  pointerEvents: "none",
                }}
              >
                <svg width={22} height={26} viewBox="0 0 22 26" fill="none">
                  <path
                    d="M1 1L1 19.5L6.5 14.5L12 22L15.5 20L10 12.5L17 12L1 1Z"
                    fill={WHITE}
                    stroke="#0b0b0b"
                    strokeWidth={1.5}
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
          </div>
        </ChromeFrame>
      </div>
    </AbsoluteFill>
  );
};
