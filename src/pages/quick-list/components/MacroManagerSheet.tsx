import React, { useState } from 'react';
import { useOptions } from '@/hooks/useOptions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X, ChevronUp, ChevronDown, Pencil, Check } from 'lucide-react';

export interface NoteMacro {
  label: string;
  text: string;
}

export function isValidMacro(m: unknown): m is NoteMacro {
  return typeof m === 'object' && m !== null && 'label' in m && 'text' in m;
}

const RESERVED_VARS = new Set(['itemName']);

/** Extract named placeholders from macro text, e.g. {sockets}, {res}, {1} — excludes {itemName} */
export function getPlaceholders(text: string): string[] {
  const matches = text.match(/\{([^}]+)}/g);
  if (!matches) return [];
  const names = [...new Set(matches.map((m) => m.slice(1, -1)))].filter((n) => !RESERVED_VARS.has(n));
  return names;
}

export function applyMacroTemplate(
  text: string,
  itemName?: string,
  placeholderValues?: Record<string, string>,
): string {
  let result = text;
  if (itemName) result = result.replace(/\{itemName}/g, itemName);
  if (placeholderValues) {
    for (const [name, value] of Object.entries(placeholderValues)) {
      result = result.replace(new RegExp(`\\{${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}}`, 'g'), value);
    }
  }
  return result;
}

interface MacroManagerSheetProps {
  onApply?: (macro: NoteMacro) => void;
}

const MacroManagerSheet: React.FC<MacroManagerSheetProps> = ({ onApply }) => {
  const { settings, updateSettings } = useOptions();
  const macros = (settings?.listingNoteMacros ?? []).filter(isValidMacro);
  const [newLabel, setNewLabel] = useState('');
  const [newText, setNewText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editText, setEditText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const saveMacros = async (updated: NoteMacro[]) => {
    await updateSettings({ listingNoteMacros: updated });
  };

  const addMacro = async () => {
    const label = newLabel.trim();
    const text = newText.trim();
    if (!label || !text) return;
    if (macros.some((m) => m.label === label)) {
      setError(`A macro named "${label}" already exists.`);
      return;
    }
    setError(null);
    await saveMacros([...macros, { label, text }]);
    setNewLabel('');
    setNewText('');
  };

  const removeMacro = async (index: number) => {
    await saveMacros(macros.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    const updated = [...macros];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    await saveMacros(updated);
    if (editingIndex === index) setEditingIndex(index - 1);
  };

  const moveDown = async (index: number) => {
    if (index === macros.length - 1) return;
    const updated = [...macros];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    await saveMacros(updated);
    if (editingIndex === index) setEditingIndex(index + 1);
  };

  const startEdit = (index: number) => {
    const macro = macros[index];
    setEditingIndex(index);
    setEditLabel(macro.label);
    setEditText(macro.text);
  };

  const saveEdit = async () => {
    if (editingIndex === null) return;
    const label = editLabel.trim();
    const text = editText.trim();
    if (!label || !text) return;
    const updated = [...macros];
    updated[editingIndex] = { label, text };
    await saveMacros(updated);
    setEditingIndex(null);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {macros.length > 0 ? (
        <div className="space-y-2">
          {macros.map((macro, index) => (
            <div
              key={index}
              className="flex items-center gap-1 bg-secondary text-secondary-foreground rounded-md px-3 py-2 text-sm"
            >
              {editingIndex === index ? (
                <div className="flex-1 flex flex-col gap-1 min-w-0">
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="h-7 text-xs"
                    placeholder="Short name"
                  />
                  <Input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="h-7 text-xs"
                    placeholder="e.g. WTS {itemName} - {sockets} sockets"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        saveEdit();
                      }
                    }}
                  />
                  <Button type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 self-start"
                    onClick={saveEdit}>
                    <Check className="h-3 w-3 mr-1" /> Save
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="flex-1 min-w-0 text-left hover:opacity-80 cursor-pointer"
                  onClick={() => onApply?.(macro)}
                >
                  <span className="font-medium">{macro.label}</span>
                  <span className="text-muted-foreground mx-1">&rarr;</span>
                  <span className="text-muted-foreground text-xs">{macro.text}</span>
                </button>
              )}
              {editingIndex !== index && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveUp(index)}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(index)}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={index === macros.length - 1}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(index)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMacro(index)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No macros yet. Add one below.</p>
      )}

      <div className="flex flex-col gap-2 pt-2 border-t">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Input
          placeholder="Short name"
          value={newLabel}
          onChange={(e) => {
            setNewLabel(e.target.value);
            setError(null);
          }}
        />
        <Input
          placeholder="e.g. WTS {itemName} - {sockets} sockets"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addMacro();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addMacro}
          disabled={!newLabel.trim() || !newText.trim()}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Macro
        </Button>
      </div>
    </div>
  );
};

export default MacroManagerSheet;
