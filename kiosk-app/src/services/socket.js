// Mock socket implementation for kiosk app
import { io } from "socket.io-client";
import { mockSession } from "./api";

const socket = io("http://localhost:5000/kiosk", {
  autoConnect: false,
});

export const mockScanQR = (qrData) => {
  console.log("[MOCK][KIOSK] Scanning QR:", qrData);

  setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent("mock-session-data", {
        detail: mockSession,
      })
    );
  }, 1500);
};

export default socket;
