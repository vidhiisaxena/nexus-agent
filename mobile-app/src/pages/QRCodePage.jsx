import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Monitor,
  QrCode as QrCodeIcon,
  Camera,
  CheckCircle,
} from "lucide-react";
import toast from "react-hot-toast";

export default function QRCodePage() {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [status, setStatus] = useState("waiting"); // waiting, success
  const [qrData, setQrData] = useState({
    qrId: "DEMO-1234-5678",
    signature: "abc123",
  });

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Mock transfer success after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus("success");
      toast.success("Successfully transferred to kiosk!");

      const redirectTimer = setTimeout(() => {
        navigate("/");
      }, 3000);

      return () => clearTimeout(redirectTimer);
    }, 10000);

    return () => clearTimeout(timer);
  }, [navigate]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const getTimeColor = () => {
    if (timeLeft > 180) return "text-blue-600";
    if (timeLeft > 60) return "text-yellow-500";
    return "text-red-500";
  };

  const handleGenerateNew = () => {
    setTimeLeft(300);
    setStatus("waiting");
    toast.success("New QR code generated!");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-y-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate("/")}
        className="mt-4 ml-4 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 sm:gap-6 px-4 text-center py-6 sm:py-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Transfer to Kiosk
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Scan this code at any in-store kiosk
          </p>
        </div>

        {/* QR Card */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 flex items-center justify-center w-[280px] h-[280px] sm:w-[320px] sm:h-[320px]">
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=NEXUS-DEMO-1234-5678"
            alt="QR Code"
            className="w-full h-full object-contain"
          />
        </div>

        {/* QR Data */}
        <div className="text-xs font-mono text-gray-400 space-y-1">
          <div>QR ID: {qrData.qrId}</div>
          <div>Signature: {qrData.signature}</div>
        </div>

        {/* Countdown Timer */}
        <div className={`text-4xl sm:text-5xl font-bold ${getTimeColor()}`}>
          {formatTime(timeLeft)}
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-3">
          {status === "waiting" ? (
            <>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-gray-700">Waiting to be scanned...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-6 h-6 text-green-500" />
              <span className="text-green-600 font-semibold">
                ✓ Successfully transferred!
              </span>
            </>
          )}
        </div>

        {/* Instructions */}
        <div className="flex flex-col gap-4 justify-center items-start mt-4 max-w-md">
          <div className="flex items-center gap-3 text-left">
            <Monitor className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-gray-700">
              Open the Nexus kiosk app
            </span>
          </div>
          <div className="flex items-center gap-3 text-left">
            <QrCodeIcon className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-gray-700">Tap 'Scan Code'</span>
          </div>
          <div className="flex items-center gap-3 text-left">
            <Camera className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-gray-700">
              Point camera at this QR
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
          {(timeLeft === 0 || status === "success") && (
            <button
              onClick={handleGenerateNew}
              className="w-full bg-blue-600 text-white font-semibold rounded-full py-3 shadow hover:bg-blue-700 transition"
            >
              Generate New Code
            </button>
          )}
          <button
            onClick={() => navigate("/")}
            className="mt-2 text-gray-500 hover:text-gray-800 text-sm transition"
          >
            Back to Chat
          </button>
        </div>
      </div>
    </div>
  );
}
