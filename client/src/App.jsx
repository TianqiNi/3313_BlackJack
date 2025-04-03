import { useRef, useState } from 'react';
import Card from './Card';

const suits = ['♠', '♥', '♦', '♣'];

function App() {
  const [messages, setMessages] = useState([]);
	
	const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [input, setInput] = useState('');
  const [isInputEnabled, setIsInputEnabled] = useState(false);
  const [expectedInputType, setExpectedInputType] = useState(null);
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

	

  const appendMessage = (text) => {
    setMessages((prev) => [...prev, text]);
  };

	const parseHands = (message) => {
    const dealer = [];
    const player = [];
    const lines = message.split('\n');
    let current = null;

    for (let line of lines) {
			const lower = line.toLowerCase();
      if (lower.includes("dealer's hand")) {
        current = dealer;
      } else if (lower.includes("player's hand")) {
        current = player;
			} else if (lower.includes("your total is")) {
					continue;
      } else {
        const numbers = line.trim().split(/\s+/).map(Number).filter(n => !isNaN(n));
        if (current && numbers.length > 0) {
          current.push(...numbers);
        }
      }
    }

    // Only update hands if values were parsed
    if (dealer.length > 0 || player.length > 0) {
      setDealerHand(dealer);
      setPlayerHand(player);
    }
  };

  const handleSend = () => {
    const trimmedInput = input.trim().toLowerCase();
    if (!trimmedInput) return;

    let valid = false;

    if (expectedInputType === "hitOrStand") {
      valid = trimmedInput === "hit" || trimmedInput === "stand";
    } else if (expectedInputType === "continue") {
      valid = trimmedInput === "yes" || trimmedInput === "no";
    } else if (expectedInputType === "roomSelect") {
      valid = ["1", "2", "3"].includes(trimmedInput);
    } else {
      // If input type is unknown, don't send anything
      return;
    }

    if (!valid) {
      appendMessage("[Client] Invalid input. Try again.");
      return;
    }

    if (expectedInputType === "continue") {
      socketRef.current?.send("ack");
      setTimeout(() => {
        socketRef.current?.send(trimmedInput);
      }, 50); // slight delay to avoid merging
    } else {
      socketRef.current?.send(trimmedInput);
    }
    
    appendMessage(`> ${trimmedInput}`);
    setInput('');
    setIsInputEnabled(false);
    setExpectedInputType(null);
  };

	const handleButtonInput = (choice) => {
		const lowercase = choice.toLowerCase();
		if (expectedInputType === "continue") {
			socketRef.current?.send("ack");
			setTimeout(() => {
				socketRef.current?.send(lowercase);
			}, 50);
		} else {
			socketRef.current?.send(lowercase);
		}
	
		appendMessage(`> ${lowercase}`);
		setInput('');
		setIsInputEnabled(false);
		setExpectedInputType(null);
	};

  // Triggered by button click
const startGame = () => {
  const ws = new WebSocket('ws://localhost:8080');
  socketRef.current = ws;

  ws.onopen = () => {
    appendMessage('[Connected to backend]');
  };

  ws.onmessage = (event) => {
    const message = event.data.trim();
    console.log("[Raw msg]:", JSON.stringify(message));
    appendMessage(message);
		parseHands(message);

    if (message === "READY?") {
      ws.send("yes");
      appendMessage("[Auto] Sent: yes");
    } else if (message.toLowerCase().includes("do you want to hit or stand")) {
      setExpectedInputType("hitOrStand");
      setIsInputEnabled(true);
    } else if (message.toLowerCase().includes("do you want to continue playing")) {
      setExpectedInputType("continue");
      setIsInputEnabled(true);
    } else if (message.toLowerCase().includes("which room do you want to join")) {
      setExpectedInputType("roomSelect");
      setIsInputEnabled(true);
    } else if (message.toLowerCase().includes("invalid input")) {
      // don't ack, prompt for retry
    } else if (message === "Bye") {
      appendMessage("[Game ended]");
      ws.send("ack");
      ws.close();
    } else {
      ws.send("ack");
      console.log("[Client] Sent ack");
    }
  };

  ws.onclose = () => {
    appendMessage('[Disconnected]');
  };

  setConnected(true);
};

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
		<div style={{ padding: '2rem', fontFamily: 'monospace' }}>
			<h1>🃏 Blackjack Game Interface</h1>
	
			{!connected && (
				<button onClick={startGame} style={{ padding: '1rem', marginBottom: '1rem' }}>
					Start Game
				</button>
			)}
	
			<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
				<div>
					<h2>Dealer's Hand</h2>
					<div style={{ display: 'flex' }}>
						{dealerHand.map((value, idx) => (
							<Card key={`dealer-${idx}`} value={value} suit={suits[idx % 4]} cardId={`dealer-${idx}`} />
						))}
					</div>
				</div>
	
				<div>
					<h2>Your Hand</h2>
					<div style={{ display: 'flex' }}>
					{playerHand.map((value, idx) => (
						<Card key={`player-${idx}`} value={value} suit={suits[(idx + 2) % 4]} cardId={`player-${idx}`} />
					))}
					</div>
				</div>
			</div>
	
			<div style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: '1rem', height: '300px', overflowY: 'auto', borderRadius: '8px', border: '1px solid #ccc' }}>
				{messages.map((msg, idx) => (
					<div key={idx}>{msg}</div>
				))}
			</div>
	
			{/* Input section only for room selection */}
			{expectedInputType === "roomSelect" && (
				<div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
					<input
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyPress}
						disabled={!isInputEnabled}
						placeholder="Enter room number (1, 2, or 3)"
						style={{ flex: 1, padding: '0.5rem', opacity: isInputEnabled ? 1 : 0.5 }}
					/>
					<button onClick={handleSend} disabled={!isInputEnabled} style={{ padding: '0.5rem 1rem' }}>Send</button>
				</div>
			)}
	
			{/* Buttons for Hit or Stand */}
			{expectedInputType === "hitOrStand" && (
				<div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
					<button onClick={() => handleButtonInput("hit")} style={{ padding: '0.5rem 1rem' }}>Hit</button>
					<button onClick={() => handleButtonInput("stand")} style={{ padding: '0.5rem 1rem' }}>Stand</button>
				</div>
			)}
	
			{/* Buttons for Yes or No */}
			{expectedInputType === "continue" && (
				<div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
					<button onClick={() => handleButtonInput("yes")} style={{ padding: '0.5rem 1rem' }}>Yes</button>
					<button onClick={() => handleButtonInput("no")} style={{ padding: '0.5rem 1rem' }}>No</button>
				</div>
			)}
		</div>
	);	
}

export default App;
