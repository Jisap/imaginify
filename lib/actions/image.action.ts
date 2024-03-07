"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "../database/mongoose";
import { handleError } from "../utils";
import User from "../database/models/user.model";
import Image from "../database/models/image.model";
import { redirect } from "next/navigation";

import { v2 as cloudinary } from 'cloudinary'

const populateUser = (query: any) => query.populate({
  path: 'author',                             // La prop author en la imagen
  model: User,                                // será "poblada" con la información del modelo User
  select: '_id firstName lastName clerkId'    // seleccionando solo ciertos campos como _id, firstName, lastName y clerkId
})

// ADD IMAGE
export async function addImage({ image, userId, path }: AddImageParams) {
  try {
    await connectToDatabase();

    const author = await User.findById(userId);

    if (!author) {
      throw new Error("User not found");
    }

    const newImage = await Image.create({
      ...image,
      author: author._id,
    })

    revalidatePath(path);

    return JSON.parse(JSON.stringify(newImage));
  } catch (error) {
    handleError(error)
  }
}

// UPDATE IMAGE
export async function updateImage({ image, userId, path }: UpdateImageParams) {
  try {
    await connectToDatabase();

    const imageToUpdate = await Image.findById(image._id);

    if (!imageToUpdate || imageToUpdate.author.toHexString() !== userId) {
      throw new Error("Unauthorized or image not found");
    }

    const updatedImage = await Image.findByIdAndUpdate(
      imageToUpdate._id,
      image,
      { new: true }
    )

    revalidatePath(path);

    return JSON.parse(JSON.stringify(updatedImage));
  } catch (error) {
    handleError(error)
  }
}

// DELETE IMAGE
export async function deleteImage(imageId: string) {
  try {
    await connectToDatabase();

    await Image.findByIdAndDelete(imageId);
  } catch (error) {
    handleError(error)
  } finally {
    redirect('/')
  }
}

// GET IMAGE
export async function getImageById(imageId: string) {
  try {
    await connectToDatabase();

    const image = await populateUser(Image.findById(imageId)); // Se busca una imagen por id y su campo author se rellena con la info de su User

    if (!image) throw new Error("Image not found");

    return JSON.parse(JSON.stringify(image));
  } catch (error) {
    handleError(error)
  }
}

// GET IMAGES
export async function getAllImages({ limit = 9, page = 1, searchQuery = '' }: {
  limit?: number;
  page: number;
  searchQuery?: string;
}) {
  try {
    await connectToDatabase();

    cloudinary.config({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    })

    let expression = 'folder=imaginify';              // Expresión de busqueda

    if (searchQuery) {                                // Si hay searchQuery se agrega "AND" y despues el searchQuery
      expression += ` AND ${searchQuery}`
    }

    const { resources } = await cloudinary.search     // Se ejecuta la busqueda en cloudinary con la expresión construida
      .expression(expression)
      .execute();

    const resourceIds = resources.map((resource: any) => resource.public_id); // Se obtienen los ids de las imagenes del resultado

    let query = {};           // Se construye una consulta query para buscar en MongoDB

    if (searchQuery) {        // Si hay una busqueda
      query = {               // la consulta incluirá
        publicId: {           // un filtro por publicId
          $in: resourceIds
        }
      }
    }

    const skipAmount = (Number(page) - 1) * limit;    // Se calcula el número de imagenes que se deben omitir para paginar correctamente

    const images = await populateUser(Image.find(query))  // Se realiza una consulta a bd
      .sort({ updatedAt: -1 })                            // En orden descendente según fecha
      .skip(skipAmount)                                   // Indicando cuántos documentos se deben omitir antes de comenzar a devolver rdos
      .limit(limit);                                      // Limita el número total de documentos que se devolverán en la consulta 

    const totalImages = await Image.find(query).countDocuments(); // Nº total de imagenes encontradas en la bd según restricciones
    const savedImages = await Image.find().countDocuments();      // El número total de imágenes guardadas en Cloudinary 

    return {
      data: JSON.parse(JSON.stringify(images)),   // Se devuelve un objeto de contiene un array de imagenes en json
      totalPage: Math.ceil(totalImages / limit),  // Total de imagenes en bd según restricciones
      savedImages,                                // Total de imagenes en cloudinary
    }
  } catch (error) {
    handleError(error)
  }
}

// GET IMAGES BY USER
export async function getUserImages({
  limit = 9,
  page = 1,
  userId,
}: {
  limit?: number;
  page: number;
  userId: string;
}) {
  try {
    await connectToDatabase();

    const skipAmount = (Number(page) - 1) * limit;

    const images = await populateUser(Image.find({ author: userId }))
      .sort({ updatedAt: -1 })
      .skip(skipAmount)
      .limit(limit);

    const totalImages = await Image.find({ author: userId }).countDocuments();

    return {
      data: JSON.parse(JSON.stringify(images)),
      totalPages: Math.ceil(totalImages / limit),
    };
  } catch (error) {
    handleError(error);
  }
}