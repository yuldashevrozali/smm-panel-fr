"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useSearchParams } from "next/navigation";

import { api, ApiError } from "@/lib/api";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/components/auth-provider";
import { locales, useLocale } from "@/lib/i18n";

import type { Order, Service } from "@/types/api";

import {
  normalizeServices,
  type PlatformName,
  type NormalizedService,
} from "@/lib/service-catalog";

import { ServiceCascade } from "@/components/service-cascade";


type View =
  | "dashboard"
  | "new-order"
  | "orders"
  | "services"
  | "balance"
  | "profile";


const money = (value: string | number) =>
  `$${Number(value || 0).toFixed(2)}`;


const unavailable = (error: unknown) =>
  error instanceof ApiError && error.status === 404;


function DashboardApp() {
  const { user, token, logout } = useAuth();
  const { locale, setLocale, t } = useLocale();
  const searchParams = useSearchParams();


  const navigation: {
    id: View;
    label: string;
    icon: string;
  }[] = [
      {
        id: "dashboard",
        label: t.dashboard.navDashboard,
        icon: "⌂",
      },
      {
        id: "new-order",
        label: t.dashboard.navNewOrder,
        icon: "+",
      },
      {
        id: "orders",
        label: t.dashboard.navOrders,
        icon: "▤",
      },
      {
        id: "services",
        label: t.dashboard.navServices,
        icon: "◈",
      },
      {
        id: "balance",
        label: t.dashboard.navBalance,
        icon: "$",
      },
      {
        id: "profile",
        label: t.dashboard.navProfile,
        icon: "◉",
      },
    ];


  const [view, setView] = useState<View>("dashboard");

  const [sidebarOpen, setSidebarOpen] =
    useState(false);


  const [services, setServices] =
    useState<Service[]>([]);

  const [orders, setOrders] =
    useState<Order[]>([]);


  const [loadingServices, setLoadingServices] =
    useState(true);

  const [loadingOrders, setLoadingOrders] =
    useState(true);


  const [servicesPending, setServicesPending] =
    useState(false);

  const [ordersPending, setOrdersPending] =
    useState(false);


  const [error, setError] =
    useState<string | null>(null);

  const [notice, setNotice] =
    useState<string | null>(null);


  /*
   * NEW ORDER STATE
   *
   * Platform
   *    ↓
   * Service type
   *    ↓
   * Exact service
   *    ↓
   * Link
   *    ↓
   * Quantity
   */
  const [selectedPlatform, setSelectedPlatform] =
    useState<PlatformName | "">("");

  const [selectedServiceType, setSelectedServiceType] =
    useState("");

  const [selectedService, setSelectedService] =
    useState<NormalizedService | null>(null);


  const [link, setLink] =
    useState("");

  const [quantity, setQuantity] =
    useState(0);


  const [submitting, setSubmitting] =
    useState(false);

  const [orderRequestKey, setOrderRequestKey] =
    useState<string | null>(null);


  /*
   * API ERROR HANDLER
   */
  const handleApiError = (cause: unknown) => {
    if (
      cause instanceof ApiError &&
      cause.status === 401
    ) {
      logout();
      return;
    }

    setError(
      cause instanceof Error
        ? cause.message
        : t.alerts.unableToLoad,
    );
  };


  /*
   * LOAD SERVICES + ORDERS
   *
   * One provider request.
   * Filtering happens locally.
   */
  useEffect(() => {
    if (!token) return;


    api.services(token)
      .then((data) => {
        setServices(Array.isArray(data) ? data : []);

        /*
         * Do not preserve an old service after
         * the catalog is refreshed.
         */
        setSelectedService(null);
        setSelectedServiceType("");
        setSelectedPlatform("");
        setQuantity(0);
      })
      .catch((cause) => {
        if (unavailable(cause)) {
          setServicesPending(true);
        } else {
          handleApiError(cause);
        }
      })
      .finally(() => {
        setLoadingServices(false);
      });


    api.orders(token)
      .then((data) => {
        const list = Array.isArray(data)
          ? data
          : data && typeof data === "object" && "items" in data && Array.isArray((data as { items: unknown }).items)
            ? (data as { items: Order[] }).items
            : [];
        setOrders(list);
      })
      .catch((cause) => {
        if (unavailable(cause)) {
          setOrdersPending(true);
        } else {
          handleApiError(cause);
        }
      })
      .finally(() => {
        setLoadingOrders(false);
      });


    // Session token changes only on sign in/out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);


  /*
   * SERVICE ID FROM PUBLIC SERVICES PAGE
   *
   * Example:
   * /dashboard?service_id=12345
   */
  const serviceIdFromUrl =
    searchParams.get("service_id") ?? "";


  /*
   * Find service from provider catalog.
   */
  const preselectedService =
    useMemo(() => {
      if (!serviceIdFromUrl) return null;

      return (
        services.find(
          (service) =>
            String(service.service) ===
            serviceIdFromUrl,
        ) ?? null
      );
    }, [serviceIdFromUrl, services]);


  /*
   * Normalize provider data.
   */
  const normalizedServices =
    useMemo(
      () => normalizeServices(services),
      [services],
    );


  /*
   * Normalized preselected service.
   */
  const normalizedPreselectedService =
    useMemo(() => {
      if (!preselectedService) return null;

      return (
        normalizedServices.find(
          (service) =>
            String(service.service) ===
            serviceIdFromUrl,
        ) ?? null
      );
    }, [
      normalizedServices,
      preselectedService,
      serviceIdFromUrl,
    ]);


  /*
   * If user comes from public Services page
   * with ?service_id=... the UI should
   * immediately surface the New Order flow
   * using derived state rather than a
   * state-setting effect.
   */


  /*
   * Current selected service.
   */
  const effectiveSelectedService =
    selectedService ??
    normalizedPreselectedService;


  /*
   * Current platform.
   */
  const effectiveSelectedPlatform =
    selectedPlatform ||
    normalizedPreselectedService?.platform ||
    "";


  /*
   * Current service type.
   */
  const effectiveSelectedServiceType =
    selectedServiceType ||
    normalizedPreselectedService?.serviceType ||
    "";


  /*
   * Estimated price.
   *
   * Provider rate is currently used as the
   * displayed customer estimate.
   */
  const estimated =
    effectiveSelectedService &&
      quantity > 0
      ? Number(effectiveSelectedService.rate) *
      quantity /
      1000
      : 0;


  /*
   * Order statistics.
   */
  const safeOrders = useMemo(() => (Array.isArray(orders) ? orders : []), [orders]);

  const pending = useMemo(
    () =>
      safeOrders.filter(
        (order) =>
          order &&
          [
            "pending",
            "processing",
            "in progress",
          ].includes((order.status || "").toLowerCase()),
      ).length,
    [safeOrders],
  );

  const completed = useMemo(
    () =>
      safeOrders.filter(
        (order) =>
          order &&
          [
            "completed",
            "complete",
          ].includes((order.status || "").toLowerCase()),
      ).length,
    [safeOrders],
  );


  /*
   * Start an order from Services page.
   */
  function beginOrder(service: Service) {
    const normalized =
      normalizeServices([service])[0];

    setSelectedPlatform(
      normalized.platform,
    );

    setSelectedServiceType(
      normalized.serviceType,
    );

    setSelectedService(normalized);

    setQuantity(normalized.min);

    setOrderRequestKey(null);

    setLink("");

    setView("new-order");

    setNotice(null);

    setError(null);
  }


  /*
   * PLATFORM CHANGE
   *
   * Changing platform MUST reset:
   *
   * - service type
   * - exact service
   * - quantity
   * - link
   */
  function handlePlatformChange(
    nextPlatform: PlatformName | "",
  ) {
    setSelectedPlatform(nextPlatform);

    setSelectedServiceType("");

    setSelectedService(null);

    setQuantity(0);

    setLink("");

    setOrderRequestKey(null);

    setError(null);
  }


  /*
   * SERVICE TYPE CHANGE
   *
   * Changing service type MUST reset
   * exact service.
   */
  function handleServiceTypeChange(
    nextServiceType: string,
  ) {
    setSelectedServiceType(
      nextServiceType,
    );

    setSelectedService(null);

    setQuantity(0);

    setLink("");

    setOrderRequestKey(null);

    setError(null);
  }


  /*
   * EXACT SERVICE CHANGE
   */
  function handleServiceChange(
    service: NormalizedService | null,
  ) {
    setSelectedService(service);

    setQuantity(
      service?.min ?? 0,
    );

    setLink("");

    setOrderRequestKey(null);

    setError(null);
  }


  /*
   * CREATE ORDER
   */
  async function placeOrder(
    event: FormEvent,
  ) {
    event.preventDefault();

    setNotice(null);
    setError(null);


    if (
      !effectiveSelectedService ||
      !token
    ) {
      return;
    }


    /*
     * Link validation.
     */
    if (!link.trim()) {
      setError(
        "Iltimos, target linkni kiriting.",
      );
      return;
    }


    /*
     * Quantity validation.
     */
    if (
      quantity <
      effectiveSelectedService.min
    ) {
      setError(
        `Miqdor minimal qiymatdan kam. Minimal miqdor: ${effectiveSelectedService.min.toLocaleString()}.`,
      );
      return;
    }


    if (
      quantity >
      effectiveSelectedService.max
    ) {
      setError(
        `Miqdor maksimal qiymatdan oshib ketdi. Maksimal miqdor: ${effectiveSelectedService.max.toLocaleString()}.`,
      );
      return;
    }


    /*
     * Prevent accidental duplicate requests.
     */
    setSubmitting(true);


    const requestKey =
      orderRequestKey ??
      crypto.randomUUID();


    setOrderRequestKey(requestKey);


    try {
      /*
       * IMPORTANT:
       *
       * Send the REAL provider service ID.
       *
       * Example:
       * Instagram Followers
       * → service_id: "12345"
       */
      const order =
        await api.createOrder(
          token,
          {
            service_id:
              effectiveSelectedService.service,

            link: link.trim(),

            quantity,
          },
          requestKey,
        );


      /*
       * Add new order to local list.
       */
      setOrders((current) => [
        order,
        ...current,
      ]);


      setOrderRequestKey(null);

      setNotice(
        t.dashboard.orderSubmitted,
      );

      setView("orders");
    } catch (cause) {
      if (unavailable(cause)) {
        setOrdersPending(true);
      } else {
        handleApiError(cause);
      }
    } finally {
      setSubmitting(false);
    }
  }


  /*
   * If a service was opened from public Services,
   * show New Order.
   */
  const currentView: View =
    normalizedPreselectedService
      ? "new-order"
      : view;


  /*
   * Page headings.
   */
  const heading: Record<
    View,
    [string, string]
  > = {
    dashboard: [
      t.dashboard.overview,
      `${t.dashboard.welcome}, ${user?.first_name ??
      t.dashboard.guestUser
      }`,
    ],

    "new-order": [
      t.dashboard.newOrder,
      t.dashboard.createOrderFromLive,
    ],

    orders: [
      t.dashboard.ordersTitle,
      t.dashboard.trackOrders,
    ],

    services: [
      t.dashboard.servicesTitle,
      t.dashboard.liveCatalog,
    ],

    balance: [
      t.dashboard.balanceTitle,
      t.dashboard.accountCredit,
    ],

    profile: [
      t.dashboard.profileTitle,
      t.dashboard.profileSubtitle,
    ],
  };


  return (
    <div className="saas-shell">

      {/* Mobile overlay */}
      <div
        className={
          sidebarOpen
            ? "mobile-drawer-overlay is-visible"
            : "mobile-drawer-overlay"
        }
        onClick={() =>
          setSidebarOpen(false)
        }
      />


      {/* SIDEBAR */}
      <aside
        className={
          sidebarOpen
            ? "app-sidebar is-open"
            : "app-sidebar"
        }
      >
        <div className="app-brand">
          <span className="brand-mark small-mark">
            S
          </span>
          SMMLY
        </div>


        <nav>
          {navigation.map((item) => (
            <button
              key={item.id}
              className={
                currentView === item.id
                  ? "side-link active"
                  : "side-link"
              }
              onClick={() => {
                setView(item.id);
                setError(null);
                setNotice(null);
                setSidebarOpen(false);
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>


        <button
          className="logout-link"
          onClick={logout}
        >
          {t.dashboard.signOut}
          <span>→</span>
        </button>
      </aside>


      {/* MAIN */}
      <main className="app-main">

        {/* TOP BAR */}
        <header className="app-topbar">

          <div className="app-topbar__start">

            <button
              type="button"
              className="mobile-nav-toggle"
              aria-label="Open dashboard menu"
              onClick={() =>
                setSidebarOpen(true)
              }
            >
              <span />
              <span />
              <span />
            </button>


            <div>
              <p className="section-kicker">
                {heading[currentView][0]}
              </p>

              <h1>
                {heading[currentView][1]}
              </h1>
            </div>

          </div>


          <div className="app-topbar__end">

            <div className="account-chip">

              <span>
                {(
                  user?.first_name?.[0] ??
                  "U"
                ).toUpperCase()}
              </span>

              <div>
                <strong>
                  {user?.first_name ??
                    t.dashboard.accountChip}
                </strong>

                <small>
                  {user?.username
                    ? `@${user.username}`
                    : t.dashboard.telegramUser}
                </small>
              </div>

            </div>


            <label className="language-switcher language-switcher--inline">

              <span className="sr-only">
                {t.dashboard.selectLanguage}
              </span>

              <select
                value={locale}
                onChange={(event) =>
                  setLocale(
                    event.target.value as
                    | "en"
                    | "uz"
                    | "ru",
                  )
                }
              >
                {locales.map((item) => (
                  <option
                    key={item.code}
                    value={item.code}
                  >
                    {item.label}
                  </option>
                ))}
              </select>

            </label>

          </div>

        </header>


        {/* ALERTS */}

        {error && (
          <div
            className="alert error-alert"
            role="alert"
          >
            {error}

            <button
              onClick={() =>
                setError(null)
              }
              aria-label="Close error"
            >
              ×
            </button>
          </div>
        )}


        {notice && (
          <div
            className="alert success-alert"
            role="status"
          >
            {notice}

            <button
              onClick={() =>
                setNotice(null)
              }
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        )}


        {/* ========================= */}
        {/* DASHBOARD */}
        {/* ========================= */}

        {currentView === "dashboard" && (
          <>

            <section className="stat-grid">

              <Stat
                label={
                  t.dashboard.availableBalance
                }
                value={money(
                  user?.balance ?? 0,
                )}
                accent
              />

              <Stat
                label={
                  t.dashboard.totalOrders
                }
                value={
                  loadingOrders
                    ? "…"
                    : ordersPending
                      ? "—"
                      : String(
                        safeOrders.length,
                      )
                }
              />

              <Stat
                label={
                  t.dashboard.inProgress
                }
                value={
                  loadingOrders
                    ? "…"
                    : ordersPending
                      ? "—"
                      : String(pending)
                }
              />

              <Stat
                label={
                  t.dashboard.completed
                }
                value={
                  loadingOrders
                    ? "…"
                    : ordersPending
                      ? "—"
                      : String(completed)
                }
              />

            </section>


            <section className="content-card">

              <div className="card-heading">

                <div>
                  <p>
                    {t.dashboard.recentActivity}
                  </p>

                  <h2>
                    {t.dashboard.latestOrders}
                  </h2>
                </div>


                <button
                  className="text-action"
                  onClick={() =>
                    setView("orders")
                  }
                >
                  {t.dashboard.viewAll}
                </button>

              </div>


              <OrdersTable
                orders={safeOrders.slice(0, 5)}
                loading={loadingOrders}
                pending={ordersPending}
                title={
                  t.dashboard.noOrdersYet
                }
                description={
                  t.dashboard.ordersWillAppear
                }
                pendingTitle={
                  t.dashboard.ordersIntegration
                }
                pendingText={
                  t.dashboard.ordersIntegrationText
                }
                columns={{
                  order:
                    t.dashboard.tableOrder,
                  service:
                    t.dashboard.tableService,
                  quantity:
                    t.dashboard.tableQuantity,
                  charge:
                    t.dashboard.tableCharge,
                  status:
                    t.dashboard.tableStatus,
                }}
              />

            </section>


            <section className="quick-card">

              <div>
                <p className="section-kicker">
                  {t.dashboard.readyWhenYouAre}
                </p>

                <h2>
                  {t.dashboard.startCampaign}
                </h2>

                <p>
                  {t.dashboard.chooseServices}
                </p>
              </div>


              <button
                className="primary-btn"
                onClick={() =>
                  setView("new-order")
                }
              >
                {t.dashboard.createOrder}
                <span>→</span>
              </button>

            </section>

          </>
        )}


        {/* ========================= */}
        {/* SERVICES */}
        {/* ========================= */}

        {currentView === "services" && (
          <section className="content-card">

            <div className="card-heading">

              <div>
                <p>
                  {t.dashboard.catalog}
                </p>

                <h2>
                  {t.dashboard.availableServices}
                </h2>
              </div>

            </div>


            <ServicesGrid
              services={services}
              loading={loadingServices}
              pending={servicesPending}
              onSelect={beginOrder}
              emptyTitle={
                t.dashboard.noServicesAvailable
              }
              emptyText={
                t.dashboard.checkBackLater
              }
              pendingTitle={
                t.dashboard.servicesIntegration
              }
              pendingText={
                t.dashboard.servicesIntegrationText
              }
            />

          </section>
        )}


        {/* ========================= */}
        {/* NEW ORDER */}
        {/* ========================= */}

        {currentView === "new-order" && (
          <section className="order-layout">

            <form
              className="content-card order-form"
              onSubmit={placeOrder}
            >

              <div className="card-heading">

                <div>
                  <p>
                    {t.dashboard.orderDetails}
                  </p>

                  <h2>
                    {t.dashboard.setUpOrder}
                  </h2>
                </div>

              </div>


              {servicesPending ? (

                <IntegrationPending
                  title={
                    t.dashboard.servicesIntegration
                  }
                  description={
                    t.dashboard.servicesIntegrationText
                  }
                />

              ) : loadingServices ? (

                <div className="skeleton large" />

              ) : (

                <>

                  {/* ================================= */}
                  {/* 1. PLATFORM                       */}
                  {/* 2. SERVICE TYPE                   */}
                  {/* 3. EXACT SERVICE                  */}
                  {/* ================================= */}

                  <ServiceCascade
                    services={services}
                    platform={
                      effectiveSelectedPlatform
                    }
                    serviceType={
                      effectiveSelectedServiceType
                    }
                    serviceId={
                      effectiveSelectedService
                        ? String(
                          effectiveSelectedService.service,
                        )
                        : ""
                    }
                    onPlatformChange={
                      handlePlatformChange
                    }
                    onServiceTypeChange={
                      handleServiceTypeChange
                    }
                    onServiceChange={
                      handleServiceChange
                    }
                    disabled={
                      submitting
                    }
                  />


                  {/* SERVICE DETAILS */}

                  {effectiveSelectedService && (
                    <div className="service-detail">

                      <strong>
                        {
                          effectiveSelectedService.name
                        }
                      </strong>


                      <p>
                        {
                          effectiveSelectedService
                            .description ||
                          t.dashboard.serviceDetails
                        }
                      </p>


                      <span>
                        {t.dashboard.minimum}{" "}
                        {effectiveSelectedService.min.toLocaleString()}
                        {" · "}
                        {t.dashboard.maximum}{" "}
                        {effectiveSelectedService.max.toLocaleString()}
                      </span>

                    </div>
                  )}


                  {/* TARGET LINK */}

                  <label>
                    {t.dashboard.targetLink}

                    <input
                      type="url"
                      value={link}
                      onChange={(event) => {
                        setLink(
                          event.target.value,
                        );
                        setOrderRequestKey(
                          null,
                        );
                      }}
                      placeholder={
                        t.dashboard.insertLink
                      }
                      required
                      disabled={
                        !effectiveSelectedService ||
                        submitting
                      }
                    />
                  </label>


                  {/* QUANTITY */}

                  <label>
                    {t.dashboard.quantity}

                    <input
                      type="number"
                      value={
                        quantity || ""
                      }
                      onChange={(event) => {
                        setQuantity(
                          Number(
                            event.target.value,
                          ),
                        );

                        setOrderRequestKey(
                          null,
                        );
                      }}
                      min={
                        effectiveSelectedService?.min
                      }
                      max={
                        effectiveSelectedService?.max
                      }
                      required
                      disabled={
                        !effectiveSelectedService ||
                        submitting
                      }
                    />
                  </label>


                  {/* SUBMIT */}

                  <button
                    type="submit"
                    className="primary-btn full"
                    disabled={
                      submitting ||
                      !effectiveSelectedService
                    }
                  >
                    {submitting
                      ? t.dashboard.submitting
                      : t.dashboard.submitOrder}
                  </button>

                </>
              )}

            </form>


            {/* ORDER SUMMARY */}

            <aside className="summary-card">

              <p>
                {t.dashboard.orderSummary}
              </p>


              <h2>
                {effectiveSelectedService
                  ? effectiveSelectedService.name
                  : effectiveSelectedServiceType
                    ? `${effectiveSelectedPlatform} · ${effectiveSelectedServiceType}`
                    : effectiveSelectedPlatform ||
                    t.dashboard.chooseService}
              </h2>


              <div>

                <span>
                  {t.dashboard.rate}
                </span>

                <strong>
                  {effectiveSelectedService
                    ? `${money(
                      effectiveSelectedService.rate,
                    )} / 1K`
                    : "—"}
                </strong>

              </div>


              <div>

                <span>
                  {t.dashboard.estimatedPrice}
                </span>

                <strong>
                  {effectiveSelectedService
                    ? money(estimated)
                    : "—"}
                </strong>

              </div>


              <small>
                {t.dashboard.estimateOnly}
              </small>

            </aside>

          </section>
        )}


        {/* ========================= */}
        {/* ORDERS */}
        {/* ========================= */}

        {currentView === "orders" && (
          <section className="content-card">

            <div className="card-heading">

              <div>
                <p>
                  {t.dashboard.orderHistory}
                </p>

                <h2>
                  {t.dashboard.allOrders}
                </h2>
              </div>


              <button
                className="primary-btn compact"
                onClick={() =>
                  setView("new-order")
                }
              >
                {t.dashboard.newOrderButton}
              </button>

            </div>


            <OrdersTable
              orders={safeOrders}
              loading={loadingOrders}
              pending={ordersPending}
              title={
                t.dashboard.noOrdersYet
              }
              description={
                t.dashboard.ordersWillAppear
              }
              pendingTitle={
                t.dashboard.ordersIntegration
              }
              pendingText={
                t.dashboard.ordersIntegrationText
              }
              columns={{
                order:
                  t.dashboard.tableOrder,
                service:
                  t.dashboard.tableService,
                quantity:
                  t.dashboard.tableQuantity,
                charge:
                  t.dashboard.tableCharge,
                status:
                  t.dashboard.tableStatus,
              }}
            />

          </section>
        )}


        {/* ========================= */}
        {/* BALANCE */}
        {/* ========================= */}

        {currentView === "balance" && (
          <section className="balance-card">

            <p className="section-kicker">
              {t.dashboard.availableCredit}
            </p>

            <h2>
              {money(
                user?.balance ?? 0,
              )}
            </h2>

            <p>
              {t.dashboard.balancesLoaded}
            </p>

            <button
              className="secondary-btn"
              disabled
            >
              {t.dashboard.addFundsSoon}
            </button>

          </section>
        )}


        {/* ========================= */}
        {/* PROFILE */}
        {/* ========================= */}

        {currentView === "profile" && (
          <section className="content-card profile-grid">

            <ProfileField
              label={
                t.dashboard.firstName
              }
              value={
                user?.first_name ??
                t.dashboard.notProvided
              }
            />

            <ProfileField
              label={
                t.dashboard.telegramUsername
              }
              value={
                user?.username
                  ? `@${user.username}`
                  : t.dashboard.notProvided
              }
            />

            <ProfileField
              label={
                t.dashboard.telegramId
              }
              value={String(
                user?.telegram_id ?? "",
              )}
            />

            <ProfileField
              label={
                t.dashboard.accountId
              }
              value={String(
                user?.id ?? "",
              )}
            />

            <ProfileField
              label={
                t.dashboard.balanceTitle
              }
              value={money(
                user?.balance ?? 0,
              )}
            />

            <ProfileField
              label={
                t.dashboard.created
              }
              value={
                user?.created_at
                  ? new Date(
                    user.created_at,
                  ).toLocaleDateString()
                  : t.dashboard.notProvided
              }
            />

          </section>
        )}

      </main>
    </div>
  );
}


/* ================================================= */
/* STAT CARD                                         */
/* ================================================= */

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <article
      className={
        accent
          ? "stat-card accent"
          : "stat-card"
      }
    >
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}


/* ================================================= */
/* PROFILE FIELD                                     */
/* ================================================= */

function ProfileField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="profile-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}


/* ================================================= */
/* INTEGRATION PENDING                               */
/* ================================================= */

function IntegrationPending({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty-state">
      <span>◌</span>

      <h3>{title}</h3>

      <p>{description}</p>
    </div>
  );
}


/* ================================================= */
/* SERVICES GRID                                     */
/* ================================================= */

function ServicesGrid({
  services,
  loading,
  pending,
  onSelect,
  emptyTitle,
  emptyText,
  pendingTitle,
  pendingText,
}: {
  services: Service[];
  loading: boolean;
  pending: boolean;
  onSelect: (service: Service) => void;
  emptyTitle: string;
  emptyText: string;
  pendingTitle: string;
  pendingText: string;
}) {
  const safeServices = Array.isArray(services) ? services : [];

  if (loading) {
    return (
      <div className="skeleton large" />
    );
  }


  if (pending) {
    return (
      <IntegrationPending
        title={pendingTitle}
        description={pendingText}
      />
    );
  }


  if (!safeServices.length) {
    return (
      <div className="empty-state">

        <span>◈</span>

        <h3>
          {emptyTitle}
        </h3>

        <p>
          {emptyText}
        </p>

      </div>
    );
  }


  /*
   * Normalize all services.
   *
   * Public dashboard service cards now
   * use the same classification engine.
   */
  const normalized =
    normalizeServices(safeServices);


  /*
   * Group by platform.
   */
  const platformGroups =
    new Map<
      PlatformName,
      NormalizedService[]
    >();


  for (const service of normalized) {
    const existing =
      platformGroups.get(
        service.platform,
      ) ?? [];

    existing.push(service);

    platformGroups.set(
      service.platform,
      existing,
    );
  }


  /*
   * Keep only platforms that actually
   * contain services.
   */
  const groups = [
    ...platformGroups.entries(),
  ];


  return (
    <div>

      {groups.map(
        ([platform, platformServices]) => (
          <div
            key={platform}
            className="service-category"
          >

            <h3>
              {platform}
            </h3>


            <div className="service-grid">

              {platformServices.map(
                (service) => (
                  <button
                    type="button"
                    className="service-live-card"
                    key={String(
                      service.service,
                    )}
                    onClick={() =>
                      onSelect(service)
                    }
                  >

                    <span>
                      {service.name}
                    </span>


                    <strong>
                      {money(
                        service.rate,
                      )}

                      <small>
                        {" "}
                        / 1K
                      </small>
                    </strong>


                    <em>
                      {service.min.toLocaleString()}
                      –
                      {service.max.toLocaleString()}
                    </em>

                  </button>
                ),
              )}

            </div>

          </div>
        ),
      )}

    </div>
  );
}


/* ================================================= */
/* ORDERS TABLE                                      */
/* ================================================= */

function OrdersTable({
  orders,
  loading,
  pending,
  title,
  description,
  pendingTitle,
  pendingText,
  columns,
}: {
  orders: Order[];
  loading: boolean;
  pending: boolean;
  title: string;
  description: string;
  pendingTitle: string;
  pendingText: string;
  columns: {
    order: string;
    service: string;
    quantity: string;
    charge: string;
    status: string;
  };
}) {
  const safeOrders = Array.isArray(orders) ? orders : [];

  if (loading) {
    return (
      <div className="skeleton large" />
    );
  }


  if (pending) {
    return (
      <IntegrationPending
        title={pendingTitle}
        description={pendingText}
      />
    );
  }


  if (!safeOrders.length) {
    return (
      <div className="empty-state">

        <span>▤</span>

        <h3>
          {title}
        </h3>

        <p>
          {description}
        </p>

      </div>
    );
  }


  return (
    <div className="orders-table">

      <div className="table-head">
        <span>{columns.order}</span>
        <span>{columns.service}</span>
        <span>{columns.quantity}</span>
        <span>{columns.charge}</span>
        <span>{columns.status}</span>
      </div>


      {safeOrders.map((order) => (
        <div
          className="table-row"
          key={order.id}
        >

          <span>
            #{order.id}
          </span>

          <span>
            {order.service_id}
          </span>

          <span>
            {Number(
              order.quantity,
            ).toLocaleString()}
          </span>

          <span>
            {money(order.charge)}
          </span>

          <span className="status-pill">
            {order.status}
          </span>

        </div>
      ))}

    </div>
  );
}


/* ================================================= */
/* PAGE EXPORT                                       */
/* ================================================= */

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardApp />
    </ProtectedRoute>
  );
}