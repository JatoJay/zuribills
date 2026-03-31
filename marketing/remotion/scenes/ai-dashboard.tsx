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
  STATUS_PENDING,
  STATUS_OVERDUE,
  SIDEBAR_WIDTH_PX,
  ACCENT_AI,
} from "../constants-zuribills";
import { jakartaFamily } from "../utils/fonts-zuribills";
import { ChromeFrame } from "../scenes/chrome-frame";

const CLAMP = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const navItems = [
  { label: "Dashboard", active: true },
  { label: "Invoices", active: false },
  { label: "Catalog", active: false },
  { label: "Expenses", active: false },
  { label: "Reports", active: false },
];

const invoices = [
  {
    status: STATUS_PAID,
    statusLabel: "Paid",
    client: "Kwame Asante",
    desc: "Brand Identity Package",
    amount: "$550",
    date: "Today",
  },
  {
    status: STATUS_OVERDUE,
    statusLabel: "Overdue",
    client: "Fatou Diallo",
    desc: "Social Media Kit",
    amount: "$200",
    date: "3 days ago",
  },
  {
    status: STATUS_PENDING,
    statusLabel: "Pending",
    client: "Amina Osei",
    desc: "Logo Design",
    amount: "$150",
    date: "Yesterday",
  },
  {
    status: STATUS_PAID,
    statusLabel: "Paid",
    client: "Chidi Okafor",
    desc: "Website Mockup",
    amount: "$300",
    date: "Last week",
  },
];

const stats = [
  { value: "$1,200", label: "Revenue this month", color: STATUS_PAID },
  { value: "2", label: "AI reminders sent", color: ACCENT_AI },
  { value: "87%", label: "Collection rate", color: TEAL },
];

