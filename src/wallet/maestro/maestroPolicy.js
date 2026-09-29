/* global BigInt */
const ACCOUNT_NAME_PATTERN = /^[a-z1-5.]{1,12}$/;
const ASSET_ID_PATTERN = /^[0-9]+$/;
const IDENTITY_FIELDS = ["actor", "owner", "user", "player", "farmer", "from", "caller"];

function scaledAmount(value) {
  const match = String(value).match(/^(\d+)(?:\.(\d{1,18}))?$/);
  if (!match) return null;
  return BigInt(match[1]) * (10n ** 18n) + BigInt((match[2] || '').padEnd(18, '0'));
}

function hasExactAuthority(action, expectedAuthority) {
  return (
    Array.isArray(action.authorization) &&
    action.authorization.length === 1 &&
    action.authorization[0] === expectedAuthority
  );
}

function actsForWallet(action, walletAccount) {
  const data = action.data || {};
  return IDENTITY_FIELDS.every(
    (field) => data[field] == null || String(data[field]) === walletAccount,
  );
}

export function assertSafeWalletPermission(permission) {
  const value = String(permission || "");
  if (!ACCOUNT_NAME_PATTERN.test(value))
    throw new Error("Invalid wallet permission.");
  return value;
}

export function isOwnerWalletPermission(permission) {
  return String(permission || "") === "owner";
}

export function autoSignAllowedForPermission(permission) {
  return !isOwnerWalletPermission(permission);
}

export function gameplayPolicyEligible({
  scopes,
  actions,
  expectedAuthority,
  walletAccount,
  gameplayActions,
  companionActions,
}) {
  return (
    scopes.includes("rhythmfarmer.gameplay") &&
    actions.length > 0 &&
    actions.every(
      (action) =>
        ((action.account === "rhythmfarmer" &&
          gameplayActions.has(action.name)) ||
          (action.account === "cleanupworld" &&
            companionActions.has(action.name))) &&
        hasExactAuthority(action, expectedAuthority) &&
        actsForWallet(action, walletAccount),
    )
  );
}

export function burnPolicyEligible({
  scopes,
  actions,
  expectedAuthority,
  walletAccount,
}) {
  return (
    scopes.includes("atomicassets.burn") &&
    actions.length > 0 &&
    actions.every((action) => {
      const assetIds = action.data?.asset_ids;
      return (
        action.account === "atomicassets" &&
        action.name === "transfer" &&
        String(action.data?.from || "") === walletAccount &&
        String(action.data?.to || "") === "atomicassets" &&
        Array.isArray(assetIds) &&
        assetIds.length > 0 &&
        assetIds.length <= 100 &&
        assetIds.every((assetId) => ASSET_ID_PATTERN.test(String(assetId))) &&
        String(action.data?.memo || "").startsWith("burn:") &&
        hasExactAuthority(action, expectedAuthority)
      );
    })
  );
}

export function tokenPaymentPolicyEligible({
  scopes,
  actions,
  expectedAuthority,
  walletAccount,
}) {
  return scopes.some((scope) => {
    if (!scope.startsWith("token|")) return false;
    const [, contract, destination, memoPrefix, symbol, maxAmountText] =
      scope.split("|");
    const maxAmount = scaledAmount(maxAmountText);
    if (
      !ACCOUNT_NAME_PATTERN.test(contract) ||
      !ACCOUNT_NAME_PATTERN.test(destination)
    )
      return false;
    if (!memoPrefix || !symbol || maxAmount === null || maxAmount <= 0n)
      return false;
    let total = 0n;
    return (
      actions.length > 0 &&
      actions.every((action) => {
        const quantity = String(action.data?.quantity || "").trim();
        const match = quantity.match(/^(\d+(?:\.\d+)?) ([A-Z]{1,7})$/);
        if (!match) return false;
        const amount = scaledAmount(match[1]);
        if (amount === null) return false;
        total += amount;
        const memo = String(action.data?.memo || "");
        return (
          action.account === contract &&
          action.name === "transfer" &&
          String(action.data?.from || "") === walletAccount &&
          String(action.data?.to || "") === destination &&
          (memo === memoPrefix || memo.startsWith(`${memoPrefix}:`)) &&
          match[2] === symbol &&
          amount > 0n &&
          total <= maxAmount &&
          hasExactAuthority(action, expectedAuthority)
        );
      })
    );
  });
}
