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

import { formSchema } from "./TransformationForm";

type CustomFieldProps = {
  control: Control<z.infer<typeof formSchema>> | undefined;
  render: (props: { field: any }) => React.ReactNode;
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
      render={({ field }) => ( // FormField generará un campo que será lo que determine la prop como función
        <FormItem className={className}>
          {formLabel && <FormLabel>{formLabel}</FormLabel>}
          <FormControl>{render({ field })}</FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};