import QRCode from "qrcode";

/**
 * Generates a QR Code as a Data URL.
 * @param {string} text - The content to encode (e.g. Student ID or Roll Number)
 * @returns {Promise<string>} - Promise resolving to base64 PNG data URL
 */
export const generateQRCodeDataURL = async (text) => {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 256,
      color: {
        dark: "#0f172a", // Navy dark color for the modules
        light: "#ffffff", // White background
      },
    });
  } catch (err) {
    console.error("Failed to generate QR Code", err);
    throw err;
  }
};

/**
 * Draws a QR Code directly to an HTML canvas element.
 * @param {HTMLCanvasElement} canvasElement - Canvas reference
 * @param {string} text - The content to encode
 */
export const drawQRCodeToCanvas = async (canvasElement, text) => {
  try {
    await QRCode.toCanvas(canvasElement, text, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 200,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    });
  } catch (err) {
    console.error("Failed to render QR Code on canvas", err);
  }
};
