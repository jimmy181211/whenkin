export type EditableOption = {
  value: string;
  label: string;
  keywords?: string[];
};

const normalize = (text: string) =>
  text
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const terms = (option: EditableOption) =>
  [
    option.label,
    option.value,
    ...(option.keywords ?? []),
  ].map(normalize);

export function matchingOptions(options: EditableOption[], query: string) {
  const input = normalize(query);
  return options
    .filter((option) => terms(option).some((term) => term.startsWith(input)))
    .sort(
      (a, b) =>
        Number(normalize(b.label).startsWith(input)) -
        Number(normalize(a.label).startsWith(input)),
    );
}

export function exactOption(options: EditableOption[], query: string) {
  const input = normalize(query);
  return options.find((option) => terms(option).includes(input));
}
