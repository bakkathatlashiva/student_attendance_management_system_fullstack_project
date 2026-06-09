import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, ShieldAlert } from "lucide-react";

export default function QRScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [errorMsg, setErrorMsg] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const scannerRef = useRef(null);
  const qrRegionId = "qr-scanner-view";

  useEffect(() => {
    if (!isOpen) return;

    let html5QrCode;
    const startScanner = async () => {
      try {
        setErrorMsg("");
        html5QrCode = new Html5Qrcode(qrRegionId);
        scannerRef.current = html5QrCode;

        const qrCodeSuccessCallback = (decodedText) => {
          // Success! Call handler
          onScanSuccess(decodedText);
          
          // Sound indicator if browser supports it
          try {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = context.createOscillator();
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(800, context.currentTime); // 800Hz
            oscillator.connect(context.destination);
            oscillator.start();
            oscillator.stop(context.currentTime + 0.1); // beep for 100ms
          } catch (e) {
            console.log("Audio beep failed: ", e);
          }
        };

        const config = { 
          fps: 10, 
          qrbox: (width, height) => {
            const minSize = Math.min(width, height);
            const qrboxSize = Math.floor(minSize * 0.65);
            return { width: qrboxSize, height: qrboxSize };
          }
        };

        // Start scanning using the environment/back camera (default) or user/front camera if back not available
        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          qrCodeSuccessCallback,
          () => {
            // Optional: Verbose error messages from scanner frame-skips. Ignore these.
          }
        );
        setIsCameraActive(true);
      } catch (err) {
        console.error("Camera startup failed: ", err);
        setErrorMsg("Failed to access camera. Please verify camera permissions in your browser.");
        setIsCameraActive(false);
      }
    };

    // Delay initialization slightly to let the DOM element render fully
    const timer = setTimeout(() => {
      startScanner();
    }, 200);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        const scanner = scannerRef.current;
        if (scanner.isScanning) {
          scanner.stop().then(() => {
            // Camera stopped successfully
          }).catch((err) => {
            console.error("Failed to stop scanner camera: ", err);
          });
        }
      }
      setIsCameraActive(false);
    };
  }, [isOpen, onScanSuccess]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container glass-panel" style={{ maxWidth: "450px" }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Camera size={18} color="var(--accent-primary)" />
            <h3 className="modal-title" style={{ margin: 0 }}>QR Code Scanner</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "center", width: "100%" }}>
            Hold the student's QR code in front of the camera to automatically mark their attendance.
          </p>

          <div className="scanner-video-container">
            <div id={qrRegionId}></div>
            {isCameraActive && <div className="scanner-overlay-crosshair"></div>}
          </div>

          {errorMsg && (
            <div className="risk-alert high w-full" style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ShieldAlert size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {!isCameraActive && !errorMsg && (
            <div style={{ padding: "2rem 0", color: "var(--text-muted)", fontSize: "0.875rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "24px", height: "24px", border: "2px solid var(--accent-primary)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }}></div>
              <span>Initializing camera feed...</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
}
