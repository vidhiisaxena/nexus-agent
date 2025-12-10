import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Send, User, Package, QrCode } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";
import { mockEmit } from "../services/socket";
import ProductCard from "../components/ProductCard";
import { motion } from "framer-motion";

export default function ChatPage() {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  // Initialize session ID
  useEffect(() => {
    let id = localStorage.getItem("nexus-session-id");
    if (!id) {
      id = uuidv4();
      localStorage.setItem("nexus-session-id", id);
    }
    setSessionId(id);
  }, []);

  // Listen for mock AI responses
  useEffect(() => {
    const handleAIResponse = (e) => {
      const response = e.detail;
      setIsTyping(false);

      const aiMessage = {
        id: uuidv4(),
        role: "ai",
        text: response.message,
        timestamp: new Date(),
        recommendations: response.recommendations || [],
      };

      setMessages((prev) => [...prev, aiMessage]);
      toast.success("AI responded!");
    };

    window.addEventListener("mock-ai-response", handleAIResponse);
    return () =>
      window.removeEventListener("mock-ai-response", handleAIResponse);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputText.trim() || isTyping) return;

    const userMessage = {
      id: uuidv4(),
      role: "user",
      text: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    // Mock emit
    mockEmit("mobile:message", {
      sessionId,
      message: inputText.trim(),
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleGenerateQR = () => {
    mockEmit("mobile:generateQR", { sessionId });
    navigate("/qr");
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-between px-4 z-10 shadow-md">
        <h1 className="text-lg font-semibold text-white">Nexus Agent</h1>
        <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-3 bg-[#F9FAFB] mt-16 pb-20">
        {messages.length === 0 && !isTyping && (
          <div className="flex flex-col items-center justify-center h-full -mt-16">
            <Package className="w-16 h-16 text-blue-500 opacity-50 mb-4" />
            <p className="text-gray-500 text-center">
              Start by telling me what you're looking for...
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[70%] ${
                msg.role === "user" ? "items-end" : "items-start"
              } flex flex-col`}
            >
              <div
                className={`px-4 py-2 rounded-2xl shadow-sm text-sm ${
                  msg.role === "user"
                    ? "bg-blue-500 text-white rounded-l-2xl rounded-tr-2xl"
                    : "bg-white text-gray-800 rounded-r-2xl rounded-tl-2xl"
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 px-1">
                {formatTime(msg.timestamp)}
              </span>

              {/* Product Recommendations */}
              {msg.recommendations && msg.recommendations.length > 0 && (
                <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 pt-1 mt-2 w-full scrollbar-hide -mx-2 px-2">
                  {msg.recommendations.map((product) => (
                    <ProductCard key={product.productId} product={product} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-3 py-2 shadow-sm inline-flex items-center gap-1">
              <span className="flex gap-1">
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></span>
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></span>
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></span>
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* FAB - Transfer to Store */}
      {messages.length >= 3 && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          onClick={handleGenerateQR}
          className="fixed bottom-20 right-3 sm:right-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full px-3 sm:px-4 py-2.5 sm:py-3 shadow-lg flex items-center gap-1.5 sm:gap-2 text-white text-xs sm:text-sm font-semibold z-20 hover:shadow-xl transition-all duration-300"
        >
          <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Transfer to Store</span>
          <span className="sm:hidden">Transfer</span>
        </motion.button>
      )}

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 pb-safe">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="What are you looking for?"
          disabled={isTyping}
          className="flex-1 bg-gray-100 rounded-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || isTyping}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-blue-500 flex items-center justify-center text-white shadow hover:bg-blue-600 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  );
}
