export const USERNAME_PATTERN = new RegExp("^[\\p{L}\\p{M}\\p{N}_]+$", "u");

export function isValidUsername(username: string): boolean {
  const length = Array.from(username).length;
  return length >= 3 && length <= 20 && USERNAME_PATTERN.test(username);
}
