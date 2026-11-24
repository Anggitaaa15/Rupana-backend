
import { midtransConfig } from "../config/midtrans";

interface CreateTransactionParams {
    orderId: string;
    amount: number;
    customerName: string;
    customerEmail: string;
}

export const createSnapTransaction = async (
    params: CreateTransactionParams
) => {
    const auth = Buffer
        .from(`${midtransConfig.serverKey}:`)
        .toString("base64");

    const response = await fetch(
        `${midtransConfig.baseUrl}/snap/v1/transactions`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${auth}`,
            },
            body: JSON.stringify({
                transaction_details: {
                    order_id: params.orderId,
                    gross_amount: params.amount,
                },
                customer_details: {
                    first_name: params.customerName,
                    email: params.customerEmail,
                },
            }),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.error_messages?.join(", ") ||
            "Gagal membuat transaksi Midtrans"
        );
    }

    return {
        token: data.token,
        redirectUrl: data.redirect_url,
    };
};
