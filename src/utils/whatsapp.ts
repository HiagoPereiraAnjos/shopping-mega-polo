/**
 * Generates a WhatsApp link with a pre-filled message.
 * @param phone The phone number (with or without formatting)
 * @param message The message to be sent
 * @returns A formatted WhatsApp URL
 */
export function createWhatsAppLink(phone: string, message: string): string {
  // Remove any non-numeric characters from the phone number
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Return the formatted WhatsApp URL
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
