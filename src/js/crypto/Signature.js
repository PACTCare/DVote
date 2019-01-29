import SigCompression from './SigCompression';

/**
 * Curves and their primes
 * NIST P-256 (secp256r1) 2^256 - 2^224 + 2^192 + 2^96 - 1
 */
export default class Signature {
  constructor() {
    this.signatureName = 'ECDSA';
    this.nameCurve = 'P-256'; // secp256r1
    this.nameHash = 'SHA-256';
    this.keyFormat = 'jwk';
    this.extractable = false;
  }

  /**
   * Loads public & private key from database or generates new key
   */
  async getKeys() {
    return window.crypto.subtle.generateKey(
      {
        name: this.signatureName,
        namedCurve: this.nameCurve,
      },
      this.extractable,
      ['sign', 'verify'],
    );
  }

  /**
   * Export public as hex string
   * @param {Object} publicKey
   * @returns {String} publickey as hex string
   */
  async exportPublicKey(publicKey) {
    const keydata = await window.crypto.subtle.exportKey(
      this.keyFormat,
      publicKey,
    );
    return SigCompression.ECPointCompress(keydata.x, keydata.y);
  }

  /**
   * Import public compressed key
   * @param {String} key as hex string
   * @returns {Object} public key
   */
  async importPublicKey(key) {
    let keydata;
    try {
      keydata = SigCompression.ECPointDecompress(key);
    } catch (error) {
      console.log('Wrong key');
      return undefined;
    }
    return window.crypto.subtle.importKey(
      this.keyFormat,
      {
        kty: 'EC',
        crv: this.nameCurve,
        x: keydata.x,
        y: keydata.y,
        ext: true,
      },
      {
        name: this.signatureName,
        namedCurve: this.nameCurve,
      },
      this.extractable, // extractable
      ['verify'],
    );
  }

  /**
   * Signs text and returns signature
   * @param {Object} privateKey
   * @param {String} Text
   * @returns {String} Promise of signature
   */
  sign(privateKey, text) {
    const enc = new TextEncoder();
    return window.crypto.subtle.sign(
      {
        name: this.signatureName,
        hash: { name: this.nameHash },
      },
      privateKey,
      enc.encode(text), // ArrayBuffer of data you want to sign
    );
  }

  /**
   * Verifies the text
   * @param {String} publicKey
   * @param {String} signatureBase64
   * @param {String} text
   * @returns {Boolean} Correctly signed
   */
  verify(publicKey, signatureBase64, text) {
    const enc = new TextEncoder();
    const sigArray = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0));
    return window.crypto.subtle.verify(
      {
        name: this.signatureName,
        hash: { name: this.nameHash },
      },
      publicKey,
      sigArray,
      enc.encode(text),
    );
  }
}
