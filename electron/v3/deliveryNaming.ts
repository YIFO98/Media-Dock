const PROHIBITED_CHARACTERS = new Set(['/', ':'])

export function sanitizeDeliveryFileName(fileName: string): string {
  const normalized = fileName.normalize('NFC')
  const withoutProhibitedCharacters = [...normalized]
    .map((character) => {
      const codePoint = character.codePointAt(0) ?? 0
      return codePoint <= 31 || PROHIBITED_CHARACTERS.has(character) ? '_' : character
    })
    .join('')
  const sanitized = withoutProhibitedCharacters.trim()
  return sanitized && sanitized !== '.' && sanitized !== '..' ? sanitized : 'Media Dock Deliverable'
}
