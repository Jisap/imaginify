"use client"

import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { aspectRatioOptions, creditFee, defaultValues, transformationTypes } from "@/constants"
import { CustomField } from "./CustomField"
import { useEffect, useState, useTransition } from "react"
import { AspectRatioKey, debounce, deepMergeObjects } from "@/lib/utils"
import { updateCredits } from "@/lib/actions/user.action"
import MediaUploader from "./MediaUploader"
import TransformedImage from "./TranformedImage"
import { getCldImageUrl } from "next-cloudinary"
import { addImage, updateImage } from "@/lib/actions/image.action"
import { useRouter } from "next/navigation"
import { InsufficientCreditsModal } from "./InsufficientCreditsModal"

export const formSchema = z.object({
  title: z.string(),
  aspectRatio: z.string().optional(),
  color: z.string().optional(),
  prompt: z.string().optional(),
  publicId: z.string(),
})


const TransformationForm = ({ action, data = null, userId, type, creditBalance, config = null }: TransformationFormProps) => {

  const transformationType = transformationTypes[type]; // remove, recolor, restore, removeBackground, fill (como un obj individual)(por defecto config=true)
  const [image, setImage] = useState(data)
  const [newTransformation, setNewTransformation] = useState<Transformations | null>(null); // Estado para Transformation (como un objeto de objetos)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformationConfig, setTransformationConfig] = useState(config)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const initialValues = data && action === 'Update' ? {
    title: data?.title,
    aspectRatio: data?.aspectRatio,
    color: data?.color,
    prompt: data?.prompt,
    publicId: data?.publicId,
  } : defaultValues

  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues
  })


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    if (data || image) {

      const transformationUrl = getCldImageUrl({ // Url de la imagen subida a cloudinary para su transformación
        width: image?.width,
        height: image?.height,
        src: image?.publicId,
        ...transformationConfig
      })

      const imageData = {          // Data de la imagen a partir de los values, la image, el type , la transformationUrl y la transformationConfig
        title: values.title,
        publicId: image?.publicId,
        transformationType: type,
        width: image?.width,
        height: image?.height,
        config: transformationConfig,
        secureURL: image?.secureURL,
        transformationURL: transformationUrl,
        aspectRatio: values.aspectRatio,
        prompt: values.prompt,
        color: values.color,
      }

      if (action === 'Add') {
        try {
          const newImage = await addImage({ // Añade a bd la info de la nueva imagen
            image: imageData,
            userId,
            path: '/'
          })

          if (newImage) {
            form.reset()
            setImage(data)
            router.push(`/transformations/${newImage._id}`)
          }
        } catch (error) {
          console.log(error);
        }
      }

      if (action === 'Update') {    // Actualiza en bd la info de la imagen
        try {
          const updatedImage = await updateImage({
            image: {
              ...imageData,
              _id: data._id
            },
            userId,
            path: `/transformations/${data._id}`
          })

          if (updatedImage) {
            router.push(`/transformations/${updatedImage._id}`)
          }
        } catch (error) {
          console.log(error);
        }
      }
    }

    setIsSubmitting(false)
  }



  const onSelectFieldHandler = (
    value: string,                                                // Valor del select obtenido por onValueChange de Shadcn
    onChangeField: (value: string) => void                        // Recoge una función de react-hook-form (onChange) que controla la validez y errores del value
  ) => {

    const imageSize = aspectRatioOptions[value as AspectRatioKey] // Tamaño de imagen seleccionada

    setImage((prevState: any) => ({                               // Estado para Image
      ...prevState,
      aspectRatio: imageSize.aspectRatio,
      width: imageSize.width,
      height: imageSize.height,
    }))

    setNewTransformation(transformationType.config);              // Estado para remove, recolor, fill, etc con la prop config=true

    return onChangeField(value)                                   // Devuelve el value al form y su validez.
  }

  const onInputChangeHandler = ( 
    fieldName: string,                                            // string con valor 'prompt' o 'color'
    value: string,                                                // e.target.value -> cadena del objeto a modificar 
    type: string,                                                 // tipo de transformación remove o recolor 
    onChangeField: (value: string) => void                        // Recoge una función de react-hook-form (onChange) que controla la validez y errores del value
  ) => {
    debounce(() => {
      setNewTransformation((prevState: any) => ({                 // Con 1 sec de retardamiento se establece el nuevo estado para la transformation
        ...prevState,                                             // spread del anterior estado, {restore, fillbackground, remove, recolor, removeBackground}
        [type]: {                                                 // actualización de la transformación remove{} o recolor{}
          ...prevState?.[type],                                   // en ella spread tambien de sus props anteriores
          [fieldName === 'prompt' ? 'prompt' : 'to']: value       // entonces modificación de la propiedad 'prompt' con el value del input 
        }                                                         // o modificación de la propiedad 'to' con el value del input
      }))
    }, 1000)();

    return onChangeField(value)                                   // Devuelve el value al form y su validez.
  }

  const onTransformHandler = async () => {                        // Función que 
    setIsTransforming(true)

    setTransformationConfig(
      deepMergeObjects(newTransformation, transformationConfig)   // Fusiona dos objetos combinado su propiedades y subpropiedades en uno solo -> <TransformedImg />
    )

    setNewTransformation(null)

    startTransition(async () => {
      await updateCredits(userId, creditFee)  // Action para buscar el usuario que hace la transformación y restarle un credito
    })
  }

  useEffect(() => {
    if (image && (type === 'restore' || type === 'removeBackground')) { // Si la transformación es 'restore' o 'removeBackground'
      setNewTransformation(transformationType.config)                   // estado de la transformación al que viene por defecto de constants  
    }
  }, [image, transformationType.config, type])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* Si no tenemos credito - modal */}
      {creditBalance < Math.abs(creditFee) && <InsufficientCreditsModal />} 
       <CustomField 
          control={form.control}  // Control de validación según zod basado en eschema
          name="title"
          formLabel="Image Title"
          className="w-full"
          render={({ field }) => <Input {...field} className="input-field" />} // Se renderiza un input con los valores de field que contiene value, onChange, onBlur etc.
       />

        {type === 'fill' && (
          <CustomField 
            control={form.control}
            name="aspectRatio"
            formLabel="Aspect Ratio"
            className="w-full"
            render={({ field }) => (
              <Select                                                                  // Establece el state de la image
                onValueChange={(value) => onSelectFieldHandler(value, field.onChange)} // onValueChange obtiene el value seleccionado del select y field.onChange lo valida
              >                                                                         
                <SelectTrigger className="select-field">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(aspectRatioOptions).map((key) => (
                    <SelectItem
                      key={key}
                      value={key}
                      className="select-item"
                    >
                      {aspectRatioOptions[key as AspectRatioKey].label}
                    </SelectItem>  
                  ))}
                </SelectContent>
              </Select>

            )}
          />
        )}

        {(type === 'remove' || type === 'recolor') && (
          <div className="prompt-field">
            <CustomField
              control={form.control}
              name="prompt" 
              formLabel={type === 'remove' ? 'Object to remove' : 'Object to recolor'}
              className="w-full"
              render={({ field }) => (
                <Input
                  value={field.value}
                  className="input-field" 
                  onChange={(e) => onInputChangeHandler( // Establece estado de la transformación remove
                    'prompt',
                    e.target.value,
                    type,
                    field.onChange
                  )}  
                />
              )}
            />

            {type === 'recolor' && (
              <CustomField
                control={form.control}
                name="color"
                formLabel="Replacement Color"
                className="w-full"
                render={({ field }) => (
                  <Input
                    value={field.value}
                    className="input-field"
                    onChange={(e) => onInputChangeHandler( // Establece estado de la transformación recolor
                      'color',
                      e.target.value,
                      'recolor',
                      field.onChange
                    )}
                  />
                )}
              />
            )}

          </div>  
        )}

        <div className="media-uploader-field">
          <CustomField
            control={form.control}
            name="publicId"
            className="flex size-full flex-col" 
            render={({ field }) => (
              <MediaUploader                   // Permite subir a cloudinary una imagen -> estado -> muestra la imagen -> mensaje de success
                onValueChange={field.onChange} // field.onChange es una función de reactHookForm que controla (validez, errors) el value del input de la imagen
                setImage={setImage}            // Función que establece el estado de la imagen
                publicId={field.value}         // identificador de la imagen 
                image={image}                  // Estado de la imagen
                type={type}                    // Tipo de transformación 
              />
            )}
          />
          <TransformedImage
            image={image}
            type={type}
            title={form.getValues().title}
            isTransforming={isTransforming}
            setIsTransforming={setIsTransforming}
            transformationConfig={transformationConfig} // Estado con la fusión de las props de los dos objetos, el inicial y en el que se transforma
          />
        </div>

        <div className="flex flex-col gap-4">
          {/* Boton para transformar la imagen*/}
          <Button 
            type="button"
            className="submit-button capitalize"
            disabled={isTransforming || newTransformation === null}
            onClick={onTransformHandler} // Inicia la transformación fusionando las props de los dos obj -> transformationConfig -> <TransformedImage />
          >
            {isTransforming ? 'Transforming...' : 'Apply Transformation'}
          </Button>
          {/* Boton para establecer los estados del formulario y enviar los valores a onSubmit */}
          <Button
            type="submit"
            className="submit-button capitalize"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Save Image'}
          </Button>
        </div>

      </form>
    </Form>
  )}

export default TransformationForm