export const ZBDashboardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const dashboardScale = spring({
    frame: Math.max(0, frame - 3),
    fps,
    config: { damping: 22, stiffness: 90, mass: 1 },
  });
  const dashboardOpacity = interpolate(frame, [0, 12], [0, 1], CLAMP);

  const sidebarItemDelay = (i: number) => 8 + i * 4;

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
          opacity: dashboardOpacity,
          transform: `scale(${dashboardScale})`,
        }}
      >
        <ChromeFrame url="zuribills.com/dashboard" scale={0.85}>
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              backgroundColor: "#f8fafc",
            }}
          >
            {/* Left Sidebar */}
            <div
              style={{
                width: SIDEBAR_WIDTH_PX,
                backgroundColor: WHITE,
                borderRight: "1px solid #e2e8f0",
                padding: "20px 0",
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
              }}
            >
              {/* Logo in sidebar */}
              <div
                style={{
                  padding: "0 20px 20px",
                  borderBottom: "1px solid #e2e8f0",
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: TEXT_PRIMARY,
                    fontFamily: jakartaFamily,
                  }}
                >
                  Zuri
                </span>
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: TEAL,
                    fontFamily: jakartaFamily,
                  }}
                >
                  Bills
                </span>
              </div>

              {/* Nav items */}
              {navItems.map((item, i) => {
                const delay = sidebarItemDelay(i);
                const itemOpacity = interpolate(
                  frame,
                  [delay, delay + 6],
                  [0, 1],
                  CLAMP
                );
                const itemX = interpolate(
                  frame,
                  [delay, delay + 8],
                  [-20, 0],
                  CLAMP
                );

                return (
                  <div
                    key={item.label}
                    style={{
                      opacity: itemOpacity,
                      transform: `translateX(${itemX}px)`,
                      padding: "10px 20px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      backgroundColor: item.active ? `${TEAL}10` : "transparent",
                      borderRight: item.active
                        ? `3px solid ${TEAL}`
                        : "3px solid transparent",
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: item.active ? TEAL : "#94a3b8",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: item.active ? 600 : 400,
                        color: item.active ? TEAL : "#64748b",
                        fontFamily: jakartaFamily,
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Main content */}
            <div
              style={{
                flex: 1,
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Stats row */}
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  marginBottom: 18,
                }}
              >
                {stats.map((stat, i) => {
                  const delay = 12 + i * 6;
                  const statOpacity = interpolate(
                    frame,
                    [delay, delay + 8],
                    [0, 1],
                    CLAMP
                  );
                  const statY = interpolate(
                    frame,
                    [delay, delay + 8],
                    [10, 0],
                    CLAMP
                  );

                  return (
                    <div
                      key={stat.label}
                      style={{
                        opacity: statOpacity,
                        transform: `translateY(${statY}px)`,
                        flex: 1,
                        background: WHITE,
                        borderRadius: 14,
                        padding: "16px 18px",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 26,
                          fontWeight: 700,
                          color: stat.color,
                          fontFamily: jakartaFamily,
                          lineHeight: 1,
                        }}
                      >
                        {stat.value}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: TEXT_MUTED,
                          fontFamily: jakartaFamily,
                          marginTop: 6,
                        }}
                      >
                        {stat.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: TEXT_PRIMARY,
                    fontFamily: jakartaFamily,
                  }}
                >
                  Recent Invoices
                </div>

                {/* AI badge */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 12px",
                    borderRadius: 20,
                    background: `${ACCENT_AI}10`,
                    border: `1px solid ${ACCENT_AI}25`,
                  }}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      backgroundColor: STATUS_PAID,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: ACCENT_AI,
                      fontFamily: jakartaFamily,
                    }}
                  >
                    AI Agent Active
                  </span>
                </div>
              </div>

              {/* Invoice list */}
              <div
                style={{
                  background: WHITE,
                  borderRadius: 14,
                  border: "1px solid #e2e8f0",
                  overflow: "hidden",
                  flex: 1,
                }}
              >
                {invoices.map((inv, i) => {
                  const rowDelay = 25 + i * 10;
                  const rowOpacity = interpolate(
                    frame,
                    [rowDelay, rowDelay + 8],
                    [0, 1],
                    CLAMP
                  );
                  const rowX = interpolate(
                    frame,
                    [rowDelay, rowDelay + 10],
                    [40, 0],
                    CLAMP
                  );

                  // AI reminder animation for overdue
                  const isOverdue = inv.statusLabel === "Overdue";
                  const aiReminderDelay = 80;
                  const showAiAction = isOverdue && frame >= aiReminderDelay;
                  const aiOpacity = showAiAction
                    ? interpolate(
                        frame,
                        [aiReminderDelay, aiReminderDelay + 10],
                        [0, 1],
                        CLAMP
                      )
                    : 0;

                  return (
                    <div
                      key={i}
                      style={{
                        opacity: rowOpacity,
                        transform: `translateX(${rowX}px)`,
                        padding: "14px 20px",
                        borderBottom:
                          i < invoices.length - 1
                            ? "1px solid #f1f5f9"
                            : "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                      }}
                    >
                      {/* Status dot */}
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          backgroundColor: inv.status,
                          flexShrink: 0,
                        }}
                      />

                      {/* Status label */}
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: inv.status,
                          fontFamily: jakartaFamily,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                          width: 60,
                          flexShrink: 0,
                        }}
                      >
                        {inv.statusLabel}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: TEXT_PRIMARY,
                              fontFamily: jakartaFamily,
                            }}
                          >
                            {inv.client}
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              color: "#475569",
                              fontFamily: jakartaFamily,
                            }}
                          >
                            {inv.desc}
                          </span>
                        </div>
                        {/* AI reminder for overdue */}
                        {isOverdue && (
                          <div
                            style={{
                              opacity: aiOpacity,
                              fontSize: 11,
                              color: ACCENT_AI,
                              fontFamily: jakartaFamily,
                              marginTop: 3,
                              fontStyle: "italic",
                            }}
                          >
                            AI sent reminder email 2 hours ago
                          </div>
                        )}
                      </div>

                      {/* Amount */}
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: TEXT_PRIMARY,
                          fontFamily: jakartaFamily,
                          flexShrink: 0,
                        }}
                      >
                        {inv.amount}
                      </div>

                      {/* Date */}
                      <div
                        style={{
                          fontSize: 12,
                          color: TEXT_MUTED,
                          fontFamily: jakartaFamily,
                          flexShrink: 0,
                          width: 65,
                          textAlign: "right",
                        }}
                      >
                        {inv.date}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </ChromeFrame>
      </div>
    </AbsoluteFill>
  );
};
