import currenciesData from '../../app/data/currencies.json';

type Currency = {
  code: string;
  symbol: string;
  name: string;
};

const currencies: Currency[] = currenciesData as Currency[];

export const getCurrencySymbol = (currencyCode: string): string => {
  const currency = currencies.find((c) => c.code === currencyCode);
  return currency?.symbol || currencyCode;
};

export const formatCurrency = (amount: number, currencyCode: string = "USD"): string => {
  const symbol = getCurrencySymbol(currencyCode);
  
  // Format number with proper decimal places
  const formattedAmount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  // Return with symbol (some currencies put symbol after, but most are before)
  return `${symbol}${formattedAmount}`;
};

export const getCurrencyName = (currencyCode: string): string => {
  const currency = currencies.find((c) => c.code === currencyCode);
  return currency?.name || currencyCode;
};
