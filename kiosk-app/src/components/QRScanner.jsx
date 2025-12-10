import { useState } from "react";
import { X } from "lucide-react";
import { mockScanQR } from "../services/socket";

export default function QRScanner({ onClose, onScanSuccess }) {
  const [code, setCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const handleKeypad = (value) => {
    if (value === "backspace") {
      setCode((prev) => prev.slice(0, -1));
    } else if (value === "enter") {
      handleSubmit();
    } else {
      setCode((prev) => prev + value);
    }
  };

  const handleSubmit = () => {
    if (!code.trim() || isValidating) return;

    setIsValidating(true);

    // Mock scan
    mockScanQR(code);

    setTimeout(() => {
      setIsValidating(false);
      onScanSuccess(code);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-2xl w-full rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 shadow-2xl relative flex flex-col gap-4 sm:gap-6 lg:gap-8 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 text-gray-400 hover:text-gray-600 cursor-pointer transition"
        >
          <X className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>

        {/* Heading */}
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 pr-8 sm:pr-0">
          Enter QR Code
        </h2>

        {/* Input */}
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="XXXX-XXXX-XXXX"
          className="w-full border-2 border-gray-300 rounded-xl sm:rounded-2xl py-3 sm:py-4 px-4 sm:px-6 text-xl sm:text-2xl lg:text-3xl text-center tracking-[0.2em] sm:tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isValidating}
        />

        {/* Numeric Keypad */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeypad(num.toString())}
              disabled={isValidating}
              className="w-full aspect-square max-w-[80px] sm:max-w-[100px] lg:max-w-none lg:w-24 lg:h-24 bg-gray-100 rounded-lg sm:rounded-xl flex items-center justify-center text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-800 cursor-pointer hover:bg-blue-500 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => handleKeypad("backspace")}
            disabled={isValidating}
            className="w-full aspect-square max-w-[80px] sm:max-w-[100px] lg:max-w-none lg:w-24 lg:h-24 bg-gray-100 rounded-lg sm:rounded-xl flex items-center justify-center text-lg sm:text-xl lg:text-2xl font-semibold text-gray-800 cursor-pointer hover:bg-red-500 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⌫
          </button>
          <button
            onClick={() => handleKeypad("0")}
            disabled={isValidating}
            className="w-full aspect-square max-w-[80px] sm:max-w-[100px] lg:max-w-none lg:w-24 lg:h-24 bg-gray-100 rounded-lg sm:rounded-xl flex items-center justify-center text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-800 cursor-pointer hover:bg-blue-500 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            0
          </button>
          <button
            onClick={() => handleKeypad("enter")}
            disabled={isValidating}
            className="w-full aspect-square max-w-[80px] sm:max-w-[100px] lg:max-w-none lg:w-24 lg:h-24 bg-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center text-lg sm:text-xl lg:text-2xl font-semibold text-white cursor-pointer hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✓
          </button>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!code.trim() || isValidating}
          className="mt-2 sm:mt-4 w-full h-14 sm:h-16 lg:h-20 bg-blue-600 text-white text-lg sm:text-xl lg:text-2xl font-semibold rounded-xl sm:rounded-2xl flex items-center justify-center hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isValidating ? "Validating..." : "Validate Code →"}
        </button>
      </div>
    </div>
  );
}
