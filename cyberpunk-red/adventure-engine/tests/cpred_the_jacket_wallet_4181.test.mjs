import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTheJacketWalletRulesAdapter,
  THE_JACKET_WALLET_PORT_VERSION
} from '../runtime/cemk_the_jacket_wallet_port.js';

test('The Jacket Wallet: Durable idempotent credit and receipt verification', async () => {
  assert.equal(THE_JACKET_WALLET_PORT_VERSION, 1);

  const transactions = new Map();

  const mockWallet = {
    supportsIdempotentCredits: true,
    supportsDurableTransactionLookup: true,
    getTransaction: async (key) => {
      const tx = transactions.get(key.transactionId);
      return tx ? JSON.parse(JSON.stringify(tx)) : null;
    },
    creditMissionReward: async (payload) => {
      const txId = payload.transactionId;
      const receipt = {
        ok: true,
        durable: true,
        status: 'committed',
        campaignId: payload.campaignId,
        accountId: payload.accountId,
        transactionId: txId,
        rewardSource: payload.rewardSource,
        crewSize: payload.crewSize,
        itemIds: payload.itemIds || [],
        amount: payload.amount,
        currency: payload.currency,
        adventure: 'CEMK_THE_JACKET'
      };
      transactions.set(txId, receipt);
      return receipt;
    }
  };

  const adapter = createTheJacketWalletRulesAdapter({ wallet: mockWallet });

  // Valid reward payout action: FALCO_ADVANCE for crewSize 1 = 500 EUR
  const action = {
    type: 'SALE',
    operation: 'MISSION_REWARD',
    adventure: 'CEMK_THE_JACKET',
    transactionId: 'tx-jacket-001',
    rewardSource: 'FALCO_ADVANCE',
    crewSize: 1,
    itemIds: [],
    amount: 500,
    currency: 'EUR'
  };

  const context = {
    campaignId: 'camp-01',
    accountId: 'acct-edgerunner'
  };

  // 1. Initial credit
  const res1 = await adapter.resolve(action, { context });
  assert.equal(res1.ok, true);
  assert.equal(res1.committed, true);
  assert.equal(res1.transactionId, 'tx-jacket-001');

  // 2. Idempotent replay with same key
  const res2 = await adapter.resolve(action, { context });
  assert.equal(res2.ok, true);
  assert.equal(res2.committed, true);

  // 3. Mismatched amount or invalid reward plan must be denied
  const invalidAction = {
    ...action,
    transactionId: 'tx-jacket-002',
    amount: 999999 // Cheat amount!
  };
  const resInvalid = await adapter.resolve(invalidAction, { context });
  assert.equal(resInvalid.ok, false);
  assert.equal(resInvalid.blocked, true);
});
