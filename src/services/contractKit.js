import { APIClient } from '@wharfkit/antelope';
import { ContractKit } from '@wharfkit/contract';
import { getHealthyWaxMainnetEndpoint } from './waxMainnetEndpoints';

let activeEndpoint = '';
let contractKit = null;

async function getContractKit() {
  const endpoint = await getHealthyWaxMainnetEndpoint();
  if (!contractKit || endpoint !== activeEndpoint) {
    activeEndpoint = endpoint;
    contractKit = new ContractKit({ client: new APIClient({ url: endpoint }) });
  }
  return contractKit;
}

// ABI-backed construction validates the action name and payload before it is
// handed to the existing Session/Wallet signing path.
export async function buildContractAction(account, name, data) {
  const kit = await getContractKit();
  const contract = await kit.load(account);
  // Constructing the WharfKit Action performs ABI serialization/validation.
  // Keep the original object data for Maestro's readable approval screen;
  // Action#toJSON intentionally returns packed hex and placeholder auth.
  contract.action(name, data);
  return { account: String(account), name: String(name), data };
}
