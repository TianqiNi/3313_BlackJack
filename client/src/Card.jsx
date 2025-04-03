import React, { useRef, useEffect, useState } from 'react';

const faceOptions = ['10', 'J', 'Q', 'K'];

export default function Card({ value, suit = "♠", cardId, hidden = false }) {
  const [displayValue, setDisplayValue] = useState(value);

  const faceCacheRef = useRef({});
  const isRed = suit === '♥' || suit === '♦';
  const valueColor = isRed ? 'red' : 'black';

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
      {hidden ? (
        <div style={styles.hiddenCard}></div>
      ) : (
        <>
          <div style={{ ...styles.topLeft, color: valueColor }}>{displayValue}</div>
          <div style={{ ...styles.suit, color: valueColor }}>
            {suit}
          </div>
          <div style={{ ...styles.bottomRight, color: valueColor }}>{displayValue}</div>
        </>
      )}
    </div>
  );  
}

const styles = {
  card: {
    width: '60px',
    height: '90px',
    border: '2px solid #000',
    borderRadius: '8px',
    backgroundColor: '#fff',
    padding: '6px',
    margin: '4px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    fontFamily: 'Georgia, serif',
    position: 'relative',
    boxShadow: '2px 4px 6px rgba(0,0,0,0.4)',
    overflow: 'hidden',
  },
  topLeft: {
    position: 'absolute',
    top: '5px',
    left: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#000',
  },
  bottomRight: {
    position: 'absolute',
    bottom: '5px',
    right: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#000',
    transform: 'rotate(180deg)',
  },
  suit: {
    fontSize: '24px',
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
    color: '#000',
  },
  hiddenCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: '8px',
    background: `repeating-linear-gradient(
      45deg,
      #1a1a1a,
      #1a1a1a 4px,
      #2a2a2a 4px,
      #2a2a2a 8px
    )`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }  
};
