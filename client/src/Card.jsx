import React, { useRef, useEffect, useState } from "react";

const faceOptions = ["10", "J", "Q", "K"];

export default function Card({ value, suit = "♠", cardId, hidden = false }) {
  const [displayValue, setDisplayValue] = useState(value);
  const faceCacheRef = useRef({});

  const isRed = suit === "♥" || suit === "♦";
  const valueColor = isRed ? "red" : "black";

  useEffect(() => {
    if (value === 10) {
      if (!faceCacheRef.current[cardId]) {
        const randomFace =
          faceOptions[Math.floor(Math.random() * faceOptions.length)];
        faceCacheRef.current[cardId] = randomFace;
      }
      setDisplayValue(faceCacheRef.current[cardId]);
    } else if (value === 11) {
      setDisplayValue("A");
    } else {
      setDisplayValue(value);
    }
  }, [value, cardId]);

  const appliedStyle = {
    ...styles.cardBase,
    ...(hidden ? styles.hiddenCard : styles.visibleCard),
  };

  return (
    <div style={appliedStyle}>
      {!hidden && (
        <>
          <div style={{ ...styles.topLeft, color: valueColor }}>
            {displayValue}
          </div>
          <div style={{ ...styles.suit, color: valueColor }}>{suit}</div>
          <div style={{ ...styles.bottomRight, color: valueColor }}>
            {displayValue}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  cardBase: {
    width: "60px",
    height: "90px",
    border: "2px solid #000",
    borderRadius: "8px",
    margin: "4px",
    position: "relative",
    boxShadow: "2px 4px 6px rgba(0,0,0,0.4)",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  visibleCard: {
    backgroundColor: "#fff",
    padding: "6px",
    flexDirection: "column",
    fontFamily: "Georgia, serif",
  },
  hiddenCard: {
    background: `repeating-linear-gradient(
      45deg,
      #1a1a1a,
      #1a1a1a 4px,
      #2a2a2a 4px,
      #2a2a2a 8px
    )`,
    padding: "6px",
    flexDirection: "column",
    fontFamily: "Georgia, serif",
  },
  topLeft: {
    position: "absolute",
    top: "5px",
    left: "6px",
    fontSize: "16px",
    fontWeight: "bold",
  },
  bottomRight: {
    position: "absolute",
    bottom: "5px",
    right: "6px",
    fontSize: "16px",
    fontWeight: "bold",
    transform: "rotate(180deg)",
  },
  suit: {
    fontSize: "24px",
    alignSelf: "center",
    marginTop: "auto",
    marginBottom: "auto",
  },
};
