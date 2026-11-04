import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
  RadioGroup,
  RadioGroupItem,
} from '@pd2-trader/ui';

const MODES = [
  { value: 'sc', title: 'Softcore ladder', description: 'Most listings, fastest trades.' },
  { value: 'hc', title: 'Hardcore ladder', description: 'Fewer listings, higher prices.' },
];

export const meta = {
  title: 'Choice cards',
  description:
    'A `FieldLabel` wrapping a horizontal `Field` becomes a selectable card (the checked control gives it the glow border); `FieldTitle` is the label-styled title inside it.',
  order: 2,
};

export default function FieldChoiceCardsExample() {
  return (
    <div className="w-sidebar rounded-lg border bg-surface p-4">
      <FieldSet>
        <FieldLegend variant="label">Game mode</FieldLegend>
        <RadioGroup defaultValue="sc">
          {MODES.map((m) => (
            <FieldLabel key={m.value}
              htmlFor={`cc-${m.value}`}>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>{m.title}</FieldTitle>
                  <FieldDescription>{m.description}</FieldDescription>
                </FieldContent>
                <RadioGroupItem id={`cc-${m.value}`}
                  value={m.value} />
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>
      </FieldSet>
    </div>
  );
}
