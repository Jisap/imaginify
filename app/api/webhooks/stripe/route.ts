/* eslint-disable camelcase */
import { createTransaction } from "@/lib/actions/transaction.action";
import { NextResponse } from "next/server";
import stripe from "stripe";

// webhook de Stripe que escucha eventos de Stripe y realiza acciones específicas en función del tipo de evento recibido. 

export async function POST(request: Request) {                            // La función POST maneja las solicitudes POST recibidas por el webhook.

  const body = await request.text();                                      // Obtención del cuerpo de la solicitud

  const sig = request.headers.get("stripe-signature") as string;          // Se obtiene la firma del webhook de los encabezados de la solicitud
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);    // Verificación de la firma del webhook proporcionando: body, firma y secret
  } catch (err) {
    return NextResponse.json({ message: "Webhook error", error: err });
  }

  // Get the ID and type
  const eventType = event.type;                                           // De la verificación obtenemos el evento y de el, el tipo 

  // CREATE
  if (eventType === "checkout.session.completed") {                       // Si el evento es de tipo "checkout.session.completed"
    const { id, amount_total, metadata } = event.data.object;             // se extraen los datos relevantes del objeto de datos del evento

    const transaction = {                                                 // Se crea un objeto transaction con esa información
      stripeId: id,
      amount: amount_total ? amount_total / 100 : 0,
      plan: metadata?.plan || "",
      credits: Number(metadata?.credits) || 0,
      buyerId: metadata?.buyerId || "",
      createdAt: new Date(),
    };

    const newTransaction = await createTransaction(transaction);          // Con dicho obj se llama a la función createTransaction para crear una nueva transacción en la base de datos.

    return NextResponse.json({ message: "OK", transaction: newTransaction });// Se devuelve una respuesta JSON con un mensaje de "OK" 
  }                                                                          // y los detalles de la transacción creada si el evento es de tipo "checkout.session.completed".  

  return new Response("", { status: 200 });                               // Si el evento no coincide con ningún tipo conocido, se devuelve una respuesta vacía con un código de estado 200.
}