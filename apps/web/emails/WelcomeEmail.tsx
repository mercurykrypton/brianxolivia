import * as React from "react";

interface WelcomeEmailProps {
  displayName: string;
  role: "FAN" | "CREATOR";
  appUrl: string;
}

export function WelcomeEmail({ displayName, role, appUrl }: WelcomeEmailProps) {
  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        background: "#0a0a0a",
        color: "#fafafa",
        padding: "40px 20px",
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #FF1493, #9B59B6)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              fontWeight: "bold",
              color: "white",
            }}
          >
            B
          </div>
          <span
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              background: "linear-gradient(135deg, #FF1493, #9B59B6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            brianXolivia
          </span>
        </div>
      </div>

      {/* Card */}
      <div
        style={{
          background: "#111111",
          border: "1px solid #222222",
          borderRadius: "16px",
          padding: "32px",
          marginBottom: "24px",
        }}
      >
        <h1
          style={{
            fontSize: "28px",
            fontWeight: "bold",
            marginBottom: "8px",
            marginTop: 0,
          }}
        >
          Welcome to brianXolivia, {displayName}! 🎉
        </h1>

        <p
          style={{
            color: "#888888",
            fontSize: "16px",
            lineHeight: "1.6",
            marginBottom: "24px",
          }}
        >
          {role === "CREATOR"
            ? "Your creator account is all set! Start creating exclusive content and connect with your fans."
            : "Your account is ready! Discover amazing creators and subscribe to exclusive content."}
        </p>

        {role === "CREATOR" ? (
          <div style={{ marginBottom: "24px" }}>
            <p
              style={{
                fontWeight: "600",
                marginBottom: "12px",
                color: "#fafafa",
              }}
            >
              Get started:
            </p>
            <ul style={{ color: "#888888", paddingLeft: "16px", lineHeight: "2" }}>
              <li>Set up your creator profile with a bio and photos</li>
              <li>Create your subscription tiers</li>
              <li>Connect your Stripe account for payouts</li>
              <li>Upload your first exclusive content</li>
            </ul>
          </div>
        ) : (
          <div style={{ marginBottom: "24px" }}>
            <p
              style={{
                fontWeight: "600",
                marginBottom: "12px",
                color: "#fafafa",
              }}
            >
              Explore brianXolivia:
            </p>
            <ul style={{ color: "#888888", paddingLeft: "16px", lineHeight: "2" }}>
              <li>Discover creators in the Explore section</li>
              <li>Subscribe for exclusive content</li>
              <li>Message creators directly</li>
              <li>Send tips to your favorites</li>
            </ul>
          </div>
        )}

        <a
          href={role === "CREATOR" ? `${appUrl}/dashboard` : `${appUrl}/explore`}
          style={{
            display: "inline-block",
            background: "linear-gradient(135deg, #FF1493, #9B59B6)",
            color: "white",
            padding: "12px 28px",
            borderRadius: "10px",
            textDecoration: "none",
            fontWeight: "600",
            fontSize: "15px",
          }}
        >
          {role === "CREATOR" ? "Go to Dashboard" : "Explore Creators"}
        </a>
      </div>

      {/* Footer */}
      <p
        style={{
          color: "#444444",
          fontSize: "12px",
          textAlign: "center",
        }}
      >
        brianXolivia · Exclusive couples content
        <br />
        18+ only · All creators are verified
      </p>
    </div>
  );
}

export default WelcomeEmail;
