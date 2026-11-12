import { useEffect, useMemo, useState } from "react";
import { FiArrowDown, FiCopy, FiRefreshCw, FiRepeat } from "react-icons/fi";
import styles from "./styles.module.css";

const API_BASE = "https://api.frankfurter.dev";

const QUICK_AMOUNTS = [1, 10, 100, 1000];

const CurrencyConverter = () => {
    const [amount, setAmount] = useState("1");
    const [fromCurrency, setFromCurrency] = useState("USD");
    const [toCurrency, setToCurrency] = useState("INR");

    const [currencies, setCurrencies] = useState([]);
    const [rate, setRate] = useState(null);
    const [rateDate, setRateDate] = useState("");

    const [isCurrenciesLoading, setIsCurrenciesLoading] = useState(true);
    const [isRateLoading, setIsRateLoading] = useState(true);

    const [currencyError, setCurrencyError] = useState("");
    const [rateError, setRateError] = useState("");
    const [copied, setCopied] = useState(false);
    const [rateRefresh, setRateRefresh] = useState(0);

    useEffect(() => {
        const controller = new AbortController();

        const loadCurrencies = async () => {
            try {
                setIsCurrenciesLoading(true);

                const response = await fetch(`${API_BASE}/v2/currencies`, {
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error("Unable to load currencies.");
                }

                const data = await response.json();

                const currencyList = data
                    .filter((item) => item.type === "currency")
                    .map((item) => ({
                        code: item.iso_code,
                        name: item.name,
                    }))
                    .filter((item) => item.code && item.name)
                    .sort((first, second) =>
                        first.code.localeCompare(second.code),
                    );

                setCurrencies(currencyList);
            } catch (requestError) {
                if (requestError.name !== "AbortError") {
                    setCurrencyError("Unable to load currency list.");
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsCurrenciesLoading(false);
                }
            }
        };

        loadCurrencies();

        return () => {
            controller.abort();
        };
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        const loadRate = async () => {
            if (fromCurrency === toCurrency) {
                setRate(1);
                setRateDate("");
                setRateError("");
                setIsRateLoading(false);

                return;
            }

            try {
                setIsRateLoading(true);
                setRate(null);
                setRateDate("");
                setRateError("");

                const response = await fetch(
                    `${API_BASE}/v2/rate/${fromCurrency}/${toCurrency}`,
                    {
                        signal: controller.signal,
                    },
                );

                if (!response.ok) {
                    throw new Error("Unable to fetch exchange rate.");
                }

                const data = await response.json();
                if (!Number.isFinite(data.rate) || data.rate <= 0) {
                    throw new Error("The exchange rate response was invalid.");
                }

                setRate(data.rate);
                setRateDate(data.date || "");
            } catch (requestError) {
                if (requestError.name !== "AbortError") {
                    setRate(null);
                    setRateError(
                        "Exchange rate is unavailable right now. Please try again.",
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsRateLoading(false);
                }
            }
        };

        loadRate();

        return () => {
            controller.abort();
        };
    }, [fromCurrency, toCurrency, rateRefresh]);

    const amountText = amount.trim();
    const numericAmount = amountText ? Number(amountText) : Number.NaN;
    const isAmountValid =
        amountText !== "" &&
        Number.isFinite(numericAmount) &&
        numericAmount >= 0;

    const convertedAmount = useMemo(() => {
        if (!isAmountValid || rate === null) return null;

        return numericAmount * rate;
    }, [isAmountValid, numericAmount, rate]);

    const formatNumber = (value) => {
        if (!Number.isFinite(value)) return "—";

        return new Intl.NumberFormat("en-IN", {
            maximumFractionDigits: 6,
        }).format(value);
    };

    const handleSwap = () => {
        setFromCurrency(toCurrency);
        setToCurrency(fromCurrency);
    };

    const handleRefresh = () => {
        setRateRefresh((current) => current + 1);
    };

    const handleCopy = async () => {
        if (convertedAmount === null) return;

        const text = `${formatNumber(numericAmount)} ${fromCurrency} = ${formatNumber(
            convertedAmount,
        )} ${toCurrency}`;

        try {
            await navigator.clipboard.writeText(text);

            setCopied(true);

            window.setTimeout(() => {
                setCopied(false);
            }, 1200);
        } catch {
            setCopied(false);
        }
    };

    const fromName =
        currencies.find((item) => item.code === fromCurrency)?.name ||
        fromCurrency;

    const toName =
        currencies.find((item) => item.code === toCurrency)?.name || toCurrency;

    return (
        <section className={styles.wrapper}>
            <div className={styles.header}>
                <div className={styles.headerInfo}>
                    <span className={styles.label}>CURRENCY CONVERTER</span>

                    <h1 className={styles.title}>Convert currencies</h1>

                    <p className={styles.text}>
                        Convert between global currencies using the latest
                        available reference rates. Rates update when providers
                        publish them and are not live trading quotes.
                    </p>
                </div>

                <button
                    className={styles.refreshButton}
                    type="button"
                    onClick={handleRefresh}
                >
                    <FiRefreshCw />
                    Refresh Rates
                </button>
            </div>

            <div className={styles.converter}>
                <div className={styles.amountSection}>
                    <label htmlFor="currency-amount">Amount</label>

                    <div className={styles.amountInput}>
                        <span>{fromCurrency}</span>

                        <input
                            id="currency-amount"
                            type="number"
                            min="0"
                            step="any"
                            value={amount}
                            onChange={(event) => setAmount(event.target.value)}
                            placeholder="Enter amount"
                        />
                    </div>

                    <div className={styles.quickAmounts}>
                        {QUICK_AMOUNTS.map((value) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setAmount(String(value))}
                            >
                                {value.toLocaleString("en-IN")}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.currencySection}>
                    <div className={styles.currencyCard}>
                        <label className={styles.cardLabel} htmlFor="from-currency">From</label>

                        <select
                            id="from-currency"
                            value={fromCurrency}
                            disabled={isCurrenciesLoading}
                            onChange={(event) =>
                                setFromCurrency(event.target.value)
                            }
                        >
                            {currencies.length ? (
                                currencies.map((currency) => (
                                    <option
                                        key={currency.code}
                                        value={currency.code}
                                    >
                                        {currency.code} - {currency.name}
                                    </option>
                                ))
                            ) : (
                                <>
                                    <option value="USD">USD</option>
                                    <option value="INR">INR</option>
                                </>
                            )}
                        </select>

                        <strong>{fromCurrency}</strong>
                        <p>{fromName}</p>
                    </div>

                    <button
                        className={styles.swapButton}
                        type="button"
                        onClick={handleSwap}
                        aria-label="Swap currencies"
                    >
                        <FiRepeat />
                    </button>

                    <div className={styles.currencyCard}>
                        <label className={styles.cardLabel} htmlFor="to-currency">To</label>

                        <select
                            id="to-currency"
                            value={toCurrency}
                            disabled={isCurrenciesLoading}
                            onChange={(event) =>
                                setToCurrency(event.target.value)
                            }
                        >
                            {currencies.length ? (
                                currencies.map((currency) => (
                                    <option
                                        key={currency.code}
                                        value={currency.code}
                                    >
                                        {currency.code} - {currency.name}
                                    </option>
                                ))
                            ) : (
                                <>
                                    <option value="INR">INR</option>
                                    <option value="USD">USD</option>
                                </>
                            )}
                        </select>

                        <strong>{toCurrency}</strong>
                        <p>{toName}</p>
                    </div>
                </div>

                <div className={styles.direction}>
                    <FiArrowDown />
                </div>

                <div className={styles.result}>
                    <div className={styles.resultInfo}>
                        <span>Converted Amount</span>

                        {isRateLoading ? (
                            <strong>Loading rate...</strong>
                        ) : !isAmountValid ? (
                            <strong>Enter a valid non-negative amount</strong>
                        ) : convertedAmount !== null ? (
                            <strong>
                                {formatNumber(convertedAmount)}
                                <small>{toCurrency}</small>
                            </strong>
                        ) : (
                            <strong>Unavailable</strong>
                        )}

                        <p>
                            {isAmountValid
                                ? `${formatNumber(numericAmount)} ${fromCurrency}`
                                : `— ${fromCurrency}`}
                        </p>
                    </div>

                    <button
                        className={styles.copyButton}
                        type="button"
                        disabled={convertedAmount === null}
                        onClick={handleCopy}
                    >
                        <FiCopy />
                        {copied ? "Copied" : "Copy"}
                    </button>
                </div>

                {currencyError && <div className={styles.error} role="alert">{currencyError}</div>}
                {rateError && <div className={styles.error} role="alert">{rateError}</div>}

                <div className={styles.rateDetails}>
                    <div className={styles.rateItem}>
                        <span>Exchange Rate</span>

                        <strong>
                            {rate !== null
                                ? `1 ${fromCurrency} = ${formatNumber(
                                      rate,
                                  )} ${toCurrency}`
                                : "Unavailable"}
                        </strong>
                    </div>

                    <div className={styles.rateItem}>
                        <span>Inverse Rate</span>

                        <strong>
                            {rate
                                ? `1 ${toCurrency} = ${formatNumber(
                                      1 / rate,
                                  )} ${fromCurrency}`
                                : "Unavailable"}
                        </strong>
                    </div>

                    <div className={styles.rateItem}>
                        <span>Rate Date</span>

                        <strong>
                            {rateDate ||
                                (fromCurrency === toCurrency
                                    ? "Not applicable"
                                    : isRateLoading
                                      ? "Loading..."
                                      : rateError || rate === null
                                        ? "Unavailable"
                                        : "Date unavailable")}
                        </strong>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CurrencyConverter;
