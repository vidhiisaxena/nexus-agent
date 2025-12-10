import { useState, useEffect, useRef } from "react";
import { Bell, RotateCcw, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import ProductCard from "../components/ProductCard";
import { mockSession } from "../services/api";

export default function ActiveMode({ session = mockSession, onStartOver }) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [timeoutCountdown, setTimeoutCountdown] = useState(30);
  const lastInteractionRef = useRef(Date.now());
  const timeoutTimerRef = useRef(null);
  const warningTimerRef = useRef(null);

  // Auto-timeout logic
  useEffect(() => {
    const checkInactivity = () => {
      const timeSinceLastInteraction = Date.now() - lastInteractionRef.current;
      const twoMinutes = 2 * 60 * 1000;

      if (timeSinceLastInteraction >= twoMinutes && !showTimeoutWarning) {
        setShowTimeoutWarning(true);
        setTimeoutCountdown(30);

        // Countdown to auto-return
        const countdownInterval = setInterval(() => {
          setTimeoutCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              handleForceStartOver();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        warningTimerRef.current = countdownInterval;
      }
    };

    timeoutTimerRef.current = setInterval(checkInactivity, 1000);

    // Track user interactions
    const updateInteraction = () => {
      lastInteractionRef.current = Date.now();
      if (showTimeoutWarning) {
        setShowTimeoutWarning(false);
        if (warningTimerRef.current) {
          clearInterval(warningTimerRef.current);
        }
      }
    };

    window.addEventListener("click", updateInteraction);
    window.addEventListener("keydown", updateInteraction);
    window.addEventListener("touchstart", updateInteraction);

    return () => {
      if (timeoutTimerRef.current) clearInterval(timeoutTimerRef.current);
      if (warningTimerRef.current) clearInterval(warningTimerRef.current);
      window.removeEventListener("click", updateInteraction);
      window.removeEventListener("keydown", updateInteraction);
      window.removeEventListener("touchstart", updateInteraction);
    };
  }, [showTimeoutWarning]);

  const handleCallAssociate = () => {
    lastInteractionRef.current = Date.now();
    toast.success("Calling associate...");
  };

  const handleStartOver = () => {
    lastInteractionRef.current = Date.now();
    setShowConfirmDialog(true);
  };

  const handleConfirmStartOver = () => {
    setShowConfirmDialog(false);
    onStartOver();
  };

  const handleForceStartOver = () => {
    setShowTimeoutWarning(false);
    onStartOver();
  };

  const getOccasionEmoji = (occasion) => {
    const emojis = {
      wedding: "💒",
      casual: "👕",
      formal: "👔",
      party: "🎉",
    };
    return emojis[occasion] || "🛍️";
  };

  const getStyleEmoji = (style) => {
    const emojis = {
      formal: "👔",
      casual: "👕",
      sporty: "🏃",
    };
    return emojis[style] || "👔";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-screen h-screen bg-[#F9FAFB] flex flex-col"
    >
      {/* Header */}
      <div className="min-h-24 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 px-4 sm:px-6 lg:px-10 py-4">
        <div className="flex-1 lg:mr-6">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl px-4 sm:px-6 lg:px-8 py-3 sm:py-4 shadow-lg">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
              Welcome back!
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-white/90">
              We've picked these just for your occasion.
            </p>
          </div>
        </div>
        <div className="w-full lg:w-[400px] bg-white rounded-xl shadow-lg p-4 sm:p-6 flex flex-col gap-3">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">
            Session Summary
          </h2>
          <div className="space-y-1 text-sm sm:text-base lg:text-lg text-gray-700">
            <p>
              Occasion: {session.parsedIntent?.occasion || "N/A"}{" "}
              {getOccasionEmoji(session.parsedIntent?.occasion)}
            </p>
            <p>
              Style: {session.parsedIntent?.style || "N/A"}{" "}
              {getStyleEmoji(session.parsedIntent?.style)}
            </p>
            <p>Season: {session.parsedIntent?.season || "N/A"} ☀️</p>
            <p>Budget: ${session.parsedIntent?.budget || 0} 💰</p>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {session.tags?.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs sm:text-sm font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 sm:px-6 lg:px-10 pb-32 pt-4 overflow-y-auto">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-6 sm:mb-8">
          Recommended For You
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {session.recommendations?.map((product, index) => (
            <ProductCard
              key={product.productId}
              product={product}
              index={index}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 h-auto min-h-28 bg-white shadow-inner flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0 px-4 sm:px-6 lg:px-10 py-4 sm:py-0">
        <button
          onClick={handleCallAssociate}
          className="flex items-center justify-center gap-2 sm:gap-3 bg-green-600 text-white px-6 sm:px-8 lg:px-12 py-4 sm:py-5 lg:py-6 text-lg sm:text-xl lg:text-2xl font-semibold rounded-xl sm:rounded-2xl hover:bg-green-700 active:scale-95 transition flex-1 sm:flex-none"
        >
          <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="hidden sm:inline">Call Associate</span>
          <span className="sm:hidden">Call</span>
        </button>
        <button
          onClick={handleStartOver}
          className="flex items-center justify-center gap-2 sm:gap-3 bg-gray-600 text-white px-6 sm:px-8 lg:px-12 py-4 sm:py-5 lg:py-6 text-lg sm:text-xl lg:text-2xl font-semibold rounded-xl sm:rounded-2xl hover:bg-gray-700 active:scale-95 transition flex-1 sm:flex-none"
        >
          <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="hidden sm:inline">Start Over</span>
          <span className="sm:hidden">Reset</span>
        </button>
      </div>

      {/* Confirm Dialog */}
      <AnimatePresence>
        {showConfirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowConfirmDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 max-w-md w-full mx-4 shadow-2xl"
            >
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
                Return to Home?
              </h3>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-6 sm:mb-8">
                Are you sure you want to return to the welcome screen?
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="flex-1 bg-gray-200 text-gray-800 font-semibold rounded-lg sm:rounded-xl py-3 sm:py-4 text-base sm:text-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmStartOver}
                  className="flex-1 bg-blue-600 text-white font-semibold rounded-lg sm:rounded-xl py-3 sm:py-4 text-base sm:text-lg hover:bg-blue-700 transition"
                >
                  Yes, Start Over
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeout Warning */}
      <AnimatePresence>
        {showTimeoutWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 max-w-md w-full mx-4 shadow-2xl text-center"
            >
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
                Still shopping?
              </h3>
              <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 mb-4 sm:mb-6">
                Returning to home in {timeoutCountdown} seconds...
              </p>
              <button
                onClick={() => {
                  lastInteractionRef.current = Date.now();
                  setShowTimeoutWarning(false);
                  if (warningTimerRef.current) {
                    clearInterval(warningTimerRef.current);
                  }
                }}
                className="bg-blue-600 text-white font-semibold rounded-lg sm:rounded-xl py-3 sm:py-4 px-6 sm:px-8 text-base sm:text-lg lg:text-xl hover:bg-blue-700 transition"
              >
                Continue Shopping
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
