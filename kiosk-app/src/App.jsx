import { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { AnimatePresence } from "framer-motion";
import StandbyMode from "./pages/StandbyMode";
import ActiveMode from "./pages/ActiveMode";
import QRScanner from "./components/QRScanner";

function App() {
  const [mode, setMode] = useState("standby"); // 'standby' | 'active'
  const [session, setSession] = useState(null);
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Listen for mock session data
  useEffect(() => {
    const handleSessionData = (e) => {
      setSession(e.detail);
      setMode("active");
    };

    window.addEventListener("mock-session-data", handleSessionData);
    return () =>
      window.removeEventListener("mock-session-data", handleSessionData);
  }, []);

  const handleScanQR = () => {
    setShowQRScanner(true);
  };

  const handleScanSuccess = (code) => {
    // QR code was validated, session data should come from mock event
    console.log("QR code validated:", code);
  };

  const handleStartOver = () => {
    setMode("standby");
    setSession(null);
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {mode === "standby" ? (
          <StandbyMode key="standby" onScanQR={handleScanQR} />
        ) : (
          <ActiveMode
            key="active"
            session={session}
            onStartOver={handleStartOver}
          />
        )}
      </AnimatePresence>

      {showQRScanner && (
        <QRScanner
          onClose={() => setShowQRScanner(false)}
          onScanSuccess={handleScanSuccess}
        />
      )}

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#363636",
            color: "#fff",
            fontSize: "18px",
            padding: "16px 24px",
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: "#10B981",
              secondary: "#fff",
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: "#EF4444",
              secondary: "#fff",
            },
          },
        }}
      />
    </>
  );
}

export default App;
