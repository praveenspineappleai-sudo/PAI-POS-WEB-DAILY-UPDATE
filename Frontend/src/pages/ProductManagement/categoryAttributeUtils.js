// Attribute names and values may only contain letters, numbers and spaces.
export const SPECIAL_CHARS_MESSAGE = 'Special characters are not allowed. Use only letters, numbers and spaces.';

export const hasSpecialCharacters = (text = '') => /[^\p{L}\p{N} ]/u.test(text);

export const stripSpecialCharacters = (text = '') => text.replace(/[^\p{L}\p{N} ]/gu, '');

export const normalizeCategoryAttributeDefinitions = (attributes = []) => {
  if (!Array.isArray(attributes)) return [];

  return attributes
    .filter((attr) => attr && (attr.attribute_name || attr.labelName))
    .map((attr) => {
      const labelName = attr.labelName || attr.attribute_name || '';
      const fieldName = (labelName || '')
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');

      return {
        id: attr.id,
        labelName,
        fieldName,
        type: attr.type || attr.attribute_type || 'text',
        isCustom: true,
      };
    });
};
