import { createContext, useContext, useState, useEffect } from 'react';

const CurrencyContext = createContext(null);

export const CURRENCIES = {
  USD: { symbol: '$', rate: 1.0, label: 'USD ($)', name: 'US Dollar' },
  EUR: { symbol: '€', rate: 0.92, label: 'EUR (€)', name: 'Euro' },
  GBP: { symbol: '£', rate: 0.79, label: 'GBP (£)', name: 'British Pound' },
  INR: { symbol: '₹', rate: 83.5, label: 'INR (₹)', name: 'Indian Rupee' },
  JPY: { symbol: '¥', rate: 156.0, label: 'JPY (¥)', name: 'Japanese Yen' }
};

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    const savedCurrency = localStorage.getItem('selected_currency');
    if (savedCurrency && CURRENCIES[savedCurrency]) {
      setCurrency(savedCurrency);
    }
  }, []);

  const changeCurrency = (newCurrency) => {
    if (CURRENCIES[newCurrency]) {
      setCurrency(newCurrency);
      localStorage.setItem('selected_currency', newCurrency);
    }
  };

  const convert = (usdVal) => {
    const val = parseFloat(usdVal);
    if (isNaN(val)) return 0;
    const currentRate = CURRENCIES[currency].rate;
    return val * currentRate;
  };

  const convertToUSD = (localVal) => {
    const val = parseFloat(localVal);
    if (isNaN(val)) return 0;
    const currentRate = CURRENCIES[currency].rate;
    return val / currentRate;
  };

  const format = (usdVal, decimals = 2) => {
    const val = parseFloat(usdVal);
    if (isNaN(val)) return CURRENCIES[currency].symbol + '0.00';
    const converted = convert(val);
    
    // Use standard locale formatting if JPY (usually no decimals in Yen)
    const options = {
      minimumFractionDigits: currency === 'JPY' ? 0 : decimals,
      maximumFractionDigits: currency === 'JPY' ? 0 : decimals,
    };
    
    return CURRENCIES[currency].symbol + converted.toLocaleString(undefined, options);
  };

  const value = {
    currency,
    changeCurrency,
    currencies: CURRENCIES,
    currentCurrency: CURRENCIES[currency],
    convert,
    convertToUSD,
    format,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

export default CurrencyContext;
