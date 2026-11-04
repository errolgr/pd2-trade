import * as React from 'react';
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
import { Field, FieldDescription, FieldError, FieldLabel } from './field';

/**
 * react-hook-form bindings. The parts render the `Field` parts (`FormItem` = `Field`, `FormLabel` = `FieldLabel`,
 * `FormDescription` = `FieldDescription`, `FormMessage` = `FieldError`), so a form and a hand-wired Field look the
 * same; `FormControl` wires the control's id and aria attributes from the field state.
 */
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

const FormItem = React.forwardRef<React.ElementRef<typeof Field>, React.ComponentPropsWithoutRef<typeof Field>>(
  function FormItem({ className, ...props }, ref) {
    const id = React.useId();

    return (
      <FormItemContext.Provider value={{ id }}>
        <Field data-slot="form-item"
          className={className}
          ref={ref}
          {...props} />
      </FormItemContext.Provider>
    );
  },
);

const FormLabel = React.forwardRef<
  React.ElementRef<typeof FieldLabel>,
  React.ComponentPropsWithoutRef<typeof FieldLabel>
>(function FormLabel({ className, ...props }, ref) {
  const { error, formItemId } = useFormField();

  return (
    <FieldLabel
      data-slot="form-label"
      data-error={!!error}
      className={cn('data-[error=true]:text-destructive', className)}
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

const FormDescription = React.forwardRef<
  React.ElementRef<typeof FieldDescription>,
  React.ComponentPropsWithoutRef<typeof FieldDescription>
>(function FormDescription(props, ref) {
  const { formDescriptionId } = useFormField();

  return <FieldDescription data-slot="form-description"
    id={formDescriptionId}
    ref={ref}
    {...props} />;
});

const FormMessage = React.forwardRef<
  React.ElementRef<typeof FieldError>,
  React.ComponentPropsWithoutRef<typeof FieldError>
>(function FormMessage({ children, ...props }, ref) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message ?? '') : children;

  return (
    <FieldError data-slot="form-message"
      id={formMessageId}
      ref={ref}
      {...props}>
      {body}
    </FieldError>
  );
});

export { useFormField, Form, FormItem, FormLabel, FormControl, FormDescription, FormMessage, FormField };
