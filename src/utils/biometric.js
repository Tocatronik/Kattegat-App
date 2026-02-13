// ─── BIOMETRIC AUTH (Face ID / Touch ID) ───
const BIOMETRIC_KEY = 'kattegat_biometric_cred';

export async function isBiometricAvailable() {
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch { return false; }
}

function arrayBufToBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function base64ToArrayBuf(b64) {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

export async function registerBiometric() {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "Kattegat Industries", id: window.location.hostname },
      user: { id: userId, name: "kattegat-admin", displayName: "Kattegat Admin" },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
      timeout: 60000,
    }
  });
  const credData = { id: credential.id, rawId: arrayBufToBase64(credential.rawId) };
  localStorage.setItem(BIOMETRIC_KEY, JSON.stringify(credData));
  return true;
}

export async function authenticateBiometric() {
  const stored = localStorage.getItem(BIOMETRIC_KEY);
  if (!stored) return false;
  const cred = JSON.parse(stored);
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ id: base64ToArrayBuf(cred.rawId), type: "public-key", transports: ["internal"] }],
      userVerification: "required",
      timeout: 60000,
    }
  });
  return true;
}

export function hasBiometricCredential() {
  return !!localStorage.getItem(BIOMETRIC_KEY);
}
