import dotenv from "dotenv";

dotenv.config();

// Mengambil Server Key dari environment
const serverKey = process.env.MIDTRANS_SERVER_KEY;

if (!serverKey) {
    throw new Error("MIDTRANS_SERVER_KEY belum dikonfigurasi");
}

// Mengambil Signature Key untuk verifikasi webhook
const signatureKey = process.env.MIDTRANS_SIGNATURE_KEY;

if (!signatureKey) {
    throw new Error("MIDTRANS_SIGNATURE_KEY belum dikonfigurasi");
}

// Menentukan environment Midtrans
const isProduction =
    process.env.MIDTRANS_IS_PRODUCTION === "true";

// Konfigurasi Midtrans
export const midtransConfig = {
    serverKey,
    signatureKey,
    baseUrl: isProduction
        ? "https://app.midtrans.com"
        : "https://app.sandbox.midtrans.com",
};
