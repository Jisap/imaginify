"use server";

import { redirect } from 'next/navigation'
import Stripe from "stripe";
import { handleError } from '../utils';
import { connectToDatabase } from '../database/mongoose';
import Transaction from '../database/models/transaction.model';
import { updateCredits } from './user.action';

//Esta función se encarga de procesar un pago utilizando la API de Stripe.

export async function checkoutCredits(transaction: CheckoutTransactionParams) { // Se reciben la info sobre la transacción

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);                    // Instancia de stripe para manejar los pagos

  const amount = Number(transaction.amount) * 100;                              // Obtenemos de transaction la cantidad de créditos a comprear

  const session = await stripe.checkout.sessions.create({                       // Creamos una session de pagos en stripe
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: amount,
          product_data: {
            name: transaction.plan,
          }
        },
        quantity: 1
      }
    ],
    metadata: {
      plan: transaction.plan,
      credits: transaction.credits,
      buyerId: transaction.buyerId,
    },
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/profile`,                 // Si el pago fue exitoso -> /profile                        
    cancel_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/`,
  })

  redirect(session.url!)                                                          // Aqui el usuario completa el pago en la página de pago de Stripe.
}

// Esta función se encarga de crear una nueva transacción en la base de datos MongoDB después de que se haya completado un pago exitoso.

export async function createTransaction(transaction: CreateTransactionParams) {
  try {
    await connectToDatabase();

    // Create a new transaction with a buyerId
    const newTransaction = await Transaction.create({                           // Crea una nueva entrada en la base de datos con la información proporcionada en el objeto transaction.
      ...transaction, buyer: transaction.buyerId
    })

    await updateCredits(transaction.buyerId, transaction.credits);              // Actualiza los créditos del comprador

    return JSON.parse(JSON.stringify(newTransaction));                          // Devuelve los datos de la nueva transacción en formato JSON.
  } catch (error) {
    handleError(error)
  }
}