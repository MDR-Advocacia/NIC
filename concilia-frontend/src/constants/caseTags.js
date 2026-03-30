export const DEFAULT_CASE_TAG_COLOR = '#EF4444';

export const normalizeCaseTag = (tag, fallbackColor = DEFAULT_CASE_TAG_COLOR) => {
  if (!tag) {
    return null;
  }

  const text = String(typeof tag === 'string' ? tag : tag.text ?? tag.name ?? '')
    .trim();

  if (!text) {
    return null;
  }

  const color = String(
    typeof tag === 'string' ? fallbackColor : tag.color ?? fallbackColor
  ).trim() || fallbackColor;

  return { text, color };
};

export const normalizeCaseTags = (tags, fallbackColor = DEFAULT_CASE_TAG_COLOR) => {
  const source = Array.isArray(tags) ? tags : [];
  const seenTexts = new Set();

  return source.reduce((accumulator, tag) => {
    const normalizedTag = normalizeCaseTag(tag, fallbackColor);

    if (!normalizedTag) {
      return accumulator;
    }

    const normalizedKey = normalizedTag.text.toLocaleLowerCase('pt-BR');
    if (seenTexts.has(normalizedKey)) {
      return accumulator;
    }

    seenTexts.add(normalizedKey);
    accumulator.push(normalizedTag);
    return accumulator;
  }, []);
};

export const appendCaseTag = (existingTags, nextTag, fallbackColor = DEFAULT_CASE_TAG_COLOR) => {
  const normalizedExistingTags = normalizeCaseTags(existingTags, fallbackColor);
  const normalizedNextTag = normalizeCaseTag(nextTag, fallbackColor);

  if (!normalizedNextTag) {
    return normalizedExistingTags;
  }

  const normalizedKey = normalizedNextTag.text.toLocaleLowerCase('pt-BR');
  if (
    normalizedExistingTags.some(
      (tag) => tag.text.toLocaleLowerCase('pt-BR') === normalizedKey
    )
  ) {
    return normalizedExistingTags;
  }

  return [...normalizedExistingTags, normalizedNextTag];
};
