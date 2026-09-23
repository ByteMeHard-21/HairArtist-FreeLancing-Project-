"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, ArrowLeft, Check, Clock3, AlertCircle } from "lucide-react";
import { bookingConfig, dateRange, detailsSchema, formatDate, slotLabel, type AvailabilityResponse, type Booking, type Gender, type Slot } from "@/data/booking";
import { business, contactLinks } from "@/data/business";
import { ActionLink } from "./action-link";
import { ContactActions } from "./contact-actions";

const messages: Record<string, string> = {
  INVALID_ORIGIN: "Please reload this page and try again.",
  NOT_CONFIGURED: "Online booking is not available yet. Please call or WhatsApp David.",
  INVALID_DETAILS: "Please check your details and select a service.",
  INVALID_CODE: "That code is not valid. Please try again.",
  OTP_EXPIRED: "Your code has expired. Request a new code below.",
  OTP_ATTEMPTS: "Too many attempts. Request a new code after the resend timer.",
  VERIFY_BUSY: "Verification is already in progress. Please wait a moment.",
  RATE_LIMITED: "Please wait before trying again. Too many requests were made.",
  SLOT_UNAVAILABLE: "This time period is no longer available. Please choose another.",
  DATE_UNAVAILABLE: "The studio is unavailable on that date. Please choose another.",
  OTP_UNAVAILABLE: "SMS verification is currently unavailable. Please contact David.",
  SERVICE_UNAVAILABLE: "Reservations are temporarily unavailable. Please try again or contact David.",
};

