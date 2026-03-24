// Firebase Auth hibakódok → magyar üzenet
const ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'Ez az email cím már foglalt.',
  'auth/invalid-email': 'Érvénytelen email cím.',
  'auth/weak-password': 'A jelszó legalább 6 karakter hosszú legyen.',
  'auth/user-not-found': 'Nem található ilyen felhasználó.',
  'auth/wrong-password': 'Helytelen jelszó.',
  'auth/invalid-credential': 'Helytelen email vagy jelszó.',
  'auth/too-many-requests': 'Túl sok sikertelen kísérlet. Próbáld újra később.',
  'auth/network-request-failed': 'Hálózati hiba. Ellenőrizd az internetkapcsolatot.',
  'auth/popup-closed-by-user': 'A bejelentkezési ablak bezárult.',
  'auth/cancelled-popup-request': 'A bejelentkezés megszakadt.',
  'auth/account-exists-with-different-credential':
    'Ez az email más bejelentkezési módszerrel van regisztrálva.',
}

export function getAuthErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code
    return ERROR_MESSAGES[code] ?? 'Ismeretlen hiba történt. Próbáld újra.'
  }
  return 'Ismeretlen hiba történt. Próbáld újra.'
}
