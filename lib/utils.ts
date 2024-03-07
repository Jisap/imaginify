/* eslint-disable prefer-const */
/* eslint-disable no-prototype-builtins */
import { type ClassValue, clsx } from "clsx";
import qs from "qs";
import { twMerge } from "tailwind-merge";

import { aspectRatioOptions } from "@/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ERROR HANDLER
export const handleError = (error: unknown) => {
  if (error instanceof Error) {                     // This is a native JavaScript error (e.g., TypeError, RangeError)  
    console.error(error.message);
    throw new Error(`Error: ${error.message}`);
  } else if (typeof error === "string") {           // This is a string error message
    console.error(error);
    throw new Error(`Error: ${error}`);
  } else {                                          // This is an unknown type of error
    console.error(error);
    throw new Error(`Unknown error: ${JSON.stringify(error)}`);
  }
};

// PLACEHOLDER LOADER - while image is transforming
const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#7986AC" offset="20%" />
      <stop stop-color="#68769e" offset="50%" />
      <stop stop-color="#7986AC" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#7986AC" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
</svg>`;

const toBase64 = (str: string) =>
  typeof window === "undefined"
    ? Buffer.from(str).toString("base64")
    : window.btoa(str);

export const dataUrl = `data:image/svg+xml;base64,${toBase64(
  shimmer(1000, 1000)
)}`;
// ==== End

// FORM URL QUERY
export const formUrlQuery = ({
  searchParams,// string
  key,         // string   
  value,       // string|number|null 
}: FormUrlQueryParams) => {
  const params = { ...qs.parse(searchParams.toString()), [key]: value }; // Se construye un nuevo obj params con query:"busqueda"

  return `${window.location.pathname}?${qs.stringify(params, {  // Se devuelve una url con esos nuevos params (redirección a home con los newparams)
    skipNulls: true,
  })}`;
};

// REMOVE KEY FROM QUERY
export function removeKeysFromQuery({
  searchParams,
  keysToRemove,
}: RemoveUrlQueryParams) {
  const currentUrl = qs.parse(searchParams);

  keysToRemove.forEach((key) => {
    delete currentUrl[key];
  });

  // Remove null or undefined values
  Object.keys(currentUrl).forEach(
    (key) => currentUrl[key] == null && delete currentUrl[key]
  );

  return `${window.location.pathname}?${qs.stringify(currentUrl)}`;
}

// DEBOUNCE
export const debounce = (func: (...args: any[]) => void, delay: number) => {
  let timeoutId: NodeJS.Timeout | null;
  return (...args: any[]) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

// GET IMAGE SIZE
export type AspectRatioKey = keyof typeof aspectRatioOptions;
export const getImageSize = (
  type: string,
  image: any,
  dimension: "width" | "height"
): number => {
  if (type === "fill") {
    return (
      aspectRatioOptions[image.aspectRatio as AspectRatioKey]?.[dimension] ||
      1000
    );
  }
  return image?.[dimension] || 1000;
};

// DOWNLOAD IMAGE
export const download = (url: string, filename: string) => {
  if (!url) {
    throw new Error("Resource URL not provided! You need to provide one");
  }

  fetch(url)
    .then((response) => response.blob())
    .then((blob) => {
      const blobURL = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobURL;

      if (filename && filename.length)
        a.download = `${filename.replace(" ", "_")}.png`;
      document.body.appendChild(a);
      a.click();
    })
    .catch((error) => console.log({ error }));
};

// DEEP MERGE OBJECTS
export const deepMergeObjects = (obj1: any, obj2: any) => { // fusiona dos objetos combinado su propiedades y subpropiedades en uno solo

  if (obj2 === null || obj2 === undefined) {  // Comprobación de si obj2 es null oundefined
    return obj1;                              // Si lo es no se hace nada yse devuelve el obj1
  }

  let output = { ...obj2 };                   // Se inicializa un nuevo objeto llamado output que contendrá el resultado de la fusión.

  for (let key in obj1) {                     // Se itera sobre todas las claves de obj1 con un bucle for in

    if (obj1.hasOwnProperty(key)) {           // Se verifica si la clave actual pertenece a obj1  
      if (
        obj1[key] &&                          // Para cada clave en obj1, se comprueba si tanto obj1[key] como obj2[key] son objetos y no son nulos.
        typeof obj1[key] === "object" &&
        obj2[key] &&
        typeof obj2[key] === "object"
      ) {
        output[key] = deepMergeObjects(obj1[key], obj2[key]); // Si ambas son objetos, se llama recursivamente a deepMergeObjects con obj1[key] y obj2[key] para fusionar sus subpropiedades.
      } else {
        output[key] = obj1[key];              // Si alguna de las dos no es un objeto, se asigna el valor de obj1[key] a output[key]. Esto se hace para conservar las propiedades de obj1 que no están presentes en obj2.
      }
    }
  }

  return output; // Finalmente, se devuelve el objeto output, que contiene la fusión de obj1 y obj2
};