export function BookingFlow({ initialDate }: { initialDate: string }) {
  const [step, setStep] = useState(1);
  const [date, setDate] = useState(initialDate);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  // Form state
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("men");
  const [mobile, setMobile] = useState("");
  const [service, setService] = useState("");

  // OTP state
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [expiresAt, setExpiresAt] = useState(0);
  const [now, setNow] = useState(0);

  // Booking state
  const [booking, setBooking] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const requestInFlight = useRef(false);

  // Focus heading on step change
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    heading.current?.focus();
  }, [step]);

  // Timer for OTP expiry
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  // Fetch availability when date changes
  useEffect(() => {
    if (step === 4) return;

    const controller = new AbortController();

    fetch("/api/booking/availability?date=" + date, {
      cache: "no-store",
      signal: controller.signal
    })
      .then(async response => {
        if (!response.ok) throw new Error("SERVICE_UNAVAILABLE");
        return response.json();
      })
      .then((data: AvailabilityResponse) => {
        setAvailability(data);
        setLoading(false);

        // If selected date changed, reset slot
        if (data.selectedDate !== date) {
          setDate(data.selectedDate);
          setSlot(null);
        }


      })
      .catch(err => {
        if (!controller.signal.aborted) {
          setAvailability(null);
          setLoading(false);
          setError(messages[err.message] || messages.SERVICE_UNAVAILABLE);
        }
      });

    return () => controller.abort();
  }, [date, refresh, step]);

  // Auto-refresh availability every 30 seconds when page is visible
  useEffect(() => {
    const refreshAvailability = () => {
      if (document.visibilityState === "visible") {
        setRefresh(v => v + 1);
      }
    };

    const timer = setInterval(refreshAvailability, 30000);
    window.addEventListener("focus", refreshAvailability);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refreshAvailability);
    };
  }, []);

  // Generic POST helper
  const post = useCallback(async (action: string, payload: unknown) => {
    const response = await fetch("/api/booking/" + action, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "SERVICE_UNAVAILABLE");
    return result;
  }, []);

  // Error handler
  function report(err: unknown) {
    const key = err instanceof Error ? err.message : "SERVICE_UNAVAILABLE";
    setError(messages[key] || messages.SERVICE_UNAVAILABLE);

    // If slot or date unavailable, go back to step 1
    if (key === "SLOT_UNAVAILABLE" || key === "DATE_UNAVAILABLE") {
      setStep(1);
      setSlot(null);
      setChallengeId("");
      setRefresh(v => v + 1);
    }
  }

  // Request OTP code
  async function requestCode(event?: FormEvent) {
    event?.preventDefault();

    if (requestInFlight.current || !slot) return;

    const details = detailsSchema.safeParse({
      date,
      start: slot.start,
      name,
      gender,
      mobile,
      service
    });

    if (!details.success) {
      setError(details.error.issues[0].message);
      return;
    }

    requestInFlight.current = true;
    setBusy(true);
    setError("");

    try {
      const result = await post("request-code", details.data);
      setChallengeId(result.challengeId);
      setExpiresAt(Date.parse(result.expiresAt));
      setResendAt(Date.now() + result.resendAfter * 1000);
      setNow(Date.now());
      setCode("");
      setStep(3); // Move to OTP verification
    } catch (err) {
      report(err);
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  }

  // Verify OTP and complete booking
  async function verify(event: FormEvent) {
    event.preventDefault();

    if (requestInFlight.current) return;

    requestInFlight.current = true;
    setBusy(true);
    setError("");

    try {
      const result = await post("verify", { challengeId, code });
      setBooking(result.booking);
      setStep(4); // Move to confirmation
    } catch (err) {
      report(err);
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  }

  // Check if selected slot is still available
  const selectedAvailable = !loading &&
    availability?.selectedDate === date &&
    availability.slots.some(s => s.start === slot?.start && s.remaining > 0);

  // Get dates to display
  const dates = availability?.dates || dateRange(initialDate).map(d => ({
    date: d,
    closed: true,
    reason: undefined
  }));

  // Step 1 needs a valid date/time only. Provider readiness is enforced by the verification API.
  const canContinueToDetails = Boolean(
    date &&
    slot &&
    selectedAvailable &&
    !busy &&
    !loading
  );

  // Can submit details form
  const canSubmitDetails = Boolean(
    name.trim().length >= 2 &&
    gender &&
    service &&
    mobile.length === 10 &&
    date &&
    slot &&
    selectedAvailable &&
    !busy
  );



  // Summary component
  const summary = (final = false) => (
    <dl className="booking-summary-list">
      <div>
        <dt>Date</dt>
        <dd>{formatDate(booking?.appointment_date || date, true)}</dd>
      </div>
      <div>
        <dt>Time window</dt>
        <dd>
          {booking
            ? slotLabel(booking.slot_start, booking.slot_end)
            : slot
              ? slotLabel(slot.start, slot.end)
              : "Select a time period"
          }
        </dd>
      </div>
      {(step > 1 || final) && (
        <>
          <div>
            <dt>Client name</dt>
            <dd>{booking?.customer_name || name || "Your name"}</dd>
          </div>
          <div>
            <dt>Service</dt>
            <dd>{booking?.service || service || "Select a service"}</dd>
          </div>
        </>
      )}
      <div>
        <dt>Stylist</dt>
        <dd>{business.artist}</dd>
      </div>
      <div>
        <dt>Studio location</dt>
        <dd>{business.address.join(" ")}</dd>
      </div>
      <div>
        <dt>Payment</dt>
        <dd>
          <span className="booking-payment">Pay at studio (No prepayment)</span>
        </dd>
      </div>
      {final && booking?.booking_reference && (
        <div>
          <dt>Booking ID</dt>
          <dd className="booking-reference">{booking.booking_reference}</dd>
        </div>
      )}
    </dl>
  );

  return (
    <main id="main" className="booking-page">
      <div className="booking-container">
        {/* Progress Indicator */}
        <ol className="booking-progress" aria-label="Booking progress">
          {["Date & time", "Details & summary", "Verify OTP"].map((label, i) => (
            <li
              key={label}
              aria-current={step === i + 1 ? "step" : undefined}
              className={step > i + 1 ? "complete" : ""}
            >
              <span>
                {step > i + 1 ? (
                  <Check size={12} aria-hidden="true" />
                ) : (
                  i + 1
                )}
              </span>
              <b>0{i + 1} {label}</b>
            </li>
          ))}
        </ol>

        {/* Header */}
        <header className="booking-heading">
          <p className="eyebrow">Bespoke hair artistry reservation</p>
          <h1 ref={heading} tabIndex={-1}>
            {step === 4 ? "Your Visit Is Confirmed" : "Book An Appointment"}
          </h1>
          <p>
            {step === 4
              ? "We look forward to seeing you at the studio."
              : "Select a date and hourly period. With a dedicated capacity of maximum 3 clients per hour, David provides focused personal attention to your hair."
            }
          </p>
        </header>

        {/* Announcements */}
        {availability?.announcements.map(notice => (
          <p className="booking-notice" key={notice}>{notice}</p>
        ))}

        {/* Service message */}
        {availability?.message && step !== 4 && (
          <div className="booking-notice" role="status">
            <p>{availability.message}</p>
            <ContactActions />
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="booking-error" role="alert">
            <AlertCircle size={20} />
            <p>{error}</p>
            {!availability && (
              <button
                className="booking-text-button"
                onClick={() => {
                  setLoading(true);
                  setError("");
                  setRefresh(v => v + 1);
                }}
              >
                Try again
              </button>
            )}
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && booking ? (
          <section className="booking-card booking-confirmation" aria-label="Confirmed appointment">
            <div className="booking-check">
              <Check size={48} aria-hidden="true" />
            </div>
            <p className="eyebrow">Appointment confirmed</p>
            <h2>{booking.booking_reference}</h2>
            <p className="booking-help">Keep this reference for your visit.</p>
            {summary(true)}
            <div className="booking-confirm-actions">
              <ActionLink href={contactLinks.directions}>
                Get directions <ArrowRight size={14} />
              </ActionLink>
              <ActionLink href={contactLinks.whatsapp} variant="outline">
                WhatsApp David
              </ActionLink>
            </div>
          </section>
        ) : (
          <div className="booking-layout">
            <div className="booking-primary">
              {/* STEP 1: Date and Time Selection */}
              {step === 1 && (
                <>
                  {/* Date Selection */}
                  <section className="booking-card" aria-labelledby="date-heading">
                    <div className="booking-card-heading">
                      <div>
                        <p className="eyebrow">Step 01</p>
                        <h2 id="date-heading">Select a Date</h2>
                      </div>
                      <span className="booking-help">Today + next 14 days</span>
                    </div>

                    <div
                      className="booking-dates"
                      aria-label="Available dates"
                      aria-busy={loading}
                    >
                      {dates.map(day => {
                        const d = new Date(day.date + "T00:00:00Z");
                        const isToday = day.date === (availability?.today || initialDate);

                        return (
                          <button
                            type="button"
                            key={day.date}
                            className={`booking-date ${date === day.date ? 'selected' : ''}`}
                            aria-pressed={date === day.date}
                            disabled={day.closed || loading}
                            title={day.reason || undefined}
                            onClick={() => {
                              if (day.date === date) return;
                              setDate(day.date);
                              setSlot(null);
                              setLoading(true);
                              setError("");
                            }}
                          >
                            <small>
                              {day.reason
                                ? "Leave"
                                : isToday
                                  ? "Today"
                                  : d.toLocaleString("en", {
                                    month: "short",
                                    timeZone: "UTC"
                                  })
                              }
                            </small>
                            <strong>{d.getUTCDate()}</strong>
                            <span>
                              {day.closed
                                ? "Closed"
                                : d.toLocaleString("en", {
                                  weekday: "short",
                                  timeZone: "UTC"
                                })
                              }
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <p className="booking-help booking-date-hint">
                      ↔ Scroll to view upcoming dates
                      <span>Selected: {formatDate(date, true)}</span>
                    </p>
                  </section>

                  {/* Time Slot Selection */}
                  <section className="booking-card" aria-labelledby="time-heading">
                    <div className="booking-card-heading">
                      <div>
                        <p className="eyebrow">Step 02</p>
                        <h2 id="time-heading">Select a Time Period</h2>
                      </div>
                      <p className="booking-legend">
                        <span className="legend-available">● Available</span>
                        <span className="legend-limited">● Limited</span>
                        <span className="legend-full">● Full</span>
                      </p>
                    </div>

                    {loading ? (
                      <p className="booking-loading" role="status">
                        <Clock3 className="animate-spin" size={20} />
                        Checking availability…
                      </p>
                    ) : availability?.slots.length ? (
                      <div className="booking-slots">
                        {availability.slots.map(time => {
                          const isSelected = slot?.start === time.start;
                          const isFull = time.remaining === 0;
                          const isLimited = time.remaining < 3 && time.remaining > 0;

                          return (
                            <button
                              type="button"
                              key={time.start}
                              className={`booking-slot ${isSelected ? 'selected' : ''} ${isFull ? 'full' : ''}`}
                              disabled={isFull || loading}
                              aria-pressed={isSelected}
                              aria-label={`${slotLabel(time.start, time.end)} - ${time.remaining === 0 ? "Full" : `${time.remaining} spots available`}`}
                              onClick={() => {
                                setSlot(time);
                                setError("");
                              }}
                            >
                              <span className="slot-time">
                                <strong>{slotLabel(time.start, time.end)}</strong>
                                <small>60-minute arrival window</small>
                              </span>
                              <span className={`slot-count ${isFull ? 'full' : isLimited ? 'limited' : 'available'}`}>
                                {isFull
                                  ? "Full"
                                  : time.remaining === 3
                                    ? "3 spots available"
                                    : time.remaining === 1
                                      ? "1 spot left"
                                      : "2 spots left"
                                }
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="booking-empty">
                        {dates.find(d => d.date === date)?.reason ||
                          "No bookable periods on this date. Please choose another day or contact David."}
                      </p>
                    )}

                    <p className="booking-time-note">
                      <Clock3 size={15} aria-hidden="true" />
                      Reservations represent your entry during this 60-minute window.
                      David personally paces every consultation and cut.
                    </p>
                  </section>
                </>
              )}

              {/* STEP 2: User Details */}
              {step === 2 && (
                <section className="booking-card">
                  <p className="eyebrow">Step 02</p>
                  <h2>Your Details</h2>
                  <p className="booking-help">
                    Enter your details. They will instantly update your reservation summary.
                  </p>

                  <form
                    id="booking-details"
                    className="booking-form"
                    onSubmit={requestCode}
                  >
                    <label>
                      Full name <span aria-hidden="true">*</span>
                      <input
                        required
                        autoComplete="name"
                        name="name"
                        minLength={2}
                        maxLength={100}
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Enter your full name"
                      />
                    </label>

                    <fieldset>
                      <legend>Gender <span aria-hidden="true">*</span></legend>
                      <div className="booking-genders">
                        {(["men", "women"] as const).map(value => (
                          <label
                            key={value}
                            className={`gender-option ${gender === value ? "selected" : ""}`}
                          >
                            <input
                              type="radio"
                              name="gender"
                              value={value}
                              checked={gender === value}
                              onChange={() => {
                                setGender(value);
                                setService("");
                              }}
                            />
                            <span>{value === "men" ? "Men" : "Women"}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <label>
                      Select service <span aria-hidden="true">*</span>
                      <select
                        required
                        value={service}
                        onChange={e => setService(e.target.value)}
                      >
                        <option value="">Choose your service</option>
                        {bookingConfig.services[gender].map(item => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                      <small>
                        Exact final pricing confirmed during personal consultation.
                      </small>
                    </label>

                    <label>
                      Mobile number (for OTP verification) <span aria-hidden="true">*</span>
                      <span className="booking-phone">
                        <span className="country-code">
                          IN<br />+91
                        </span>
                        <input
                          required
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          name="mobile"
                          pattern="[6-9][0-9]{9}"
                          maxLength={10}
                          value={mobile}
                          onChange={e => setMobile(
                            e.target.value.replace(/\D/g, "").slice(0, 10)
                          )}
                          aria-label="10-digit Indian mobile number"
                          placeholder="98765 43210"
                        />
                      </span>
                      <small>
                        A 6-digit SMS verification code will be sent to this number. By verifying, you agree to receive your appointment confirmation on WhatsApp.
                      </small>
                    </label>

                    <div className="booking-form-actions">
                      <button
                        type="button"
                        className="booking-button booking-button--outline"
                        disabled={busy}
                        onClick={() => {
                          setStep(1);
                          setError("");
                        }}
                      >
                        <ArrowLeft size={13} /> Back to date & time
                      </button>
                      <button
                        type="submit"
                        className="booking-button"
                        disabled={busy || !canSubmitDetails}
                      >
                        {busy ? "Sending code…" : "Verify & Book"}
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </form>
                </section>
              )}

              {/* STEP 3: OTP Verification */}
              {step === 3 && (
                <section className="booking-card">
                  <p className="eyebrow">Step 03</p>
                  <h2>Verify Your Mobile</h2>
                  <p className="booking-help">
                    Enter the 6-digit SMS code sent to +91 ••••••{mobile.slice(-4)}.
                  </p>

                  <form className="booking-form" onSubmit={verify}>
                    <label>
                      Verification code
                      <input
                        className="booking-otp"
                        autoFocus
                        required
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        value={code}
                        onChange={e => setCode(
                          e.target.value.replace(/\D/g, "").slice(0, 6)
                        )}
                        placeholder="000000"
                      />
                    </label>

                    <p className="booking-help" role="status">
                      {expiresAt <= now
                        ? "Your code has expired. Please request a new one."
                        : "Your place is confirmed only after successful verification. Availability is checked again when you confirm."
                      }
                    </p>

                    <button
                      className="booking-button"
                      disabled={busy || code.length !== 6 || expiresAt <= now}
                    >
                      {busy ? "Verifying…" : "Confirm appointment"}
                      <ArrowRight size={14} />
                    </button>

                    <div className="booking-form-actions">
                      <button
                        className="booking-text-button"
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setStep(2);
                          setError("");
                        }}
                      >
                        ← Edit details
                      </button>
                      <button
                        type="button"
                        className="booking-text-button"
                        disabled={busy || now < resendAt}
                        onClick={requestCode}
                      >
                        {now < resendAt
                          ? "Resend in " + Math.ceil((resendAt - now) / 1000) + "s"
                          : "Resend code"
                        }
                      </button>
                    </div>
                  </form>
                </section>
              )}
            </div>

            {/* Summary Sidebar */}
            <aside
              className="booking-card booking-summary"
              aria-labelledby="summary-heading"
            >
              <div className="booking-card-heading">
                <div>
                  <p className="eyebrow">
                    {step === 1 ? "Summary" : "Live summary"}
                  </p>
                  <h2 id="summary-heading">
                    {step === 1 ? "Your Reservation" : "Your Appointment"}
                  </h2>
                </div>
                {step > 1 && step < 4 && (
                  <span className="booking-tag">Pre-booking</span>
                )}
              </div>

              {summary()}

              {/* Step 1: Continue button */}
              {step === 1 && (
                <button
                  className="booking-button"
                  disabled={!canContinueToDetails}
                  onClick={() => {

                    setStep(2);
                    setError("");
                  }}
                >
                  Continue to details <ArrowRight size={14} />
                </button>
              )}

              {/* Step 2: Submit button */}
              {step === 2 && (
                <button
                  type="submit"
                  form="booking-details"
                  className="booking-button"
                  disabled={busy || !canSubmitDetails}
                >
                  {busy ? "Sending code…" : "Verify & Book"}
                  <ArrowRight size={14} />
                </button>
              )}

              <p className="booking-help booking-summary-note">
                {step === 3
                  ? "The slot is not held while you verify. No payment is taken online."
                  : "No account or password required. Verification is via SMS OTP. No credit card required."
                }
              </p>

              {!selectedAvailable && slot && step !== 3 && (
                <p className="booking-error" role="status">
                  This period is no longer available. Please return to date & time.
                </p>
              )}
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}