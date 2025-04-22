import BigNumber from 'bignumber.js';

export const toBigIntTokenAmount = (amount: string, tokenDecimals: number) => {
    const precision = new BigNumber(10).pow(tokenDecimals);
    return BigInt(new BigNumber(amount).multipliedBy(precision).toFixed(0));
};