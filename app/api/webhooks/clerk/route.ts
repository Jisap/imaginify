/* eslint-disable camelcase */
import { clerkClient } from "@clerk/nextjs";
import { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";

import { createUser, deleteUser, updateUser } from "../../../../lib/actions/user.action"; // Acciones que modifican la bd


// Los webhooks sincronizan eventos de clerk con nuestra base de datos
// Cuando ocurren eventos con los usuarios en clerk, este nos envia notificaciones a nuestra app atraves de un webhook

export async function POST(req: Request) {                      // Recibimos la notificación
  
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
    );
  }

  
  const headerPayload = headers();                              // Obtenemos los headers                                 
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  
  if (!svix_id || !svix_timestamp || !svix_signature) {         // Si no hay headers lanzamos error
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }


  const payload = await req.json();                             // Obtenemos el body de la notificación de clerk  
  const body = JSON.stringify(payload);

  
  const wh = new Webhook(WEBHOOK_SECRET);                       // Creamos una instancia de Svix con nuestro secret. Svix maneja los eventos webhooks 

  let evt: WebhookEvent;                                        // Declaramos una variable de tipo WebhookEvent de clerk

  
  try {                                                         // Asignamos a la variable webhookEvent el body y los headers verificados
    evt = wh.verify(body, {                                     // con la instancia de svix
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }

  // Get the ID and type
  const { id } = evt.data;                                      // Del evento webhook obtenemos el id
  const eventType = evt.type;                                   // y el tipo

  // CREATE
  if (eventType === "user.created") {
    const { id, email_addresses, image_url, first_name, last_name, username } = evt.data; // OBtenemos del evento la data de creación del usuario

    const user = {                                              // Instancia del usuario con la data recibida
      clerkId: id,
      email: email_addresses[0].email_address,
      username: username!,
      firstName: first_name,
      lastName: last_name,
      photo: image_url,
    };

    const newUser = await createUser(user);                     // Creación en base de datos del nuevo user  

    
    if (newUser) {
      await clerkClient.users.updateUserMetadata(id, {          // Set public metadata
        publicMetadata: {
          userId: newUser._id,
        },
      });
    }

    return NextResponse.json({ message: "OK", user: newUser });
  }

  // UPDATE
  if (eventType === "user.updated") {
    const { id, image_url, first_name, last_name, username } = evt.data;

    const user = {
      firstName: first_name,
      lastName: last_name,
      username: username!,
      photo: image_url,
    };

    const updatedUser = await updateUser(id, user);

    return NextResponse.json({ message: "OK", user: updatedUser });
  }

  // DELETE
  if (eventType === "user.deleted") {
    const { id } = evt.data;

    const deletedUser = await deleteUser(id!);

    return NextResponse.json({ message: "OK", user: deletedUser });
  }

  console.log(`Webhook with and ID of ${id} and type of ${eventType}`);
  console.log("Webhook body:", body);

  return new Response("", { status: 200 });
}