import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { chatAPI } from '../services/api';
import { HiOutlineChatAlt2, HiOutlineX, HiOutlinePaperAirplane, HiOutlineTrash } from 'react-icons/hi';
import { useCurrency } from '../context/CurrencyContext';

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
  const { currency, currentCurrency } = useCurrency();
  const location = useLocation();

  // Auto-detect page context from current route
  const pageContext = useMemo(() => {
    const path = location.pathname.replace('/', '') || 'dashboard';
    const pageMap = {
      'dashboard': { page: 'dashboard', module: 'Core', label: 'Dashboard' },
      'predict': { page: 'predict', module: 'Core', label: 'Churn Prediction' },
      'customers': { page: 'customers', module: 'Core', label: 'Customer Management' },
      'analytics': { page: 'analytics', module: 'Core', label: 'Analytics' },
      'eda': { page: 'eda', module: 'Core', label: 'Data Explorer' },
      'explainability': { page: 'explainability', module: 'AI Intelligence', label: 'SHAP Explainability' },
      'simulator': { page: 'simulator', module: 'AI Intelligence', label: 'What-If Simulator' },
      'segments': { page: 'segments', module: 'AI Intelligence', label: 'Customer Segmentation' },
      'executive': { page: 'executive', module: 'AI Intelligence', label: 'Executive Insights' },
      'clv': { page: 'clv', module: 'AI Intelligence', label: 'CLV Dashboard' },
      'multi-industry': { page: 'multi-industry', module: 'AI Intelligence', label: 'Multi-Industry Analytics' },
      'data-quality': { page: 'data-quality', module: 'ML Engineering', label: 'Data Quality' },
      'tuning': { page: 'tuning', module: 'ML Engineering', label: 'Hyperparameter Tuning' },
      'settings': { page: 'settings', module: 'System', label: 'Settings' },
      'admin': { page: 'admin', module: 'System', label: 'Admin Panel' },
    };
    // Handle paths like /explainability/123
    const basePath = path.split('/')[0];
    return pageMap[basePath] || { page: basePath, module: 'Core', label: 'Dashboard' };
  }, [location.pathname]);

  // Dynamic header subtitle based on current page
  const headerSubtitle = useMemo(() => {
    const subtitles = {
      'dashboard': 'Dashboard Advisor',
      'predict': 'Churn Analysis Assistant',
      'customers': 'Customer Advisor',
      'analytics': 'Analytics Assistant',
      'eda': 'Data Explorer Guide',
      'explainability': 'SHAP Interpreter',
      'simulator': 'Scenario Advisor',
      'segments': 'Segmentation Advisor',
      'executive': 'Executive Analyst',
      'clv': 'CLV Analyst',
      'multi-industry': 'Multi-Industry Analyst',
      'data-quality': 'Data Quality Advisor',
      'tuning': 'ML Tuning Guide',
    };
    return subtitles[pageContext.page] || 'Analytics Assistant';
  }, [pageContext.page]);
  const [isOpen, setIsOpen] = useState(false);
  const [dimensions, setDimensions] = useState({
    width: 400,
    height: 560,
    bottom: 92,
    right: 28,
  });

  const handleMouseDown = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const { width: startW, height: startH, bottom: startB, right: startR } = dimensions;

    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      let newWidth = startW;
      let newHeight = startH;
      let newBottom = startB;
      let newRight = startR;

      // Resizing from left side
      if (direction.includes('left')) {
        newWidth = Math.max(320, startW - dx);
      }
      // Resizing from right side
      else if (direction.includes('right')) {
        newWidth = Math.max(320, startW + dx);
        newRight = startR - dx;
      }

      // Resizing from top side
      if (direction.includes('top')) {
        newHeight = Math.max(400, startH - dy);
      }
      // Resizing from bottom side
      else if (direction.includes('bottom')) {
        newHeight = Math.max(400, startH + dy);
        newBottom = startB - dy;
      }

      // Keep inside screen constraints
      setDimensions({
        width: Math.min(newWidth, window.innerWidth - 40),
        height: Math.min(newHeight, window.innerHeight - 40),
        bottom: Math.max(10, newBottom),
        right: Math.max(10, newRight),
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };

    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const [messages, setMessages] = useState([
    {
      type: 'bot',
      text: "Hey! I'm your Analytica assistant 👋\n\nTell me what you're looking at and I'll help you make sense of the churn data, predictions, or anything else on screen.",
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);
  const lastPredictionIdRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update suggestions when page changes
  useEffect(() => {
    const pageSuggestions = {
      'dashboard': [
        'What does my overall churn rate indicate?',
        'Which KPIs need immediate attention?',
        'How is revenue at risk calculated?',
        'What trends do you see in the data?',
      ],
      'predict': [
        'What are the top churn risk factors?',
        'How can I reduce customer churn?',
        'Explain the prediction model',
        'What does high churn probability mean?',
      ],
      'multi-industry': [
        'Compare telecom vs banking churn rates',
        'What drives healthcare customer churn?',
        'Which industry has the highest churn?',
        'What are e-commerce retention best practices?',
      ],
      'segments': [
        'Describe the High Risk Churners segment',
        'How do I retain Price Sensitive customers?',
        'What defines Loyal Champions?',
        'Compare segment churn rates',
      ],
      'clv': [
        'How is Customer Lifetime Value calculated?',
        'Which customers have highest revenue at risk?',
        'Explain CLV tiers',
        'How can I improve CLV for at-risk customers?',
      ],
      'executive': [
        'Generate an executive summary',
        'What are the key business insights?',
        'What is the total revenue at risk?',
        'What strategic actions do you recommend?',
      ],
      'explainability': [
        'What does SHAP stand for?',
        'Which features matter most for churn?',
        'How do I read a waterfall chart?',
        'What are global vs local explanations?',
      ],
      'simulator': [
        'What if I change the contract type?',
        'How does tenure affect churn probability?',
        'What retention scenario is most effective?',
        'Compare monthly vs annual contract impact',
      ],
      'eda': [
        'What are the key dataset statistics?',
        'Which features correlate most with churn?',
        'How are the features distributed?',
        'Compare model accuracies',
      ],
      'data-quality': [
        'Are there any data quality issues?',
        'How do I handle missing values?',
        'Is there class imbalance in the dataset?',
        'What is the overall data health score?',
      ],
      'tuning': [
        'Should I use grid search or random search?',
        'How many CV folds should I use?',
        'Which model should I tune first?',
        'What hyperparameters can I tune?',
      ],
    };
    setSuggestions(pageSuggestions[pageContext.page] || [
      'What are the top churn risk factors?',
      'How can I reduce customer churn?',
      'Explain the prediction model',
      'What does high churn probability mean?',
    ]);
  }, [pageContext.page]);

  const lastTriggerTimestampRef = useRef(null);

  // When prediction context changes, add a context message
  useEffect(() => {
    if (predictionContext && predictionContext.churn_probability !== undefined) {
      // Prevent automatic opening if the trigger timestamp has not changed
      if (predictionContext.chat_trigger_timestamp === lastTriggerTimestampRef.current) {
        return;
      }
      lastTriggerTimestampRef.current = predictionContext.chat_trigger_timestamp;

      const riskEmoji = predictionContext.risk_level === 'High' ? '🔴' : predictionContext.risk_level === 'Medium' ? '🟡' : '🟢';
      const contextMsg = {
        type: 'bot',
        text: `${riskEmoji} **Prediction loaded!**\n\nChurn probability: **${(predictionContext.churn_probability * 100).toFixed(1)}%** (${predictionContext.risk_level} Risk)\nModel: ${predictionContext.model_used || 'Random Forest'}\n\nWhat would you like to know about this customer?`,
        ts: Date.now(),
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

    const userMessage = { type: 'user', text, ts: Date.now() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSuggestions([]);
    setLoading(true);

    try {
      const response = await chatAPI.sendMessage(
        text,
        predictionContext?.prediction_id || null,
        {
          ...(predictionContext || {}),
          currency_code: currency,
          currency_symbol: currentCurrency?.symbol || '$',
          currency_rate: currentCurrency?.rate || 1.0,
        },
        pageContext
      );
      const botMessage = { type: 'bot', text: response.data.response, ts: Date.now() };
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
        text: "Hey! I'm your Analytica assistant 👋\n\nTell me what you're looking at and I'll help you make sense of the churn data, predictions, or anything else on screen.",
        ts: Date.now(),
      },
    ]);
  };



  return (
    <>
      {/* Chat Trigger Button */}
      <button
        className="chatbot-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Chat with Analytica"
        aria-label="Open Analytica assistant"
      >
        {isOpen ? <HiOutlineX /> : <HiOutlineChatAlt2 />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className="chatbot-window"
          style={{
            width: dimensions.width,
            height: dimensions.height,
            bottom: dimensions.bottom,
            right: dimensions.right,
          }}
        >
          {/* Resize handles for all sides and corners */}
          <div className="chatbot-resizer resizer-t" onMouseDown={(e) => handleMouseDown(e, 'top')} />
          <div className="chatbot-resizer resizer-b" onMouseDown={(e) => handleMouseDown(e, 'bottom')} />
          <div className="chatbot-resizer resizer-l" onMouseDown={(e) => handleMouseDown(e, 'left')} />
          <div className="chatbot-resizer resizer-r" onMouseDown={(e) => handleMouseDown(e, 'right')} />
          <div className="chatbot-resizer resizer-tl" onMouseDown={(e) => handleMouseDown(e, 'top-left')} />
          <div className="chatbot-resizer resizer-tr" onMouseDown={(e) => handleMouseDown(e, 'top-right')} />
          <div className="chatbot-resizer resizer-bl" onMouseDown={(e) => handleMouseDown(e, 'bottom-left')} />
          <div className="chatbot-resizer resizer-br" onMouseDown={(e) => handleMouseDown(e, 'bottom-right')} />

          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              {/* Avatar with status dot */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div className="chatbot-header-avatar" style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  fontWeight: 800, fontSize: '0.9rem', color: 'white',
                  letterSpacing: '-0.5px',
                }}>
                  A
                </div>
                <div style={{
                  position: 'absolute', bottom: -2, right: -2,
                  width: 10, height: 10, borderRadius: '50%',
                  background: '#10b981',
                  border: '2px solid rgba(12,16,28,0.95)',
                }} />
              </div>
              <div className="chatbot-header-text">
                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700 }}>Analytica</h4>
                <p style={{ margin: 0, fontSize: '0.7rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulseRing 2s infinite' }} />
                  {headerSubtitle}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                className="chatbot-close"
                onClick={clearChat}
                title="Clear chat"
                style={{ opacity: 0.6 }}
              >
                <HiOutlineTrash />
              </button>
              <button className="chatbot-close" onClick={() => setIsOpen(false)} title="Close">
                <HiOutlineX />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-message ${msg.type}`}>
                <SafeMessage text={msg.text} />
                {msg.ts && (
                  <div style={{
                    fontSize: '0.65rem',
                    color: msg.type === 'user' ? 'rgba(255,255,255,0.45)' : 'rgba(100,116,139,0.7)',
                    marginTop: 5,
                    textAlign: msg.type === 'user' ? 'right' : 'left',
                  }}>
                    {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="chat-message bot" style={{ padding: '10px 16px' }}>
                <div className="typing-indicator">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="suggestion-pills">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className="suggestion-pill"
                  onClick={() => sendMessage(s)}
                  disabled={loading}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form className="chatbot-input-wrapper" onSubmit={handleSubmit}>
            <input
              type="text"
              className="chatbot-input" placeholder="Type a message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="chatbot-send"
              disabled={!input.trim() || loading}
              title="Send"
            >
              <HiOutlinePaperAirplane />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
