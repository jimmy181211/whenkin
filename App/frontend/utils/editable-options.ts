/** Saved dropdown value with a display label and optional search aliases. */
export type EditableOption = {
  value: string;
  label: string;
  keywords?: string[];
};

/**
 * Ignore surrounding spaces, case, and accents when matching typed choices.
 * @returns Normalized search text; display labels are left unchanged.
 */
const normalize = (text: string) =>
  text
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/**
 * Collect normalized labels, values, and aliases used to match typed
 * choices.
 * @returns Search terms for this option, preserving the label/value/alias order.
 */
const terms = (option: EditableOption) =>
  [
    option.label,
    option.value,
    ...(option.keywords ?? []),
  ].map(normalize);

/**
 * Search allowed choices by normalized label, value, or alias prefix.
 * @returns Matching options with label matches first, or an empty list for no matches.
 */
export function matchingOptions(options: EditableOption[], query: string) {
  const input = normalize(query);
  return options
    .filter(
      /* Keep options with at least one prefix matching the user's input. */
      (option) =>
        terms(option).some(
          /* Check one normalized search term against the typed prefix. */
          (term) => term.startsWith(input),
        ),
    )
    .sort(
      /** Place label-prefix matches ahead of value or alias matches. */
      (a, b) =>
        Number(normalize(b.label).startsWith(input)) -
        Number(normalize(a.label).startsWith(input)),
    );
}

/**
 * Find a full normalized label, value, or alias match for typed text.
 * @returns The matching allowed option, or undefined when the text is not valid.
 */
export function exactOption(options: EditableOption[], query: string) {
  const input = normalize(query);
  return options.find(
    /* Find an option whose normalized label, value, or alias matches completely. */
    (option) => terms(option).includes(input),
  );
}
