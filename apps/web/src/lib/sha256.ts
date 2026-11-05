/** SHA-256 (hex) do arquivo, enviado ao backend como `hash` e no header x-amz-meta-sha256 do PUT presignado. */
export async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
