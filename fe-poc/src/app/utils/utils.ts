import BigNumber from "bignumber.js";

export const toBigIntTokenAmount = (amount: string, tokenDecimals: number) => {
  const precision = new BigNumber(10).pow(tokenDecimals);
  return BigInt(new BigNumber(amount).multipliedBy(precision).toFixed(0));
};

export const shortenAddress = (address: string): string => {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};
