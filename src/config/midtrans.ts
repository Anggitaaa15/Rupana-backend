
import dotenv from "dotenv";

dotenv.config();

const serverKey = process.env.MIDTRANS_SERVER_KEY;

if (!serverKey) {
    throw new Error("MIDTRANS_SERVER_KEY belum dikonfigurasi");
}

const isProduction =
    process.env.MIDTRANS_IS_PRODUCTION === "true";

export const midtransConfig = {
    serverKey,
    baseUrl: isProduction
        ? "https://app.midtrans.com"
        : "https://app.sandbox.midtrans.com",
};
