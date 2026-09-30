"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { formatPrice } from "@/data/services";
import { groomServiceId, menuCategoriesFor, type ManagedMenuService } from "@/lib/menu-services";
import { AdminLogout, adminRequest } from "./admin-auth";

type Draft = { name: string; category: string; audience: "men" | "women" | "groom"; price: string; visible: boolean };
const emptyDraft: Draft = { name: "", category: "Haircut", audience: "men", price: "", visible: true };
const audienceName = { men: "Men", women: "Women", groom: "Groom" } as const;

function errorText(error: unknown) { return error instanceof Error ? error.message : "Unable to save this service."; }

export function AdminMenu({ initialServices, initialError = "" }: { initialServices: ManagedMenuService[]; initialError?: string }) {
  const editor = useRef<HTMLElement>(null);
  const [services, setServices] = useState(initialServices);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState(initialError);
  const [filter, setFilter] = useState<"all" | Draft["audience"]>("all");
  const [search, setSearch] = useState("");
  const isGroom = editingId === groomServiceId;

  const editable = services.filter(service => service.audiences.length === 1 && !service.audiences.includes("children") && (service.name + " " + service.category).toLowerCase().includes(search.toLowerCase()));
  const groups = (["men", "women", "groom"] as const).filter(audience => filter === "all" || audience === filter);

  function beginCreate() { setEditingId(null); setDraft(emptyDraft); setError(""); }
  function beginEdit(service: ManagedMenuService) {
    const audience = service.audiences[0];
    if (audience !== "men" && audience !== "women" && audience !== "groom") return;
    setEditingId(service.id);
    setDraft({ name: service.name, category: service.category, audience, price: String(service.price ?? ""), visible: !service.isHidden && service.status === "confirmed" });
    setError(""); setNotice("");
    editor.current?.scrollIntoView({ block: "start" });
    editor.current?.focus({ preventScroll: true });
  }

  async function refresh() {
    setBusy(true); setError("");
    try {
      const result = await adminRequest("services") as { services: ManagedMenuService[] };
      setServices(result.services); setLoadError(""); setNotice("Service catalogue refreshed.");
    } catch (err) { setLoadError(errorText(err)); } finally { setBusy(false); }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const price = Number(draft.price);
    if (!draft.price.trim() || !Number.isInteger(price) || price < 0 || price > 200000) { setError("Enter a whole-number price from ₹0 to ₹2,00,000."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const payload = { ...draft, name: draft.name.trim(), category: draft.category.trim(), price };
      const result = await adminRequest(editingId ? "service-update" : "service-create", editingId ? { id: editingId, ...payload } : payload) as { service: ManagedMenuService };
      setServices(current => {
        const found = current.some(service => service.id === result.service.id);
        return (found ? current.map(service => service.id === result.service.id ? result.service : service) : [...current, result.service])
          .toSorted((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
      });
      setNotice(draft.visible ? "Service saved. Visitors will see the update when they open or refresh the menu." : "Service saved and hidden from the public menu.");
      beginCreate();
    } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  }

  return <main id="main" className="admin-page"><div className="booking-container">
    <header className="admin-heading"><div><Link href="/admin" className="wordmark"><span>JIAA STUDIO</span></Link><p className="eyebrow">Studio management</p></div><div className="admin-account"><span>David</span><AdminLogout /></div></header>
    <nav className="admin-tabs" aria-label="Studio navigation"><Link href="/admin">Appointments</Link><Link href="/admin/availability">Availability</Link><Link href="/admin/menu" aria-current="page">Service menu</Link></nav>
    {loadError && <p className="booking-error" role="alert">{loadError}</p>}{notice && <p className="booking-notice" role="status">{notice}</p>}
    <div className="admin-menu-layout">
      <section ref={editor} tabIndex={-1} className="booking-card admin-service-editor" aria-labelledby="service-editor-title">
        <p className="eyebrow">{editingId ? "Edit service" : "New service"}</p><h1 id="service-editor-title">{editingId ? "Update menu service" : "Add a menu service"}</h1>
        <p className="booking-help">Saved services appear on the full menu. Prices for the featured homepage services update too; new services do not add extra homepage cards.</p>
        {error && <p className="booking-error" role="alert">{error}</p>}
        <form className="booking-form admin-form" onSubmit={save}>
          <fieldset disabled={busy || Boolean(loadError)} className="admin-service-form-fields">
          <label>Service name<input disabled={isGroom} required minLength={2} maxLength={100} value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} placeholder="e.g. Textured Crop" /></label>
          <label>Menu category<input disabled={isGroom} list="menu-category-options" required minLength={2} maxLength={60} value={draft.category} onChange={event => setDraft(current => ({ ...current, category: event.target.value }))} placeholder="e.g. Haircut" /></label>
          <datalist id="menu-category-options">{menuCategoriesFor(services.filter(service => service.audiences.includes(draft.audience))).map(category => <option key={category} value={category} />)}</datalist>
          <div className="admin-service-fields"><label>For<select disabled={isGroom} value={draft.audience} onChange={event => setDraft(current => ({ ...current, audience: event.target.value as Draft["audience"] }))}><option value="men">Men</option><option value="women">Women</option>{isGroom && <option value="groom">Groom</option>}</select></label><label>Price (₹)<input required type="number" min="0" max="200000" step="1" inputMode="numeric" value={draft.price} onChange={event => setDraft(current => ({ ...current, price: event.target.value }))} /></label></div>
          <label className="admin-check"><input type="checkbox" checked={draft.visible} onChange={event => setDraft(current => ({ ...current, visible: event.target.checked }))} />Visible on the public menu</label>
          <div className="admin-service-actions"><button className="booking-button" disabled={busy}>{busy ? "Saving…" : editingId ? "Save service" : "Add service"}</button>{editingId && <button type="button" className="booking-button booking-button--outline" disabled={busy} onClick={beginCreate}>Cancel edit</button>}</div>
          </fieldset>
        </form>
      </section>
      <section className="booking-card admin-service-list" aria-labelledby="service-list-title">
        <div className="booking-card-heading"><div><p className="eyebrow">Published catalogue</p><h2 id="service-list-title">Services & prices</h2></div><button type="button" className="booking-text-button" disabled={busy} onClick={refresh}>Refresh</button></div>
        <p className="booking-help">Add or edit Men&apos;s and Women&apos;s services, or update the Groom package price. Hidden services remain saved for later.</p>
        <div className="admin-service-fields booking-form"><label>Show<select value={filter} onChange={event => setFilter(event.target.value as typeof filter)}><option value="all">All services</option>{(["men", "women", "groom"] as const).map(audience => <option key={audience} value={audience}>{audienceName[audience]}</option>)}</select></label><label>Search services<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Name or category" /></label></div>
        {groups.map(audience => <section className="admin-service-group" key={audience} aria-labelledby={`admin-services-${audience}`}><h3 id={`admin-services-${audience}`}>{audienceName[audience]}</h3>{editable.filter(service => service.audiences[0] === audience).map(service => <article className="admin-service-row" key={service.id}>
          <div><strong>{service.name}</strong><span>{service.category} · {service.price === null ? "Price to be confirmed" : formatPrice(service.price)}{service.isHidden ? " · Hidden" : ""}{service.isCustom ? " · Added" : ""}</span></div><button type="button" className="booking-text-button" aria-label={`Edit ${audienceName[audience]} ${service.name}`} disabled={busy || Boolean(loadError)} onClick={() => beginEdit(service)}>Edit</button>
        </article>)}{!editable.some(service => service.audiences[0] === audience) && <p className="booking-empty">No services added.</p>}</section>)}
      </section>
    </div>
  </div></main>;
}
