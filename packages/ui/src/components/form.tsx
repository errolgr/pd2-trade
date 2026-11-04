import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { Slot } from '@radix-ui/react-slot';
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext,
  useFormState,
} from 'react-hook-form';

import { cn } from '../lib/utils';
import { Label } from './label';

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: fieldContext.name });
  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) {
    throw new Error('useFormField should be used within <FormField>');
  }

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue);

const FormItem = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(function FormItem(
  { className, ...props },
  ref,
) {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div data-slot="form-item"
        className={cn('grid gap-2', className)}
        ref={ref}
        {...props} />
    </FormItemContext.Provider>
  );
});

const FormLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(function FormLabel({ className, ...props }, ref) {
  const { error, formItemId } = useFormField();

  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={cn('data-[error=true]:text-destructive-foreground', className)}
      htmlFor={formItemId}
      ref={ref}
      {...props}
    />
  );
});

const FormControl = React.forwardRef<React.ElementRef<typeof Slot>, React.ComponentPropsWithoutRef<typeof Slot>>(
  function FormControl({ ...props }, ref) {
    const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

    return (
      <Slot
        data-slot="form-control"
        id={formItemId}
        aria-describedby={!error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`}
        aria-invalid={!!error}
        ref={ref}
        {...props}
      />
    );
  },
);

const FormDescription = React.forwardRef<React.ElementRef<'p'>, React.ComponentPropsWithoutRef<'p'>>(
  function FormDescription({ className, ...props }, ref) {
    const { formDescriptionId } = useFormField();

    return (
      <p
        data-slot="form-description"
        id={formDescriptionId}
        className={cn('text-muted-foreground text-sm', className)}
        ref={ref}
        {...props}
      />
    );
  },
);

const FormMessage = React.forwardRef<React.ElementRef<'p'>, React.ComponentPropsWithoutRef<'p'>>(function FormMessage(
  { className, ...props },
  ref,
) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message ?? '') : props.children;

  if (!body) {
    return null;
  }

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      className={cn('text-destructive-foreground text-sm', className)}
      ref={ref}
      {...props}
    >
      {body}
    </p>
  );
});

export { useFormField, Form, FormItem, FormLabel, FormControl, FormDescription, FormMessage, FormField };
