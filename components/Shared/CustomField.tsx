import React from "react";
import { Control } from "react-hook-form";
import { z } from "zod";

import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
  FormLabel,
} from "../ui/form";

import { formSchema } from "./TransformationForm"; // Esquema para los formularios de transformación title, aspectRatio, color, prompt, publicId

type CustomFieldProps = {
  control: Control<z.infer<typeof formSchema>> | undefined; // Las props del CustomField se basan en las del formulario de transformación
  render: (props: { field: any }) => React.ReactNode; // render genera un nodo dentro de dom, y este nodo puede ser un input o un select o un component
  name: keyof z.infer<typeof formSchema>;
  formLabel?: string;
  className?: string;
};

export const CustomField = ({
  control,
  render, // Se recibe una función como una prop que renderiza un componente de shandcn
  name,
  formLabel,
  className,
}: CustomFieldProps) => {
  return (
    // Se pasa al componente FormField dicha función render como prop
    <FormField 
      control={control}
      name={name}              
      render={({ field }) => ( // FormField generará un nodo que será lo que determine la prop como función, un input, select o un componente de shadcn
        <FormItem className={className}>
          {formLabel && <FormLabel>{formLabel}</FormLabel>}
          <FormControl>{render({ field })}</FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};