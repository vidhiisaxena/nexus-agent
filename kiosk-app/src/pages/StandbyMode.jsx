import { useState, useEffect } from "react";
import { QrCode } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const messages = [
  "Your personal shopping assistant awaits",
  "Seamless mobile-to-store experience",
  "Already browsing online? Pick up where you left off",
];

export default function StandbyMode({ onScanQR }) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [dateTime, setDateTime] = useState(new Date());

  // Rotate messages every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Update date/time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setDateTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatDateTime = (date) => {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };
    return date.toLocaleDateString("en-US", options);
  };

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      {/* Background Gradient */}
      <div className="w-full h-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500">
        {/* Animated Gradient Overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-blue-600/50 via-purple-600/50 to-pink-500/50"
          animate={{
            backgroundPosition: ["0%", "100%", "0%"],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      {/* Centered Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 sm:gap-6 lg:gap-8 text-center px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white drop-shadow-lg tracking-wide mb-2 sm:mb-4">
            NEXUS AGENT
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white/90 mb-4 sm:mb-6 lg:mb-8">
            Your Personal Shopping Assistant
          </p>
        </motion.div>

        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <QrCode className="w-24 h-24 sm:w-32 sm:h-32 lg:w-36 lg:h-36 text-white" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-4 sm:mb-6 px-4">
            Scan Your QR Code to Continue
          </p>
        </motion.div>

        {/* Rotating Messages */}
        <div className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/80 h-6 sm:h-8 flex items-center justify-center px-4">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentMessageIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
            >
              {messages[currentMessageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Manual Entry Button */}
        <motion.button
          onClick={onScanQR}
          className="mt-2 sm:mt-4 text-base sm:text-lg lg:text-xl text-white underline cursor-pointer hover:text-white/80 transition"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Enter Code Manually
        </motion.button>
      </div>

      {/* Footer */}
      <div className="absolute bottom-3 sm:bottom-6 left-0 right-0 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0 px-4 sm:px-6 lg:px-10 text-white/90 text-sm sm:text-base lg:text-xl">
        <span className="text-center sm:text-left">
          Store Location: Main Street, Downtown
        </span>
        <span className="text-center sm:text-right">
          {formatDateTime(dateTime)}
        </span>
      </div>
    </div>
  );
}
