import { useRef, useState } from 'react';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isInputEnabled, setIsInputEnabled] = useState(false);
  const [expectedInputType, setExpectedInputType] = useState(null);
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  const appendMessage = (text) => {
    setMessages((prev) => [...prev, text]);
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
      <div style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: '1rem', height: '300px', overflowY: 'auto', borderRadius: '8px', border: '1px solid #ccc' }}>
        {messages.map((msg, idx) => (
          <div key={idx}>{msg}</div>
        ))}
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={!isInputEnabled}
          placeholder={isInputEnabled ? "Type your response..." : "Waiting for prompt..."}
          style={{ flex: 1, padding: '0.5rem', opacity: isInputEnabled ? 1 : 0.5 }}
        />
        <button onClick={handleSend} disabled={!isInputEnabled} style={{ padding: '0.5rem 1rem' }}>Send</button>
      </div>
    </div>
  );
}

export default App;
