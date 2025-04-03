import React, { useRef, useEffect, useState } from 'react';

const faceOptions = ['10', 'J', 'Q', 'K'];

export default function Card({ value, suit = "♠", cardId }) {
  const [displayValue, setDisplayValue] = useState(value);

  const faceCacheRef = useRef({});

  useEffect(() => {
    if (value === 10) {
      // Use cardId (e.g., "player-0") as unique key to keep consistent
      if (!faceCacheRef.current[cardId]) {
        const randomFace = faceOptions[Math.floor(Math.random() * faceOptions.length)];
        faceCacheRef.current[cardId] = randomFace;
      }
      setDisplayValue(faceCacheRef.current[cardId]);
    } else if (value === 11) {
      setDisplayValue('A');
    } else {
      setDisplayValue(value);
    }
  }, [value, cardId]);

  return (
    <div style={styles.card}>
      <div style={styles.topLeft}>{displayValue}</div>
      <div style={styles.suit}>{suit}</div>
      <div style={styles.bottomRight}>{displayValue}</div>
    </div>
  );
}

const styles = {
  card: {
    width: '60px',
    height: '90px',
    border: '1px solid #000',
    borderRadius: '8px',
    backgroundColor: 'white',
    boxShadow: '1px 2px 4px rgba(0,0,0,0.2)',
    padding: '6px',
    margin: '4px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    fontFamily: 'Georgia, serif',
    position: 'relative',
  },
  topLeft: {
    position: 'absolute',
    top: '5px',
    left: '6px',
    fontSize: '14px',
  },
  bottomRight: {
    position: 'absolute',
    bottom: '5px',
    right: '6px',
    fontSize: '14px',
    transform: 'rotate(180deg)',
  },
  suit: {
    fontSize: '20px',
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
  }
};
