import React from 'react';
import {render, screen, waitFor, fireEvent} from '@testing-library/react';
import BurnReceipt from './BurnReceipt';
import {extractBurnReward, fetchBurnReward} from '../services/burnReward';
jest.mock('../services/burnReward');
jest.mock('./TokenLogo', () => () => <span />);
const receipt = {owner:'alice', transactionId:'a'.repeat(64), assetId:'123', actionTraces:[]};
beforeEach(() => jest.clearAllMocks());
test('shows immediate exact payout and transaction link', () => {
  extractBurnReward.mockReturnValue('0.123456');
  const dismiss = jest.fn();
  render(<BurnReceipt receipt={receipt} onDismiss={dismiss} />);
  expect(screen.getByText('+0.123456 CINDER received')).toBeTruthy();
  expect(screen.getByRole('link').getAttribute('href')).toContain(receipt.transactionId);
  expect(fetchBurnReward).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', {name:'Dismiss burn reward'}));
  expect(dismiss).toHaveBeenCalled();
});
test('keeps accepted burn successful while waiting then shows indexed payout', async () => {
  extractBurnReward.mockReturnValue(null);
  fetchBurnReward.mockResolvedValue('2.000001');
  render(<BurnReceipt receipt={receipt} />);
  expect(screen.getByText('Burn complete')).toBeTruthy();
  expect(screen.queryByText(/0.000000 CINDER/)).toBeNull();
  await waitFor(() => expect(screen.getByText('+2.000001 CINDER received')).toBeTruthy());
});