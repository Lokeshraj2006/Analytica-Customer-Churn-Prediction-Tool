import { useState, useRef, useEffect } from 'react';
import { chatAPI } from '../services/api';
import { HiOutlineChatAlt2, HiOutlineX, HiOutlinePaperAirplane, HiOutlineTrash } from 'react-icons/hi';

/** Safely renders markdown-like text without dangerouslySetInnerHTML */
function SafeMessage({ text }) {
  if (!text) return null;

  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, lineIdx) => {
        // Heading lines (### or ####)
        if (/^#{3,4}\s/.test(line)) {
          const content = line.replace(/^#{3,4}\s+/, '');
          return <h4 key={lineIdx} style={{ margin: '8px 0 4px', fontSize: '0.95rem', fontWeight: 600 }}>{parseBold(content)}</h4>;
        }
        // Bullet points (•, -, *)
        if (/^\s*[•\-*]\s/.test(line)) {
          const content = line.replace(/^\s*[•\-*]\s+/, '');
          return <div key={lineIdx} style={{ paddingLeft: 12, margin: '2px 0' }}>• {parseBold(content)}</div>;
        }
        // Numbered list items
        if (/^\s*\d+\.\s/.test(line)) {
          return <div key={lineIdx} style={{ paddingLeft: 12, margin: '2px 0' }}>{parseBold(line)}</div>;
        }
        // Empty line = spacer
        if (line.trim() === '') {
          return <br key={lineIdx} />;
        }
        // Regular line
        return <div key={lineIdx} style={{ margin: '1px 0' }}>{parseBold(line)}</div>;
      })}
    </>
  );
}

/** Parse **bold** and `code` in inline text, returning React elements */
function parseBold(text) {
  const parts = text.split(/(\*\*.*?\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} style={{ background: 'rgba(139,92,246,0.15)', padding: '1px 5px', borderRadius: 4, fontSize: '0.85em' }}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

export default function ChatBot({ predictionContext = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      text: "Hi! I'm **Analytica AI** 🤖\n\nI can help you understand customer churn patterns, interpret predictions, and suggest retention strategies. Ask me anything!",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([
    'What are the top churn risk factors?',
    'How can I reduce customer churn?',
    'Explain the prediction model',
    'What does high churn probability mean?',
  ]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // When prediction context changes, add a context message
  useEffect(() => {
    if (predictionContext && predictionContext.churn_probability !== undefined) {
      const riskEmoji = predictionContext.risk_level === 'High' ? '🔴' : predictionContext.risk_level === 'Medium' ? '🟡' : '🟢';
      const contextMsg = {
        type: 'bot',
        text: `${riskEmoji} **Prediction context loaded!**\n\nChurn probability: **${(predictionContext.churn_probability * 100).toFixed(1)}%** (${predictionContext.risk_level} Risk)\nModel: ${predictionContext.model_used || 'Random Forest'}\n\nAsk me anything about this prediction — I'll provide specific insights and retention recommendations.`,
      };
      setMessages((prev) => [...prev, contextMsg]);
      setSuggestions([
        'Why is this customer at risk?',
        'What retention strategy do you recommend?',
        'How can I reduce this churn probability?',
        'What are the key risk factors here?',
      ]);
      setIsOpen(true);
    }
  }, [predictionContext]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;

    const userMessage = { type: 'user', text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatAPI.sendMessage(
        text,
        predictionContext?.prediction_id || null,
        predictionContext || null
      );
      const botMessage = { type: 'bot', text: response.data.response };
      setMessages((prev) => [...prev, botMessage]);
      if (response.data.suggestions) {
        setSuggestions(response.data.suggestions);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { type: 'bot', text: "Sorry, I couldn't process that request. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearChat = async () => {
    try {
      await chatAPI.clearHistory();
    } catch (err) {
      // Silently fail
    }
    setMessages([
      {
        type: 'bot',
        text: "Hi! I'm **Analytica AI** 🤖\n\nI can help you understand customer churn patterns, interpret predictions, and suggest retention strategies. Ask me anything!",
      },
    ]);
  };



  return (
    <>
      {/* Chat Trigger Button */}
      <button
        className="chatbot-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Chat with Analytica AI"
      >
        {isOpen ? <HiOutlineX /> : <HiOutlineChatAlt2 />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-header-avatar">🤖</div>
              <div className="chatbot-header-text">
                <h4>Analytica AI</h4>
                <p>Churn Analysis Assistant</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                className="chatbot-close"
                onClick={clearChat}
                title="Clear chat history"
              >
                <HiOutlineTrash />
              </button>
              <button className="chatbot-close" onClick={() => setIsOpen(false)}>
                <HiOutlineX />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-message ${msg.type}`}>
                <SafeMessage text={msg.text} />
              </div>
            ))}
            {loading && (
              <div className="chat-message bot">
                <div className="typing-indicator">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && messages.length <= 3 && (
            <div className="chat-suggestions">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className="chat-suggestion"
                  onClick={() => sendMessage(s)}
                  disabled={loading}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form className="chatbot-input" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Ask about churn analysis..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="chatbot-send"
              disabled={!input.trim() || loading}
            >
              <HiOutlinePaperAirplane />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
