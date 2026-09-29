import assert from "node:assert/strict";
import test from "node:test";
import {
  assertSafeWalletPermission,
  autoSignAllowedForPermission,
  isOwnerWalletPermission,
  burnPolicyEligible,
  gameplayPolicyEligible,
  tokenPaymentPolicyEligible,
} from "../src/wallet/maestro/maestroPolicy.js";

const authority = "tester111111@active";
const walletAccount = "tester111111";
test('token approval limit applies to the whole transaction with exact decimal arithmetic', () => {
 const action = { account: 'eosio.token', name: 'transfer', authorization: [authority], data: { from: walletAccount, to: 'rhythmfarmer', memo: 'energy', quantity: '3.00000000 WAX' } };
 const input = { scopes: ['token|eosio.token|rhythmfarmer|energy|WAX|5'], actions: [action, action], expectedAuthority: authority, walletAccount };
 assert.equal(tokenPaymentPolicyEligible(input), false);
 assert.equal(tokenPaymentPolicyEligible({ ...input, actions: [{ ...action, data: { ...action.data, quantity: '5.00000001 WAX' } }] }), false);
 assert.equal(tokenPaymentPolicyEligible({ ...input, actions: [{ ...action, data: { ...action.data, quantity: '5.00000000 WAX' } }] }), true);
});
const baseTransfer = {
  account: "atomicassets",
  name: "transfer",
  authorization: [authority],
  data: {
    from: walletAccount,
    to: "atomicassets",
    asset_ids: ["123"],
    memo: "burn:test",
  },
};

test("owner permission is recognized without weakening permission validation", () => {
  assert.equal(assertSafeWalletPermission("owner"), "owner");
  assert.equal(isOwnerWalletPermission("owner"), true);
  assert.equal(isOwnerWalletPermission("active"), false);
  assert.equal(autoSignAllowedForPermission("owner"), false);
  assert.equal(autoSignAllowedForPermission("active"), true);
  assert.equal(assertSafeWalletPermission("active"), "active");
  assert.throws(() => assertSafeWalletPermission("OWNER"), /Invalid/);
});

test("burn auto-sign requires the AtomicAssets destination and wallet sender", () => {
  const input = {
    scopes: ["atomicassets.burn"],
    actions: [baseTransfer],
    expectedAuthority: authority,
    walletAccount,
  };
  assert.equal(burnPolicyEligible(input), true);
  assert.equal(
    burnPolicyEligible({
      ...input,
      actions: [
        { ...baseTransfer, data: { ...baseTransfer.data, to: "attacker1111" } },
      ],
    }),
    false,
  );
  assert.equal(
    burnPolicyEligible({
      ...input,
      actions: [
        {
          ...baseTransfer,
          data: { ...baseTransfer.data, from: "victim111111" },
        },
      ],
    }),
    false,
  );
});

test("token auto-sign requires a positive bounded payment from the wallet", () => {
  const action = {
    account: "eosio.token",
    name: "transfer",
    authorization: [authority],
    data: {
      from: walletAccount,
      to: "rhythmfarmer",
      quantity: "1.00000000 WAX",
      memo: "energy:load",
    },
  };
  const input = {
    scopes: ["token|eosio.token|rhythmfarmer|energy|WAX|5"],
    actions: [action],
    expectedAuthority: authority,
    walletAccount,
  };
  assert.equal(tokenPaymentPolicyEligible(input), true);
  assert.equal(
    tokenPaymentPolicyEligible({
      ...input,
      actions: [
        { ...action, data: { ...action.data, quantity: "0.00000000 WAX" } },
      ],
    }),
    false,
  );
  assert.equal(
    tokenPaymentPolicyEligible({
      ...input,
      actions: [
        { ...action, data: { ...action.data, quantity: "6.00000000 WAX" } },
      ],
    }),
    false,
  );
  assert.equal(
    tokenPaymentPolicyEligible({
      ...input,
      actions: [{ ...action, data: { ...action.data, from: "victim111111" } }],
    }),
    false,
  );
});

