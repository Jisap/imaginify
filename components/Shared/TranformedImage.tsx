"use client"

import { dataUrl, debounce, download, getImageSize } from '@/lib/utils'
import { CldImage, getCldImageUrl } from 'next-cloudinary'
import { PlaceholderValue } from 'next/dist/shared/lib/get-img-props'
import Image from 'next/image'
import React from 'react'

const TransformedImage = ({ 
  image, 
  type, 
  title, 
  transformationConfig, // Configuración o estado de la transformación
  isTransforming, 
  setIsTransforming, 
  hasDownload = false   // Booleano que indica si se debe mostrar un botón de descarga
}: TransformedImageProps) => {
  
  const downloadHandler = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();

    download(getCldImageUrl({
      width: image?.width,
      height: image?.height,
      src: image?.publicId,
      ...transformationConfig
    }), title)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex-between">
        <h3 className="h3-bold text-dark-600">
          Transformed
        </h3>

        {hasDownload && (
          <button
            className="download-btn"
            onClick={downloadHandler}
          >
            <Image
              src="/assets/icons/download.svg"
              alt="Download"
              width={24}
              height={24}
              className="pb-[6px]"
            />
          </button>
        )}
      </div>

      {image?.publicId && transformationConfig ? (              // Si tenemos la imagen a transformar y su confifuración
        <div className="relative">
          <CldImage                                             // Se renderiza la imagen transformada
            width={getImageSize(type, image, "width")}
            height={getImageSize(type, image, "height")}
            src={image?.publicId}
            alt={image.title}
            sizes={"(max-width: 767px) 100vw, 50vw"}
            placeholder={dataUrl as PlaceholderValue}
            className="transformed-image"
            onLoad={() => {
              setIsTransforming && setIsTransforming(false);    // onLoad se dispara cuando la imagen se carga exitosamente -> isTransforming = false
            }}
            onError={() => {
              debounce(() => {
                setIsTransforming && setIsTransforming(false);  // onError se dispara cuando hay un erro en la carga de la imagen -> isTransforming = false
              }, 8000)()
            }}
            {...transformationConfig}                           // Configuración de la transformación
          />

          {isTransforming && (                                  // Mientras se produce la transformación se muestra un spinner de carga                    
            <div className="transforming-loader">
              <Image
                src="/assets/icons/spinner.svg"
                width={50}
                height={50}
                alt="spinner"
              />
              <p className="text-white/80">Please wait...</p>
            </div>
          )}
        </div>
      ) : (                                                      // Cuando se termina la transformación mensaje de "Transformed Image"
        <div className="transformed-placeholder">                     
          Transformed Image
        </div>
      )}
    </div>
  )
}

export default TransformedImage