/**
 * What the sign-up form is told after a failed attempt: a message, which boxes are wrong,
 * and everything the visitor had typed, so nothing has to be typed again.
 */
export type SignUpState = { message: string; wrong: string[]; values: Record<string, string> };

export const emptySignUp: SignUpState = { message: "", wrong: [], values: {} };

export const validEmail = (email: string) => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email.trim());
/** A UK phone number has 10 or 11 digits; allow a little more for a country code. */
export const validPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 && /^[\d\s()+\-.]+$/.test(phone.trim());
};