test("gameplay auto-sign rejects mismatched actors and extra authorities", () => {
  const action = {
    account: "rhythmfarmer",
    name: "movechar",
    authorization: [authority],
    data: { owner: walletAccount, asset_id: "123", destination: 2 },
  };
  const input = {
    scopes: ["rhythmfarmer.gameplay"],
    actions: [action],
    expectedAuthority: authority,
    walletAccount,
    gameplayActions: new Set(["movechar"]),
    companionActions: new Set(),
  };
  assert.equal(gameplayPolicyEligible(input), true);
  assert.equal(
    gameplayPolicyEligible({
      ...input,
      actions: [{ ...action, data: { ...action.data, owner: "victim111111" } }],
    }),
    false,
  );
  assert.equal(
    gameplayPolicyEligible({
      ...input,
      actions: [
        { ...action, authorization: [authority, "attacker1111@active"] },
      ],
    }),
    false,
  );
});

test("attribute allocation and consolidated NFT sync share one safe approval", () => {
  const actions = [
    {
      account: "rhythmfarmer", name: "allocattrs", authorization: [authority],
      data: { owner: walletAccount, asset_id: "123", strength: 0, endurance: 1,
        agility: 0, intellect: 0, perception: 0, willpower: 0 },
    },
    {
      account: "rhythmfarmer", name: "syncall", authorization: [authority],
      data: { asset_id: "123" },
    },
  ];
  const input = {
    scopes: ["rhythmfarmer.gameplay"], actions, expectedAuthority: authority,
    walletAccount, gameplayActions: new Set(["allocattrs", "syncall"]),
    companionActions: new Set(),
  };
  assert.equal(gameplayPolicyEligible(input), true);
  actions[0].data.owner = "victim111111";
  assert.equal(gameplayPolicyEligible(input), false);
});

test("paired travel tracking only auto-signs for the wallet owner", () => {
  const actions = [
    {
      account: "rhythmfarmer",
      name: "starttravel",
      authorization: [authority],
      data: { owner: walletAccount, asset_id: "123", route: [2, 3] },
    },
    {
      account: "cleanupworld",
      name: "tracktravel",
      authorization: [authority],
      data: { owner: walletAccount, character_asset_id: "123" },
    },
  ];
  const input = {
    scopes: ["rhythmfarmer.gameplay"],
    actions,
    expectedAuthority: authority,
    walletAccount,
    gameplayActions: new Set(["starttravel"]),
    companionActions: new Set(["tracktravel"]),
  };
  assert.equal(gameplayPolicyEligible(input), true);
  assert.equal(
    gameplayPolicyEligible({
      ...input,
      actions: [
        actions[0],
        {
          ...actions[1],
          data: { ...actions[1].data, owner: "victim111111" },
        },
      ],
    }),
    false,
  );
});

test("group travel pairs remain eligible for one gameplay approval", () => {
  const actions = ["123", "456", "789"].flatMap((id) => [{
    account: "rhythmfarmer", name: "starttravel", authorization: [authority],
    data: { owner: walletAccount, asset_id: id, route: [2, 3] },
  }, {
    account: "cleanupworld", name: "tracktravel", authorization: [authority],
    data: { owner: walletAccount, character_asset_id: id },
  }]);
  assert.equal(gameplayPolicyEligible({
    scopes: ["rhythmfarmer.gameplay"], actions, expectedAuthority: authority, walletAccount,
    gameplayActions: new Set(["starttravel"]), companionActions: new Set(["tracktravel"]),
  }), true);
  actions[3].data.owner = "victim111111";
  assert.equal(gameplayPolicyEligible({
    scopes: ["rhythmfarmer.gameplay"], actions, expectedAuthority: authority, walletAccount,
    gameplayActions: new Set(["starttravel"]), companionActions: new Set(["tracktravel"]),
  }), false);
});

test("paired discovery finalization only auto-signs the owner's frontier roll", () => {
  const actions = [
    {
      account: "rhythmfarmer",
      name: "finaldisc",
      authorization: [authority],
      data: { caller: walletAccount, frontier_id: "17" },
    },
    {
      account: "cleanupworld",
      name: "rollfrontier",
      authorization: [authority],
      data: { owner: walletAccount, frontier_id: "17" },
    },
  ];
  const input = {
    scopes: ["rhythmfarmer.gameplay"],
    actions,
    expectedAuthority: authority,
    walletAccount,
    gameplayActions: new Set(["finaldisc"]),
    companionActions: new Set(["rollfrontier"]),
  };
  assert.equal(gameplayPolicyEligible(input), true);
  assert.equal(
    gameplayPolicyEligible({
      ...input,
      actions: [
        actions[0],
        {
          ...actions[1],
          data: { ...actions[1].data, owner: "victim111111" },
        },
      ],
    }),
    false,
  );
});
