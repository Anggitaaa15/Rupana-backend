import crypto from "crypto";
import { midtransConfig } from "../config/midtrans";

// Memverifikasi keaslian notifikasi dari Midtrans
export const verifyMidtransSignature = (
    orderId: string,
    statusCode: string,
    grossAmount: string,
    receivedSignature: string
): boolean => {

    // Membuat signature menggunakan algoritma SHA512
    const expectedSignature = crypto
        .createHash("sha512")
        .update(
            orderId +
            statusCode +
            grossAmount +
            midtransConfig.signatureKey
        )
        .digest("hex");

    // Membandingkan signature buatan backend dengan signature dari Midtrans
    return (
        expectedSignature.length === receivedSignature.length &&
        crypto.timingSafeEqual(
            Buffer.from(expectedSignature),
            Buffer.from(receivedSignature)
        )
    );
};
