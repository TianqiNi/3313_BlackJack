import { useEffect, useRef, useState } from 'react';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isInputEnabled, setIsInputEnabled] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');
    socketRef.current = ws;

    ws.onopen = () => {
      appendMessage('[Connected to backend]');
    };

    ws.onmessage = (event) => {
      const message = event.data.trim();
      appendMessage(message);

      // Auto responses based on server message
      if (message === "READY?") {
        ws.send("yes");
        appendMessage("[Auto] Sent: yes");
        return;
      }

      // Server prompt expecting a user response
      const prompts = [
        "Do you want to hit or stand",
        "Do you want to continue playing",
        "Which room do you want to join",
        "Invalid input"
      ];
      
      if (prompts.some(p => message.toLowerCase().includes(p.toLowerCase()))) {
        ws.send("ack");
        setIsInputEnabled(true); // Enable user input
      } else {
        ws.send("ack");
        setIsInputEnabled(false);
      }
      

      // Auto exit
      if (message === "Bye") {
        appendMessage("[Game ended]");
        ws.close();
      }
    };

    ws.onclose = () => {
      appendMessage('[Disconnected]');
    };

    return () => {
      ws.close();
    };
  }, []);

  const appendMessage = (text) => {
    setMessages((prev) => [...prev, text]);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    socketRef.current?.send(input.trim());
    appendMessage(`> ${input.trim()}`);
    setInput('');
    setIsInputEnabled(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h1>🃏 Blackjack Game Interface</h1>
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
