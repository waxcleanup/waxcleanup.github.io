// src/utils/ipfs.js
const IPFS_GATEWAY = (process.env.REACT_APP_IPFS_GATEWAY || "https://ipfs.io/ipfs").replace(/\/$/, "");

export function toIpfsUrl(image) {
  if (!image) return null;
  const s = String(image).trim();

  if (/^https?:\/\//i.test(s)) return s;

  if (s.startsWith("ipfs://")) {
    const cid = s.replace("ipfs://", "").replace(/^ipfs\//, "");
    return `${IPFS_GATEWAY}/${cid}`;
  }

  if (s.includes("/ipfs/")) {
    return `${IPFS_GATEWAY}/${s.split("/ipfs/")[1]}`;
  }

  return `${IPFS_GATEWAY}/${s}`;
}
