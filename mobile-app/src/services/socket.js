// Mock socket implementation for mobile app
import { io } from "socket.io-client";
import { mockAIResponse } from "./api";

const socket = io("http://localhost:5000/mobile", {
  autoConnect: false,
});

// Mock emit: simulates backend/SSE/socket behavior in the browser.
export const mockEmit = (event, data) => {
  console.log(`[MOCK][MOBILE] Emitting ${event}:`, data);

  if (event === "mobile:message") {
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("mock-ai-response", {
          detail: mockAIResponse,
        })
      );
    }, 2000);
  }

  if (event === "mobile:generateQR") {
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("mock-qr-generated", {
          detail: {
            qrId: "DEMO-1234-5678",
            qrImage: "MOCK_QR_IMAGE_DATA",
            expiresAt: Date.now() + 300000, // 5 minutes
          },
        })
      );
    }, 1000);
  }
};

export default socket;
