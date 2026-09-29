export const GAME_NOTICE_EVENT = 'cleanupcentr-mainnet:notice';
export const GAME_CONFIRM_EVENT = 'cleanupcentr-mainnet:confirm';
export const GAME_TRANSACTION_EVENT = 'cleanupcentr-mainnet:transaction-progress';

export function notifyGame(message, type = 'info') {
  window.dispatchEvent(new CustomEvent(GAME_NOTICE_EVENT, { detail: { message: String(message), type } }));
}

export function confirmGame({
  title = 'Confirm action', message, confirmLabel = 'Confirm', danger = false,
  cancelLabel = 'Cancel', eyebrow = 'PLAYER CONFIRMATION', imageUrl = '', imageAlt = '',
  facts = [], warning = '', warningLabel = 'Important',
}) {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent(GAME_CONFIRM_EVENT, {
      detail: {
        title, message: String(message), confirmLabel, cancelLabel, danger, eyebrow,
        imageUrl, imageAlt, facts, warning, warningLabel, resolve,
      },
    }));
  });
}

export function updateGameTransaction(detail) {
  window.dispatchEvent(new CustomEvent(GAME_TRANSACTION_EVENT, { detail }));
}

export function closeGameTransaction() {
  updateGameTransaction(null);
}
