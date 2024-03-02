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
import { useState, useTransition } from "react"
import { AspectRatioKey, debounce, deepMergeObjects } from "@/lib/utils"
import { updateCredits } from "@/lib/actions/user.action"
import MediaUploader from "./MediaUploader"
import TransformedImage from "./TRanformedImage"

export const formSchema = z.object({
  title: z.string(),
  aspectRatio: z.string().optional(),
  color: z.string().optional(),
  prompt: z.string().optional(),
  publicId: z.string(),
})


const TransformationForm = ({ action, data = null, userId, type, creditBalance, config = null }: TransformationFormProps) => {

  const transformationType = transformationTypes[type]; // remove, recolor, restore, removeBackground, fill
  const [image, setImage] = useState(data)
  const [newTransformation, setNewTransformation] = useState<Transformations | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformationConfig, setTransformationConfig] = useState(config)
  const [isPending, startTransition] = useTransition()

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


  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);


  }

  const onSelectFieldHandler = (value: string, onChangeField: (value: string) => void) => {
    const imageSize = aspectRatioOptions[value as AspectRatioKey]

    setImage((prevState: any) => ({   // Estado para Image
      ...prevState,
      aspectRatio: imageSize.aspectRatio,
      width: imageSize.width,
      height: imageSize.height,
    }))

    setNewTransformation(transformationType.config); // Estado para remove, recolor, fill, etc con la prop config=true

    return onChangeField(value)
  }

  const onInputChangeHandler = ( 
    fieldName: string,                      // string con valor 'prompt' o 'color'
    value: string,                          // e.target.value -> cadena del objeto a modificar 
    type: string,                           // tipo de transformación remove o recolor 
    onChangeField: (value: string) => void  // función proporcionada por react-hook-form para manejar cambios en el valor del campo, (validaciones y errores)
  ) => {
    debounce(() => {
      setNewTransformation((prevState: any) => ({             // Con 1 sec de retardamiento se establece el nuevo estado para la transformation
        ...prevState,                                         // spread del anterior estado, {restore, fillbackground, remove, recolor, removeBackground}
        [type]: {                                             // actualización de la transformación remove{} o recolor{}
          ...prevState?.[type],                               // en ella spread tambien de sus props anteriores
          [fieldName === 'prompt' ? 'prompt' : 'to']: value   // entonces modificación de la propiedad 'prompt' con el value del input 
        }                                                     // o modificación de la propiedad 'to' con el value del input
      }))
    }, 1000)();

    return onChangeField(value)
  }

  const onTransformHandler = async () => {
    setIsTransforming(true)

    setTransformationConfig(
      deepMergeObjects(newTransformation, transformationConfig)
    )

    setNewTransformation(null)

    startTransition(async () => {
      await updateCredits(userId, creditFee)
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
              <Select
                onValueChange={(value) => onSelectFieldHandler(value, field.onChange)}
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
              <MediaUploader
                onValueChange={field.onChange} // función de reactHookForm que controla (validez, errors) el value del input de la imagen
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
            transformationConfig={transformationConfig}
          />
        </div>

        <div className="flex flex-col gap-4">
          {/* Boton para transformar la imagen*/}
          <Button 
            type="button"
            className="submit-button capitalize"
            disabled={isTransforming || newTransformation === null}
            onClick={onTransformHandler} // Inicia la transformación
          >
            {isTransforming ? 'Transforming...' : 'Apply Transformation'}
          </Button>
          {/* Boton para establecer los estados del formulario */}
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