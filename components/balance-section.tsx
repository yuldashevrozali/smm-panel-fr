"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import type { PaymentMethod, PaymentRequest } from "@/types/api";

type BalanceSectionProps = {
    onBalanceUpdated?: () => void;
};

const TELEGRAM_CONTACT = "@yuldashev_frontend";
const MIN_AMOUNT = 1.0;

function formatMoney(value: number | string) {
    return `$${Number(value || 0).toFixed(2)}`;
}

export function BalanceSection({ onBalanceUpdated }: BalanceSectionProps) {
    const { user, token, login } = useAuth();

    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("admin");
    const [amount, setAmount] = useState<string>("10");
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Modal state
    const [activeModalRequest, setActiveModalRequest] = useState<PaymentRequest | null>(null);
    const [countdown, setCountdown] = useState<number>(30);

    // History state
    const [requests, setRequests] = useState<PaymentRequest[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [historyError, setHistoryError] = useState<string | null>(null);

    // Notifications
    const [notice, setNotice] = useState<{ type: "success" | "error"; title: string; message: string } | null>(null);

    const previousStatusMap = useRef<Record<number, string>>({});

    const refreshUserBalance = useCallback(async () => {
        if (!token) return;
        try {
            const currentUser = await api.me(token);
            login({ access_token: token, token_type: "bearer", message: "", user: currentUser });
            if (onBalanceUpdated) onBalanceUpdated();
        } catch {
            /* ignore silent refresh error */
        }
    }, [token, login, onBalanceUpdated]);

    const loadRequests = useCallback(
        async (isSilent = false) => {
            if (!token) return;
            if (!isSilent) setLoadingHistory(true);
            try {
                const data = await api.myPaymentRequests(token);

                // Detect status changes for notifications
                data.forEach((req) => {
                    const prevStatus = previousStatusMap.current[req.id];
                    if (prevStatus === "pending" && req.status === "approved") {
                        setNotice({
                            type: "success",
                            title: "Payment confirmed",
                            message: `Your ${formatMoney(req.amount)} balance has been added successfully.`,
                        });
                        void refreshUserBalance();
                    } else if (prevStatus === "pending" && req.status === "rejected") {
                        setNotice({
                            type: "error",
                            title: "Payment rejected",
                            message: req.rejection_reason
                                ? `${req.rejection_reason} Please contact ${TELEGRAM_CONTACT} on Telegram.`
                                : `Please contact ${TELEGRAM_CONTACT} on Telegram.`,
                        });
                    }
                    previousStatusMap.current[req.id] = req.status;
                });

                setRequests(data);
            } catch (err) {
                if (!isSilent) {
                    setHistoryError(err instanceof Error ? err.message : "Failed to load payment history");
                }
            } finally {
                if (!isSilent) setLoadingHistory(false);
            }
        },
        [token, refreshUserBalance]
    );

    useEffect(() => {
        let active = true;
        api.myPaymentRequests(token ?? "")
            .then((data) => {
                if (!active) return;
                data.forEach((req) => {
                    const prevStatus = previousStatusMap.current[req.id];
                    if (prevStatus === "pending" && req.status === "approved") {
                        setNotice({
                            type: "success",
                            title: "Payment confirmed",
                            message: `Your ${formatMoney(req.amount)} balance has been added successfully.`,
                        });
                        void refreshUserBalance();
                    } else if (prevStatus === "pending" && req.status === "rejected") {
                        setNotice({
                            type: "error",
                            title: "Payment rejected",
                            message: req.rejection_reason
                                ? `${req.rejection_reason} Please contact ${TELEGRAM_CONTACT} on Telegram.`
                                : `Please contact ${TELEGRAM_CONTACT} on Telegram.`,
                        });
                    }
                    previousStatusMap.current[req.id] = req.status;
                });
                setRequests(data);
            })
            .catch((err) => {
                if (active) {
                    setHistoryError(err instanceof Error ? err.message : "Failed to load payment history");
                }
            })
            .finally(() => {
                if (active) setLoadingHistory(false);
            });

        const interval = setInterval(() => {
            void loadRequests(true);
        }, 10000);
        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [token, loadRequests, refreshUserBalance]);

    // Modal countdown timer
    useEffect(() => {
        if (!activeModalRequest) return;

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    setActiveModalRequest(null);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [activeModalRequest]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!token) return;

        setFormError(null);
        const parsedAmount = Number(amount);

        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            setFormError("Please enter a valid numeric amount.");
            return;
        }

        if (parsedAmount < MIN_AMOUNT) {
            setFormError(`Minimum payment amount is ${formatMoney(MIN_AMOUNT)}.`);
            return;
        }

        setSubmitting(true);
        try {
            const created = await api.createPaymentRequest(token, {
                amount: parsedAmount,
                method: "admin",
                currency: "USD",
            });

            setCountdown(30);
            setActiveModalRequest(created);
            setAmount("10");
            void loadRequests(true);
        } catch (cause) {
            if (cause instanceof ApiError) {
                setFormError(cause.message);
            } else {
                setFormError("Failed to submit payment request. Please try again.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const methods: Array<{ id: PaymentMethod; name: string; subtitle: string; available: boolean }> = [
        { id: "admin", name: "Admin", subtitle: "Manual payment", available: true },
        { id: "crypto", name: "Crypto", subtitle: "Coming Soon", available: false },
        { id: "uzs_card", name: "UZS Card", subtitle: "Coming Soon", available: false },
        { id: "visa", name: "Visa", subtitle: "Coming Soon", available: false },
    ];

    return (
        <div className="balance-section-stack">
            {/* AVAILABLE BALANCE CARD */}
            <section className="balance-card">
                <p className="section-kicker">AVAILABLE CREDIT</p>
                <h2>{formatMoney(user?.balance ?? 0)}</h2>
                <p>Balances and payment status are verified and updated by the server.</p>
            </section>

            {/* NOTIFICATIONS */}
            {notice && (
                <div className={`alert ${notice.type === "success" ? "success-alert" : "error-alert"}`} role="alert">
                    <div>
                        <strong>{notice.title}</strong> — {notice.message}
                    </div>
                    <button onClick={() => setNotice(null)} aria-label="Close alert">
                        ×
                    </button>
                </div>
            )}

            {/* ADD FUNDS FORM & METHOD SELECTION */}
            <section className="content-card payment-form-card">
                <div className="card-heading">
                    <div>
                        <p>ADD FUNDS</p>
                        <h2>Choose Payment Method</h2>
                    </div>
                </div>

                <div className="payment-methods-grid">
                    {methods.map((method) => (
                        <button
                            key={method.id}
                            type="button"
                            className={`payment-method-card ${method.id === selectedMethod ? "is-selected" : ""} ${!method.available ? "is-disabled" : ""
                                }`}
                            onClick={() => method.available && setSelectedMethod(method.id)}
                            disabled={!method.available}
                        >
                            <div className="payment-method-card__top">
                                <span className="payment-method-name">{method.name}</span>
                                {method.available ? (
                                    <span className="payment-badge available">Available</span>
                                ) : (
                                    <span className="payment-badge coming-soon">Coming Soon</span>
                                )}
                            </div>
                            <p className="payment-method-subtitle">{method.subtitle}</p>
                        </button>
                    ))}
                </div>

                {selectedMethod === "admin" && (
                    <form onSubmit={handleSubmit} className="manual-payment-form">
                        <label className="service-select-field">
                            <span>Amount (USD)</span>
                            <div className="amount-input-wrapper">
                                <span className="currency-symbol">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min={MIN_AMOUNT}
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="10.00"
                                    required
                                    disabled={submitting}
                                />
                            </div>
                        </label>

                        {formError && <p className="form-error">{formError}</p>}

                        <button type="submit" className="primary-btn" disabled={submitting}>
                            {submitting ? "Submitting…" : "Send Request"}
                        </button>
                    </form>
                )}
            </section>

            {/* 30-SECOND INSTRUCTION MODAL */}
            {activeModalRequest && (
                <div className="modal-backdrop">
                    <div className="modal-box">
                        <div className="modal-header">
                            <span className="pill">Payment request created</span>
                            <span className="modal-timer">Closing in {countdown}s</span>
                        </div>

                        <h3>To complete your payment, contact us on Telegram:</h3>
                        <div className="telegram-contact-box">
                            <a href={`https://t.me/${TELEGRAM_CONTACT.replace("@", "")}`} target="_blank" rel="noreferrer">
                                {TELEGRAM_CONTACT}
                            </a>
                        </div>

                        <p className="modal-instruction">
                            Send the requested amount of <strong>{formatMoney(activeModalRequest.amount)}</strong> and mention your Sifat
                            SMM payment request <strong>#{activeModalRequest.id}</strong>.
                        </p>

                        <button
                            type="button"
                            className="secondary-btn full"
                            onClick={() => setActiveModalRequest(null)}
                        >
                            Got it (Close)
                        </button>
                    </div>
                </div>
            )}

            {/* PAYMENT HISTORY TABLE */}
            <section className="content-card">
                <div className="card-heading">
                    <div>
                        <p>PAYMENT HISTORY</p>
                        <h2>Deposit Requests</h2>
                    </div>
                </div>

                {loadingHistory ? (
                    <div className="skeleton large" />
                ) : historyError ? (
                    <div className="empty-state">
                        <span>!</span>
                        <p>{historyError}</p>
                    </div>
                ) : !requests.length ? (
                    <div className="empty-state">
                        <span>$</span>
                        <h3>No payment requests yet</h3>
                        <p>Your submitted deposit requests will appear here.</p>
                    </div>
                ) : (
                    <div className="orders-table">
                        <div className="table-head payment-history-head">
                            <span>Date</span>
                            <span>Amount</span>
                            <span>Method</span>
                            <span>Status</span>
                            <span>Details</span>
                        </div>
                        {requests.map((req) => (
                            <div key={req.id} className="table-row payment-history-row">
                                <small>{req.created_at ? new Date(req.created_at).toLocaleDateString() : "—"}</small>
                                <strong>{formatMoney(req.amount)}</strong>
                                <span className="payment-method-tag">{req.method.toUpperCase()}</span>
                                <span className={`status-pill status-pill--${req.status}`}>{req.status}</span>
                                <small className="rejection-note">
                                    {req.status === "rejected" && req.rejection_reason
                                        ? req.rejection_reason
                                        : req.status === "rejected"
                                            ? "Contact @yuldashev_frontend"
                                            : req.status === "approved"
                                                ? "Balance credited"
                                                : "Awaiting admin verification"}
                                </small>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
