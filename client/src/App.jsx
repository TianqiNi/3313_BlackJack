import { useRef, useState } from 'react';
import Card from './Card';
import './App.css';


const suits = ['♠', '♥', '♦', '♣'];

const calculateTotal = (hand) => {
  let total = 0;
  let aceCount = 0;

  for (let value of hand) {
    if (value === 11) aceCount++;
    total += value;
  }

  while (total > 21 && aceCount > 0) {
    total -= 10;
    aceCount--;
  }

  return total;
};


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
		<div className="app-container">
			<h1>🃏 Blackjack Game Interface</h1>

			{!connected && (
				<button onClick={startGame} className="start-button">
					Start Game
				</button>
			)}

			<div className="hand-container">
				<div>
					<h2>Dealer's Hand (Total: {calculateTotal(dealerHand)})</h2>
					<div className="cards-row">
						{dealerHand.map((value, idx) => (
							<Card key={`dealer-${idx}`} value={value} suit={suits[idx % 4]} cardId={`dealer-${idx}`} />
						))}
					</div>
				</div>

				<div>
					<h2>Your Hand (Total: {calculateTotal(playerHand)})</h2>
					<div className="cards-row">
						{playerHand.map((value, idx) => (
							<Card key={`player-${idx}`} value={value} suit={suits[(idx + 2) % 4]} cardId={`player-${idx}`} />
						))}
					</div>
				</div>
			</div>

			<div className="message-box">
				{messages.map((msg, idx) => (
					<div key={idx}>{msg}</div>
				))}
			</div>

			{expectedInputType === "roomSelect" && (
				<div className="input-section">
					<input
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyPress}
						disabled={!isInputEnabled}
						placeholder="Enter room number (1, 2, or 3)"
						style={{ opacity: isInputEnabled ? 1 : 0.5 }}
					/>
					<button onClick={handleSend} disabled={!isInputEnabled}>Send</button>
				</div>
			)}

			{expectedInputType === "hitOrStand" && (
				<div className="button-group">
					<button onClick={() => handleButtonInput("hit")}>Hit</button>
					<button onClick={() => handleButtonInput("stand")}>Stand</button>
				</div>
			)}

			{expectedInputType === "continue" && (
				<div className="button-group">
					<button onClick={() => handleButtonInput("yes")}>Yes</button>
					<button onClick={() => handleButtonInput("no")}>No</button>
				</div>
			)}
		</div>

	);	
}

export default App;
