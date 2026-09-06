import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Menu, X, Heart, Search, Phone, Mail, MapPin, Check, Star,
  ChevronDown, SlidersHorizontal, Fuel, Gauge, ShieldCheck,
  Users, Car, Calendar, Clock, ChevronLeft, ChevronRight, ZoomIn, Bell,
  MessageCircle, Send
} from "lucide-react";

const NGN_RATE = 1550;

const API_BASE = "https://mk-motors-backend.onrender.com";

const api = {
  live: () => Boolean(API_BASE),
  vehicles: () => fetch(`${API_BASE}/api/vehicles`).then((r) => r.json()),
  settings: () => fetch(`${API_BASE}/api/settings`).then((r) => r.json()),
  login: (password) =>
    fetch(`${API_BASE}/api/admin/login`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }),
    }).then(async (r) => { if (!r.ok) throw new Error((await r.json()).error || "Login failed"); return r.json(); }),
  createVehicle: (token, vehicle) =>
    fetch(`${API_BASE}/api/vehicles`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(vehicle),
    }).then(async (r) => { if (!r.ok) throw new Error((await r.json()).error || "Could not add vehicle"); return r.json(); }),
  updateVehicle: (token, id, fields) =>
    fetch(`${API_BASE}/api/vehicles/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(fields),
    }).then(async (r) => { if (!r.ok) throw new Error((await r.json()).error || "Update failed"); return r.json(); }),
  addVehicleImageUrl: (token, id, url) =>
    fetch(`${API_BASE}/api/vehicles/${id}/images/url`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ url }),
    }).then(async (r) => { if (!r.ok) throw new Error((await r.json()).error || "Could not add photo"); return r.json(); }),
  uploadVehicleImage: (token, id, file) => {
    const form = new FormData();
    form.append("photo", file);
    return fetch(`${API_BASE}/api/vehicles/${id}/images`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form,
    }).then(async (r) => { if (!r.ok) throw new Error((await r.json()).error || "Upload failed"); return r.json(); });
  },
  removeVehicleImage: (token, id, imageIndex, imageId) =>
    fetch(`${API_BASE}/api/vehicles/${id}/images/${imageId}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    }).then((r) => { if (!r.ok && r.status !== 204) throw new Error("Could not remove photo"); return r; }),
  setSettingUrl: (token, key, value) =>
    fetch(`${API_BASE}/api/settings/${key}`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ value }),
    }).then(async (r) => { if (!r.ok) throw new Error((await r.json()).error || "Could not save"); return r.json(); }),
  uploadSettingImage: (token, key, file) => {
    const form = new FormData();
    form.append("photo", file);
    return fetch(`${API_BASE}/api/settings/${key}/image`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form,
    }).then(async (r) => { if (!r.ok) throw new Error((await r.json()).error || "Upload failed"); return r.json(); });
  },
  submitLead: (type, payload) =>
    fetch(`${API_BASE}/api/leads/${type}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    }).then(async (r) => { if (!r.ok) throw new Error((await r.json()).error || "Submission failed"); return r.json(); }),
  subscribe: (email) =>
    fetch(`${API_BASE}/api/subscribers`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
    }).then(async (r) => { if (!r.ok) throw new Error((await r.json()).error || "Subscription failed"); return r.json(); }),
  identifyPhoto: (token, file) => {
    const form = new FormData();
    form.append("photo", file);
    return fetch(`${API_BASE}/api/vision/identify`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form,
    }).then(async (r) => { if (!r.ok) throw new Error((await r.json()).error || "Could not identify photo"); return r.json(); });
  },
};

function resolveUrl(u) {
  if (!u) return u;
  return u.startsWith("/uploads") ? `${API_BASE}${u}` : u;
}
function imgSrc(entry) { return typeof entry === "string" ? entry : entry?.url; }
function imgId(entry) { return typeof entry === "string" ? null : entry?.id; }

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const VEHICLES = [
  { id: "v1", year: 2022, make: "Toyota", model: "Camry", trim: "SE", bodyType: "Sedan", price: 22900, mileage: 48200, engine: "2.5L 4-Cyl", transmission: "Automatic", fuelType: "Gasoline", exteriorColor: "Midnight Blue", interiorColor: "Charcoal Cloth", description: "A well-kept Camry SE with a clean service history and no reported accidents. Comfortable for daily commuting with strong fuel economy.", images: [] },
  { id: "v2", year: 2021, make: "Honda", model: "CR-V", trim: "EX", bodyType: "SUV", price: 24500, mileage: 52400, engine: "1.5L Turbo 4-Cyl", transmission: "Automatic", fuelType: "Gasoline", exteriorColor: "Silver", interiorColor: "Black Cloth", description: "Spacious and dependable, this CR-V EX comes with all-wheel drive and a full inspection report on file.", images: [] },
  { id: "v3", year: 2023, make: "Hyundai", model: "Elantra", trim: "SEL", bodyType: "Sedan", price: 19900, mileage: 31800, engine: "2.0L 4-Cyl", transmission: "Automatic", fuelType: "Gasoline", exteriorColor: "Pearl White", interiorColor: "Gray Cloth", description: "Low mileage and still under factory warranty. A practical, efficient choice for a first car or daily driver.", images: [] },
  { id: "v4", year: 2022, make: "Toyota", model: "RAV4", trim: "LE", bodyType: "SUV", price: 25700, mileage: 40600, engine: "2.5L 4-Cyl", transmission: "Automatic", fuelType: "Gasoline", exteriorColor: "Magnetic Gray", interiorColor: "Black Fabric", description: "One-owner RAV4 with a clean title and up-to-date maintenance records. Great for families needing extra cargo room.", images: [] },
  { id: "v5", year: 2020, make: "Honda", model: "Accord", trim: "LX", bodyType: "Sedan", price: 20400, mileage: 61200, engine: "1.5L Turbo 4-Cyl", transmission: "Automatic", fuelType: "Gasoline", exteriorColor: "Modern Steel", interiorColor: "Black Cloth", description: "A reliable Accord priced to move, inspected and reconditioned before listing. Smooth highway ride.", images: [] },
  { id: "v6", year: 2021, make: "Ford", model: "Explorer", trim: "XLT", bodyType: "SUV", price: 27900, mileage: 55700, engine: "2.3L Turbo 4-Cyl", transmission: "Automatic", fuelType: "Gasoline", exteriorColor: "Agate Black", interiorColor: "Ebony Cloth", description: "Three-row seating and a recent brake service. Ideal for larger families who need the extra space.", images: [] },
  { id: "v7", year: 2023, make: "Kia", model: "Forte", trim: "LXS", bodyType: "Sedan", price: 18600, mileage: 21300, engine: "2.0L 4-Cyl", transmission: "Automatic", fuelType: "Gasoline", exteriorColor: "Snow White Pearl", interiorColor: "Black Cloth", description: "Nearly new with remaining factory coverage. A budget-friendly, low-mileage option.", images: [] },
  { id: "v8", year: 2019, make: "Ford", model: "F-150", trim: "XLT", bodyType: "Truck", price: 26300, mileage: 67500, engine: "3.3L V6", transmission: "Automatic", fuelType: "Gasoline", exteriorColor: "Oxford White", interiorColor: "Medium Earth Gray", description: "A capable work truck with a bed liner and tow package already installed.", images: [] },
  { id: "v9", year: 2022, make: "Honda", model: "Civic", trim: "Sport", bodyType: "Hatchback", price: 21200, mileage: 29800, engine: "2.0L 4-Cyl", transmission: "Manual", fuelType: "Gasoline", exteriorColor: "Rallye Red", interiorColor: "Black Cloth", description: "A fun-to-drive Civic Sport with a manual transmission, kept in excellent condition by its previous owner.", images: [] },
];

const REVIEWS = [
  { name: "James A.", text: "Everything was straightforward from start to finish. I found the car I wanted without feeling pressured." },
  { name: "Sarah M.", text: "I appreciated how clearly everything was explained. The whole process was easy." },
  { name: "David K.", text: "Great selection and friendly service. Would buy from MK Motors again." },
  { name: "Priya N.", text: "They walked me through financing options without any pressure to pick one on the spot." },
];

function useReveal() {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setInView(true)),
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView];
}

function Reveal({ children, className = "" }) {
  const [ref, inView] = useReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"} ${className}`}
    >
      {children}
    </div>
  );
}

function money(n, currency) {
  if (currency === "NGN") {
    return "₦" + Math.round(n * NGN_RATE).toLocaleString();
  }
  return "$" + n.toLocaleString();
}

function CarArt({ bodyType, className = "" }) {
  const paths = {
    Sedan: "M20 62c2-14 14-24 30-24h30c10 0 16 4 24 12l10 8h20c8 0 14 6 14 12v6c0 4-2 6-6 6H22c-4 0-6-2-6-6V62z",
    SUV: "M18 60c1-20 12-32 32-32h56c12 0 18 4 26 14l8 10h22c8 0 14 6 14 12v6c0 4-2 6-6 6H24c-4 0-6-2-6-6V60z",
    Truck: "M14 62c1-16 10-26 26-26h30c9 0 14 3 20 10l8 10h4V40c0-4 3-7 7-7h30c5 0 9 3 11 8l8 15c3 0 5 3 5 6v6c0 4-2 6-6 6H20c-4 0-6-2-6-6V62z",
    Hatchback: "M26 60c2-14 13-22 28-22h40c9 0 14 3 20 10l10 12h14c7 0 12 5 12 11v4c0 4-2 6-6 6H30c-4 0-6-2-6-6V60z",
    Van: "M16 60c1-22 10-34 30-34h74c8 0 14 6 14 14v20h4c8 0 14 6 14 6v6c0 4-2 6-6 6H22c-4 0-6-2-6-6V60z",
  };
  const path = paths[bodyType] || paths.Sedan;
  return (
    <svg viewBox="0 0 200 90" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d={path} fill="#0F2A4A" opacity="0.06" />
      <path d={path} fill="none" stroke="#0F2A4A" strokeWidth="2.2" />
      <circle cx="52" cy="76" r="12" fill="#0F2A4A" />
      <circle cx="52" cy="76" r="5" fill="#F7F8FA" />
      <circle cx="140" cy="76" r="12" fill="#0F2A4A" />
      <circle cx="140" cy="76" r="5" fill="#F7F8FA" />
    </svg>
  );
}

function VehicleImage({ vehicle, index = 0, className = "", fallbackClassName = "w-4/5 h-4/5" }) {
  const [errored, setErrored] = useState(false);
  const raw = vehicle.images && vehicle.images[index];
  const url = raw ? resolveUrl(imgSrc(raw)) : null;

  if (!url || errored) {
    return <CarArt bodyType={vehicle.bodyType} className={fallbackClassName} />;
  }
  return (
    <img
      src={url}
      alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
      loading="lazy"
      onError={() => setErrored(true)}
      className={`${className} object-cover`}
    />
  );
}

function VehicleCard({ v, favorites, toggleFav, onView, currency }) {
  const isFav = favorites.has(v.id);
  return (
    <div className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
      <div className="relative bg-gray-50 h-40 flex items-center justify-center overflow-hidden">
        <VehicleImage vehicle={v} className="w-full h-full transition-transform duration-500 group-hover:scale-105" />
        <button
          onClick={() => toggleFav(v.id)}
          aria-label={isFav ? "Remove from favorites" : "Save to favorites"}
          aria-pressed={isFav}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
        >
          <Heart size={17} className={isFav ? "fill-blue-600 text-blue-600" : "text-gray-400"} />
        </button>
        <span className="absolute top-3 left-3 text-xs font-medium bg-white/90 text-gray-700 px-2.5 py-1 rounded-full">{v.bodyType}</span>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 text-base leading-tight">{v.year} {v.make} {v.model}</h3>
        <p className="text-sm text-gray-500 mb-3">{v.trim}</p>
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
          <span className="flex items-center gap-1"><Gauge size={13} />{v.mileage.toLocaleString()} mi</span>
          <span className="flex items-center gap-1"><Fuel size={13} />{v.transmission}</span>
        </div>
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="font-semibold text-gray-900">{money(v.price, currency)}</span>
          <button
            onClick={() => onView(v.id)}
            className="text-sm font-medium text-blue-700 hover:text-blue-800 transition-colors"
          >
            View details
          </button>
        </div>
      </div>
    </div>
  );
}

function FinancingCalculator({ defaultPrice = 24000, currency }) {
  const [price, setPrice] = useState(defaultPrice);
  const [down, setDown] = useState(Math.round(defaultPrice * 0.1));
  const [term, setTerm] = useState(60);
  const [rate, setRate] = useState(7.5);

  const monthly = useMemo(() => {
    const principal = Math.max(price - down, 0);
    const r = rate / 100 / 12;
    if (r === 0) return principal / term;
    return (principal * r) / (1 - Math.pow(1 + r, -term));
  }, [price, down, term, rate]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-1">Estimate your monthly payment</h3>
      <p className="text-sm text-gray-500 mb-5">Adjust the numbers to see how the payment changes.</p>
      <div className="grid grid-cols-2 gap-4 mb-5">
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Vehicle price</span>
          <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </label>
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Down payment</span>
          <input type="number" value={down} onChange={(e) => setDown(Number(e.target.value) || 0)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </label>
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Loan term (months)</span>
          <select value={term} onChange={(e) => setTerm(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            {[36, 48, 60, 72].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Estimated interest rate (%)</span>
          <input type="number" step="0.1" value={rate} onChange={(e) => setRate(Number(e.target.value) || 0)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </label>
      </div>
      <div className="bg-blue-50 rounded-lg p-4 flex items-center justify-between">
        <span className="text-sm text-gray-700">Estimated monthly payment</span>
        <span className="text-xl font-semibold text-blue-900">{money(Math.round(monthly), currency)}/mo</span>
      </div>
      <p className="text-xs text-gray-400 mt-3">This is only an estimate. Actual financing terms depend on credit approval and lender.</p>
    </div>
  );
}

function TestDriveModal({ open, onClose, vehicle }) {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", date: "", time: "", message: "" });

  useEffect(() => { if (open) setSubmitted(false); }, [open]);

  if (!open) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-6" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto animate-[fadeUp_0.3s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg text-gray-900">Schedule a test drive</h3>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700 transition-colors"><X size={20} /></button>
        </div>

        {submitted ? (
          <div className="text-center py-8 animate-[fadeUp_0.4s_ease]">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-4">
              <Check size={22} />
            </div>
            <p className="font-medium text-gray-900 mb-1">Request sent</p>
            <p className="text-sm text-gray-500">A team member will confirm your test drive shortly.</p>
            <button onClick={onClose} className="mt-5 text-sm font-medium text-blue-700 hover:text-blue-800">Close</button>
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (api.live()) {
                try {
                  await api.submitLead("test-drive", { ...form, vehicleId: vehicle?.id });
                } catch {
                }
              }
              setSubmitted(true);
            }}
            className="space-y-3"
          >
            {vehicle && (
              <div className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-600">
                Vehicle: <span className="font-medium text-gray-900">{vehicle.year} {vehicle.make} {vehicle.model}</span>
              </div>
            )}
            <Field label="Full name" required value={form.name} onChange={set("name")} />
            <Field label="Email" type="email" required value={form.email} onChange={set("email")} />
            <Field label="Phone" type="tel" required value={form.phone} onChange={set("phone")} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Preferred date" type="date" required value={form.date} onChange={set("date")} />
              <Field label="Preferred time" type="time" required value={form.time} onChange={set("time")} />
            </div>
            <label className="block text-sm">
              <span className="block text-gray-600 mb-1">Message (optional)</span>
              <textarea value={form.message} onChange={set("message")} rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </label>
            <button type="submit" className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg py-2.5 transition-colors mt-2">
              Request test drive
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, type = "text", ...props }) {
  return (
    <label className="block text-sm">
      <span className="block text-gray-600 mb-1">{label}</span>
      <input type={type} {...props}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
    </label>
  );
}

function Header({ view, setView, currency, setCurrency, mobileOpen, setMobileOpen, scrolled }) {
  const links = [
    { id: "home", label: "Home" },
    { id: "inventory", label: "Inventory" },
    { id: "services", label: "Services" },
    { id: "about", label: "About Us" },
    { id: "contact", label: "Contact" },
  ];
  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/90 backdrop-blur-md shadow-sm" : "bg-white"} border-b border-gray-100`}>
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <button onClick={() => setView("home")} className="flex items-center gap-2 font-bold text-lg text-slate-900">
          <span className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center text-sm">MK</span>
          MK MOTORS
        </button>

        <nav className="hidden md:flex items-center gap-7">
          {links.map((l) => (
            <button
              key={l.id}
              onClick={() => setView(l.id)}
              className={`text-sm font-medium transition-colors relative pb-1 ${view === l.id ? "text-blue-700" : "text-gray-600 hover:text-gray-900"}`}
            >
              {l.label}
              {view === l.id && <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-blue-700 rounded-full" />}
            </button>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => setView("manage")}
            className="text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
            title="Edit prices and photos"
          >
            Manage Inventory
          </button>
          <button
            onClick={() => setCurrency(currency === "USD" ? "NGN" : "USD")}
            className="text-xs font-medium border border-gray-200 rounded-full px-3 py-1.5 text-gray-600 hover:border-gray-300 transition-colors"
          >
            {currency === "USD" ? "$ USD" : "₦ NGN"}
          </button>
          <button onClick={() => setView("inventory")} className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Find a Car
          </button>
        </div>

        <button className="md:hidden text-gray-700" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div className={`md:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? "max-h-96" : "max-h-0"}`}>
        <div className="px-5 pb-4 flex flex-col gap-1 border-t border-gray-100 pt-3">
          {links.map((l) => (
            <button key={l.id} onClick={() => { setView(l.id); setMobileOpen(false); }}
              className={`text-left py-2.5 text-sm font-medium ${view === l.id ? "text-blue-700" : "text-gray-700"}`}>
              {l.label}
            </button>
          ))}
          <button onClick={() => { setView("manage"); setMobileOpen(false); }}
            className="text-left py-2.5 text-sm font-medium text-gray-500">
            Manage Inventory
          </button>
          <button onClick={() => { setView("inventory"); setMobileOpen(false); }} className="mt-2 bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg">
            Find a Car
          </button>
        </div>
      </div>
    </header>
  );
}

function Hero({ setView, heroImage }) {
  return (
    <section className="pt-32 pb-16 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto px-5 grid md:grid-cols-2 gap-10 items-center">
        <div className="animate-[fadeUp_0.6s_ease]">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight mb-4">Find your next car.</h1>
          <p className="text-gray-600 text-lg mb-6 max-w-md">Quality vehicles, transparent prices, and a dealership you can trust.</p>
          <div className="flex flex-wrap gap-3 mb-6">
            <button onClick={() => setView("inventory")} className="bg-blue-700 hover:bg-blue-800 text-white font-medium px-6 py-3 rounded-lg transition-colors">
              Browse Inventory
            </button>
            <button onClick={() => setView("contact")} className="border border-gray-300 hover:border-gray-400 text-gray-800 font-medium px-6 py-3 rounded-lg transition-colors">
              Contact Us
            </button>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-1.5"><Check size={15} className="text-blue-700" /> Quality Checked</li>
            <li className="flex items-center gap-1.5"><Check size={15} className="text-blue-700" /> Transparent Pricing</li>
            <li className="flex items-center gap-1.5"><Check size={15} className="text-blue-700" /> Flexible Financing</li>
          </ul>
        </div>
        <div className="animate-[fadeUp_0.7s_ease] rounded-2xl border border-gray-200 shadow-sm overflow-hidden aspect-square sm:aspect-video">
          {heroImage ? (
            <img src={resolveUrl(heroImage)} alt="Featured vehicle" className="w-full h-full object-cover object-center" />
          ) : (
            <div className="w-full h-full bg-white flex items-center justify-center p-10">
              <CarArt bodyType="SUV" className="w-full h-full" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SearchPanel({ setView, quickSearch, setQuickSearch }) {
  return (
    <section className="max-w-5xl mx-auto px-5 -mt-8 relative z-10">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Find the right car for you</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <select className="col-span-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={quickSearch.make} onChange={(e) => setQuickSearch((q) => ({ ...q, make: e.target.value }))}>
            <option value="">Make</option>
            {[...new Set(VEHICLES.map((v) => v.make))].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={quickSearch.bodyType} onChange={(e) => setQuickSearch((q) => ({ ...q, bodyType: e.target.value }))}>
            <option value="">Body Type</option>
            {[...new Set(VEHICLES.map((v) => v.bodyType))].map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={quickSearch.year} onChange={(e) => setQuickSearch((q) => ({ ...q, year: e.target.value }))}>
            <option value="">Year</option>
            {[...new Set(VEHICLES.map((v) => v.year))].sort((a, b) => b - a).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={quickSearch.maxPrice} onChange={(e) => setQuickSearch((q) => ({ ...q, maxPrice: e.target.value }))}>
            <option value="">Max price</option>
            <option value="20000">Under $20,000</option>
            <option value="25000">Under $25,000</option>
            <option value="30000">Under $30,000</option>
          </select>
          <select className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={quickSearch.transmission} onChange={(e) => setQuickSearch((q) => ({ ...q, transmission: e.target.value }))}>
            <option value="">Transmission</option>
            <option value="Automatic">Automatic</option>
            <option value="Manual">Manual</option>
          </select>
          <button onClick={() => setView("inventory")} className="bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg py-2.5 text-sm transition-colors flex items-center justify-center gap-1.5">
            <Search size={15} /> Search Cars
          </button>
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  const items = [
    { icon: ShieldCheck, title: "Quality Checked", text: "Every vehicle is inspected before being listed." },
    { icon: Check, title: "Transparent Pricing", text: "No confusing pricing or unnecessary surprises." },
    { icon: Car, title: "Flexible Financing", text: "Simple financing options for different budgets." },
    { icon: Users, title: "Customer First", text: "We're here to help you find the right vehicle." },
  ];
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-5">
        <Reveal><h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-12">Why choose MK Motors?</h2></Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((it, i) => (
            <Reveal key={it.title} className={`delay-${i}`}>
              <div className="bg-white rounded-xl border border-gray-200 p-6 h-full">
                <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-4">
                  <it.icon size={20} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1.5">{it.title}</h3>
                <p className="text-sm text-gray-500">{it.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedInventory({ vehicles, favorites, toggleFav, onView, currency, setView }) {
  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-5">
        <Reveal>
          <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">Featured cars</h2>
              <p className="text-gray-500 text-sm">Explore some of our latest available vehicles.</p>
            </div>
            <button onClick={() => setView("inventory")} className="text-sm font-medium text-blue-700 hover:text-blue-800">View all inventory →</button>
          </div>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {vehicles.slice(0, 6).map((v) => (
            <VehicleCard key={v.id} v={v} favorites={favorites} toggleFav={toggleFav} onView={onView} currency={currency} />
          ))}
        </div>
      </div>
    </section>
  );
}

function NewArrivalsSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    if (!api.live()) {
      setTimeout(() => setStatus("done"), 400);
      return;
    }
    try {
      await api.subscribe(email.trim());
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section className="py-16 bg-blue-50 border-y border-blue-100">
      <div className="max-w-xl mx-auto px-5 text-center">
        <div className="w-11 h-11 rounded-full bg-blue-700 text-white flex items-center justify-center mx-auto mb-4">
          <Bell size={19} />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Get notified when a new car drops</h2>
        <p className="text-sm text-gray-600 mb-5">We'll email you the moment a new vehicle is added to the lot — no spam, unsubscribe anytime.</p>

        {status === "done" ? (
          <p className="text-sm font-medium text-blue-700 flex items-center justify-center gap-1.5">
            <Check size={16} /> You're on the list{!api.live() && " (demo mode — not actually saved)"}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto">
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" disabled={status === "loading"} className="bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-medium text-sm rounded-lg px-5 py-2.5 transition-colors whitespace-nowrap">
              {status === "loading" ? "Signing up…" : "Notify me"}
            </button>
          </form>
        )}
        {status === "error" && <p className="text-xs text-red-600 mt-2">Something went wrong — try again.</p>}
      </div>
    </section>
  );
}

function BodyTypeStrip({ setView, setInventoryFilter }) {
  const types = ["Sedan", "SUV", "Truck", "Hatchback", "Van"];
  return (
    <section className="py-14 bg-slate-900">
      <div className="max-w-6xl mx-auto px-5">
        <h2 className="text-white font-semibold text-lg mb-6 text-center">Browse by body type</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => { setInventoryFilter((f) => ({ ...f, bodyType: t })); setView("inventory"); }}
              className="border border-white/20 text-white/90 hover:bg-white/10 hover:border-white/40 transition-colors rounded-full px-5 py-2.5 text-sm"
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: 1, title: "Find your car", text: "Search and filter the inventory until something fits your budget and needs." },
    { n: 2, title: "Schedule a test drive", text: "Book a time that works for you, online or by phone." },
    { n: 3, title: "Drive away", text: "Finish the paperwork and financing, then take it home." },
  ];
  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-5">
        <Reveal><h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-12">How it works</h2></Reveal>
        <div className="grid sm:grid-cols-3 gap-8">
          {steps.map((s) => (
            <Reveal key={s.n}>
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-blue-700 text-white flex items-center justify-center mx-auto mb-4 font-semibold text-sm">{s.n}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinancingCTA({ setView }) {
  return (
    <section className="py-20 bg-blue-700">
      <div className="max-w-4xl mx-auto px-5 text-center">
        <Reveal>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Drive more. Worry less.</h2>
          <p className="text-blue-100 mb-7 max-w-xl mx-auto">Simple financing options built around what you can actually afford, explained clearly before you sign anything.</p>
          <button onClick={() => setView("services")} className="bg-white text-blue-700 font-medium px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors">
            Explore Financing
          </button>
        </Reveal>
      </div>
    </section>
  );
}

function ReviewsSection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-5">
        <Reveal><h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-2">What our customers say</h2></Reveal>
        <p className="text-center text-xs text-gray-400 mb-10">Sample testimonials shown for demonstration</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {REVIEWS.map((r, i) => (
            <Reveal key={r.name} className={`delay-${i}`}>
              <div className="bg-white rounded-xl border border-gray-200 p-6 h-full flex flex-col">
                <div className="flex gap-0.5 text-blue-600 mb-3">
                  {[...Array(5)].map((_, i) => <Star key={i} size={14} className="fill-blue-600" />)}
                </div>
                <p className="text-sm text-gray-600 flex-1">"{r.text}"</p>
                <p className="text-sm font-medium text-gray-900 mt-4">— {r.name}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function AboutPreview({ setView }) {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-5xl mx-auto px-5 grid md:grid-cols-2 gap-10 items-center">
        <Reveal>
          <div className="bg-gray-100 rounded-2xl h-64 flex items-center justify-center text-gray-400 text-sm">
            Dealership / team photo placeholder
          </div>
        </Reveal>
        <Reveal>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">Built around trust</h2>
          <p className="text-gray-600 mb-6">At MK Motors, our goal is simple: help people find dependable vehicles at fair prices without making the buying process complicated.</p>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Stat value="10+ Years" label="Serving drivers" />
            <Stat value="500+" label="Vehicles sold" />
            <Stat value="4.8/5" label="Customer satisfaction" />
          </div>
          <button onClick={() => setView("about")} className="text-sm font-medium text-blue-700 hover:text-blue-800">Learn more about us →</button>
        </Reveal>
      </div>
    </section>
  );
}

function Stat({ value, label }) {
  return (
    <div>
      <div className="font-bold text-slate-900 text-lg">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function ContactCTA({ setView }) {
  return (
    <section className="py-20 bg-slate-900">
      <div className="max-w-3xl mx-auto px-5 text-center">
        <Reveal>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">Ready to find your next car?</h2>
          <button onClick={() => setView("inventory")} className="bg-blue-700 hover:bg-blue-600 text-white font-medium px-7 py-3 rounded-lg transition-colors">
            Browse Inventory
          </button>
        </Reveal>
      </div>
    </section>
  );
}

function InventoryPage({ vehicles, favorites, toggleFav, onView, currency, filter, setFilter }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [visible, setVisible] = useState(6);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = vehicles.filter((v) => {
      const q = search.trim().toLowerCase();
      if (q && !(`${v.make} ${v.model} ${v.trim}`.toLowerCase().includes(q))) return false;
      if (filter.make && v.make !== filter.make) return false;
      if (filter.bodyType && v.bodyType !== filter.bodyType) return false;
      if (filter.transmission && v.transmission !== filter.transmission) return false;
      if (filter.maxPrice && v.price > Number(filter.maxPrice)) return false;
      if (filter.minYear && v.year < Number(filter.minYear)) return false;
      return true;
    });
    if (sort === "priceAsc") list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === "priceDesc") list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === "mileageAsc") list = [...list].sort((a, b) => a.mileage - b.mileage);
    else list = [...list].sort((a, b) => b.year - a.year);
    return list;
  }, [search, sort, filter, vehicles]);

  const shown = filtered.slice(0, visible);

  const FilterFields = () => (
    <div className="space-y-4">
      <FilterSelect label="Make" value={filter.make} onChange={(v) => setFilter((f) => ({ ...f, make: v }))}
        options={[...new Set(vehicles.map((v) => v.make))]} />
      <FilterSelect label="Body type" value={filter.bodyType} onChange={(v) => setFilter((f) => ({ ...f, bodyType: v }))}
        options={[...new Set(vehicles.map((v) => v.bodyType))]} />
      <FilterSelect label="Transmission" value={filter.transmission} onChange={(v) => setFilter((f) => ({ ...f, transmission: v }))}
        options={["Automatic", "Manual"]} />
      <FilterSelect label="Max price" value={filter.maxPrice} onChange={(v) => setFilter((f) => ({ ...f, maxPrice: v }))}
        options={["20000", "25000", "30000"]} labels={["Under $20,000", "Under $25,000", "Under $30,000"]} />
      <FilterSelect label="Min year" value={filter.minYear} onChange={(v) => setFilter((f) => ({ ...f, minYear: v }))}
        options={["2019", "2021", "2022", "2023"]} />
      <button onClick={() => setFilter({ make: "", bodyType: "", transmission: "", maxPrice: "", minYear: "" })}
        className="text-sm text-blue-700 hover:text-blue-800 font-medium">Clear filters</button>
    </div>
  );

  return (
    <div className="pt-28 pb-20 max-w-6xl mx-auto px-5">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Inventory</h1>
        <p className="text-gray-500">Find a vehicle that fits your lifestyle and budget.</p>
      </div>

      <div className="grid md:grid-cols-[220px_1fr] gap-8">
        <aside className="hidden md:block">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><SlidersHorizontal size={16} /> Filters</h3>
          <FilterFields />
        </aside>

        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search} onChange={(e) => { setSearch(e.target.value); setVisible(6); }}
                placeholder="Search make or model"
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="newest">Newest</option>
              <option value="priceAsc">Price: Low to High</option>
              <option value="priceDesc">Price: High to Low</option>
              <option value="mileageAsc">Mileage: Low to High</option>
            </select>
            <button onClick={() => setDrawerOpen(true)} className="md:hidden flex items-center justify-center gap-2 border border-gray-300 rounded-lg px-4 py-2.5 text-sm">
              <SlidersHorizontal size={15} /> Filters
            </button>
          </div>

          <p className="text-sm text-gray-500 mb-5">{filtered.length} vehicle{filtered.length !== 1 ? "s" : ""} found</p>

          {shown.length === 0 ? (
            <div className="text-center py-20 text-gray-400 text-sm">No vehicles match those filters — try widening your search.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {shown.map((v) => (
                <VehicleCard key={v.id} v={v} favorites={favorites} toggleFav={toggleFav} onView={onView} currency={currency} />
              ))}
            </div>
          )}

          {visible < filtered.length && (
            <div className="text-center mt-8">
              <button onClick={() => setVisible((v) => v + 6)} className="border border-gray-300 hover:border-gray-400 rounded-lg px-6 py-2.5 text-sm font-medium transition-colors">
                Load more
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={`fixed inset-0 z-[90] md:hidden transition-all ${drawerOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        <div className={`absolute inset-0 bg-black/40 transition-opacity ${drawerOpen ? "opacity-100" : "opacity-0"}`} onClick={() => setDrawerOpen(false)} />
        <div className={`absolute right-0 top-0 bottom-0 w-72 bg-white p-6 transition-transform duration-300 ${drawerOpen ? "translate-x-0" : "translate-x-full"}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900">Filters</h3>
            <button onClick={() => setDrawerOpen(false)}><X size={20} /></button>
          </div>
          <FilterFields />
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, labels }) {
  return (
    <label className="block text-sm">
      <span className="block text-gray-600 mb-1.5">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        <option value="">Any</option>
        {options.map((o, i) => <option key={o} value={o}>{labels ? labels[i] : o}</option>)}
      </select>
    </label>
  );
}

function PhotoLightbox({ vehicle, index, onClose, onIndexChange }) {
  const [zoomed, setZoomed] = useState(false);
  const images = vehicle.images && vehicle.images.length > 0 ? vehicle.images : [null];
  const total = images.length;

  useEffect(() => setZoomed(false), [index]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndexChange((index + 1) % total);
      if (e.key === "ArrowLeft") onIndexChange((index - 1 + total) % total);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, total, onClose, onIndexChange]);

  const entry = images[index];
  const src = entry ? resolveUrl(imgSrc(entry)) : null;

  return (
    <div className="fixed inset-0 z-[110] bg-black/95 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between p-4 text-white/80 shrink-0">
        <span className="text-sm">{index + 1} / {total}</span>
        <button onClick={onClose} aria-label="Close photo viewer" className="hover:text-white transition-colors"><X size={24} /></button>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-hidden px-4 relative" onClick={(e) => e.stopPropagation()}>
        {src ? (
          <img
            src={src}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model} photo ${index + 1}`}
            onClick={() => setZoomed((z) => !z)}
            className={`max-h-full max-w-full object-contain transition-transform duration-300 select-none ${zoomed ? "scale-[2] cursor-zoom-out" : "scale-100 cursor-zoom-in"}`}
          />
        ) : (
          <CarArt bodyType={vehicle.bodyType} className="w-2/3 h-2/3 opacity-80" />
        )}

        {total > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onIndexChange((index - 1 + total) % total); }}
              aria-label="Previous photo"
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onIndexChange((index + 1) % total); }}
              aria-label="Next photo"
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}
      </div>

      <p className="text-center text-white/40 text-xs py-4 shrink-0">Click the photo to zoom in or out</p>
    </div>
  );
}

function VehicleDetailsPage({ vehicle, currency, onTestDrive, setView, onBack }) {
  const [activeImg, setActiveImg] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  if (!vehicle) return null;
  const vin = `1MK${vehicle.id.toUpperCase()}${vehicle.year}KX${vehicle.mileage}`.slice(0, 17);
  const hasRealPhotos = vehicle.images && vehicle.images.length > 0;

  return (
    <div className="pt-28 pb-20 max-w-5xl mx-auto px-5">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-800 mb-6 flex items-center gap-1">
        <ChevronLeft size={15} /> Back
      </button>

      <div className="grid md:grid-cols-2 gap-10">
        <div>
          <button
            onClick={() => hasRealPhotos && setLightboxOpen(true)}
            className={`relative w-full bg-gray-50 rounded-2xl border border-gray-200 h-64 flex items-center justify-center mb-3 overflow-hidden group ${hasRealPhotos ? "cursor-zoom-in" : "cursor-default"}`}
            aria-label={hasRealPhotos ? "View full-screen photos" : undefined}
          >
            <VehicleImage vehicle={vehicle} index={activeImg} className="w-full h-full rounded-2xl" fallbackClassName="w-3/4 h-3/4" />
            {hasRealPhotos && (
              <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                <ZoomIn size={13} /> View {vehicle.images.length > 1 ? `all ${vehicle.images.length} photos` : "full size"}
              </span>
            )}
          </button>
          <div className="flex gap-2">
            {(vehicle.images && vehicle.images.length > 0 ? vehicle.images : [0, 1, 2]).map((_, i) => (
              <button key={i} onClick={() => (hasRealPhotos ? (setActiveImg(i), setLightboxOpen(true)) : setActiveImg(i))}
                className={`flex-1 h-16 rounded-lg border-2 flex items-center justify-center bg-gray-50 transition-colors overflow-hidden ${activeImg === i ? "border-blue-600" : "border-gray-200"}`}>
                <VehicleImage vehicle={vehicle} index={i} className="w-full h-full" fallbackClassName="w-2/3 h-2/3" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">{vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}</h1>
          <p className="text-2xl font-semibold text-blue-700 mb-5">{money(vehicle.price, currency)}</p>

          <dl className="grid grid-cols-2 gap-y-3 text-sm mb-6">
            <Spec label="Mileage" value={`${vehicle.mileage.toLocaleString()} mi`} />
            <Spec label="Engine" value={vehicle.engine} />
            <Spec label="Transmission" value={vehicle.transmission} />
            <Spec label="Fuel type" value={vehicle.fuelType} />
            <Spec label="Exterior color" value={vehicle.exteriorColor} />
            <Spec label="Interior color" value={vehicle.interiorColor} />
            <Spec label="VIN" value={vin} />
          </dl>

          <p className="text-gray-600 text-sm mb-6 leading-relaxed">{vehicle.description}</p>

          <div className="flex flex-wrap gap-3">
            <button onClick={() => onTestDrive(vehicle)} className="bg-blue-700 hover:bg-blue-800 text-white font-medium px-5 py-2.5 rounded-lg transition-colors">
              Schedule Test Drive
            </button>
            <a href="mailto:hello@mkmotors.example" className="border border-gray-300 hover:border-gray-400 text-gray-800 font-medium px-5 py-2.5 rounded-lg transition-colors">
              Ask About This Car
            </a>
          </div>
        </div>
      </div>

      <div className="mt-12 max-w-md">
        <FinancingCalculator defaultPrice={vehicle.price} currency={currency} />
      </div>

      {lightboxOpen && (
        <PhotoLightbox
          vehicle={vehicle}
          index={activeImg}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={setActiveImg}
        />
      )}
    </div>
  );
}

function Spec({ label, value }) {
  return (
    <div>
      <dt className="text-gray-400 text-xs">{label}</dt>
      <dd className="text-gray-900 font-medium">{value}</dd>
    </div>
  );
}

function TradeInForm() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ make: "", model: "", year: "", mileage: "", condition: "", name: "", contact: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (submitted) {
    return (
      <div className="bg-blue-50 rounded-xl p-8 text-center animate-[fadeUp_0.4s_ease]">
        <Check size={22} className="text-blue-700 mx-auto mb-2" />
        <p className="font-medium text-gray-900">Estimate requested</p>
        <p className="text-sm text-gray-500 mt-1">We'll follow up with a trade-in estimate shortly.</p>
      </div>
    );
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (api.live()) {
          try { await api.submitLead("trade-in", form); } catch { }
        }
        setSubmitted(true);
      }}
      className="bg-white rounded-xl border border-gray-200 p-6 grid sm:grid-cols-2 gap-4"
    >
      <Field label="Vehicle make" required value={form.make} onChange={set("make")} />
      <Field label="Model" required value={form.model} onChange={set("model")} />
      <Field label="Year" type="number" required value={form.year} onChange={set("year")} />
      <Field label="Mileage" type="number" required value={form.mileage} onChange={set("mileage")} />
      <label className="block text-sm">
        <span className="block text-gray-600 mb-1">Condition</span>
        <select required value={form.condition} onChange={set("condition")} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Select condition</option>
          <option>Excellent</option><option>Good</option><option>Fair</option><option>Needs work</option>
        </select>
      </label>
      <Field label="Name" required value={form.name} onChange={set("name")} />
      <Field label="Phone or email" required value={form.contact} onChange={set("contact")} />
      <button type="submit" className="sm:col-span-2 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg py-2.5 transition-colors">
        Get a Trade-In Estimate
      </button>
    </form>
  );
}

function ServicesPage({ setView, currency }) {
  const services = [
    { title: "Vehicle Financing", text: "Explore financing options that fit your budget." },
    { title: "Vehicle Trade-In", text: "Get an estimate for your current vehicle." },
    { title: "Vehicle Inspection", text: "Vehicles are checked before being listed." },
    { title: "After-Sale Support", text: "We continue to help after you drive away." },
  ];
  return (
    <div className="pt-28 pb-20">
      <div className="max-w-5xl mx-auto px-5">
        <h1 className="text-3xl font-bold text-slate-900 mb-10">Services</h1>
        <div className="grid sm:grid-cols-2 gap-5 mb-16">
          {services.map((s) => (
            <div key={s.title} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-gray-900 mb-1.5">{s.title}</h3>
              <p className="text-sm text-gray-500">{s.text}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-10 mb-16">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Thinking about trading in?</h2>
            <p className="text-gray-600 text-sm mb-5">Your current car could help you get behind the wheel of your next one.</p>
            <TradeInForm />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Make your next car more affordable</h2>
            <p className="text-gray-600 text-sm mb-5">Simple financing, explained clearly before you sign anything.</p>
            <FinancingCalculator currency={currency} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AboutPage() {
  return (
    <div className="pt-28 pb-20 max-w-4xl mx-auto px-5">
      <h1 className="text-3xl font-bold text-slate-900 mb-4">Built around trust</h1>
      <p className="text-gray-600 mb-10 max-w-2xl">At MK Motors, our goal is simple: help people find dependable vehicles at fair prices without making the buying process complicated.</p>
      <div className="bg-gray-100 rounded-2xl h-64 flex items-center justify-center text-gray-400 text-sm mb-10">
        Dealership / team photo placeholder
      </div>
      <div className="grid grid-cols-3 gap-6 max-w-md">
        <Stat value="10+ Years" label="Serving drivers" />
        <Stat value="500+" label="Vehicles sold" />
        <Stat value="4.8/5" label="Customer satisfaction" />
      </div>
    </div>
  );
}

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <div className="pt-28 pb-20 max-w-5xl mx-auto px-5">
      <h1 className="text-3xl font-bold text-slate-900 mb-10">Contact</h1>
      <div className="grid md:grid-cols-2 gap-10">
        <div>
          <h2 className="font-semibold text-lg text-gray-900 mb-4">MK Motors</h2>
          <ul className="space-y-3 text-sm text-gray-600 mb-8">
            <li className="flex items-center gap-2">
              <Phone size={15} className="text-blue-700" />
              <a href="tel:+15550000000" className="hover:text-blue-700 transition-colors">+1 (555) 000-0000</a>
            </li>
            <li className="flex items-center gap-2">
              <Mail size={15} className="text-blue-700" />
              <a href="mailto:hello@mkmotors.example" className="hover:text-blue-700 transition-colors">hello@mkmotors.example</a>
            </li>
            <li className="flex items-center gap-2">
              <MapPin size={15} className="text-blue-700" />
              <a href="https://maps.google.com/?q=123+Main+Street" target="_blank" rel="noopener noreferrer" className="hover:text-blue-700 transition-colors">123 Main Street</a>
            </li>
          </ul>
          <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2"><Clock size={15} /> Business hours</h3>
          <ul className="text-sm text-gray-600 space-y-1 mb-8">
            <li>Monday–Friday: 9:00 AM–6:00 PM</li>
            <li>Saturday: 9:00 AM–4:00 PM</li>
            <li>Sunday: Closed</li>
          </ul>
          <div className="bg-gray-100 rounded-xl h-40 flex items-center justify-center text-gray-400 text-sm">Map placeholder</div>
        </div>

        <div>
          {submitted ? (
            <div className="bg-blue-50 rounded-xl p-8 text-center animate-[fadeUp_0.4s_ease]">
              <Check size={22} className="text-blue-700 mx-auto mb-2" />
              <p className="font-medium text-gray-900">Message sent</p>
              <p className="text-sm text-gray-500 mt-1">We'll get back to you shortly.</p>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (api.live()) {
                  try { await api.submitLead("contact", form); } catch { }
                }
                setSubmitted(true);
              }}
              className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
            >
              <Field label="Name" required value={form.name} onChange={set("name")} />
              <Field label="Email" type="email" required value={form.email} onChange={set("email")} />
              <Field label="Phone" type="tel" value={form.phone} onChange={set("phone")} />
              <label className="block text-sm">
                <span className="block text-gray-600 mb-1">Message</span>
                <textarea rows={4} required value={form.message} onChange={set("message")}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </label>
              <button type="submit" className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg py-2.5 transition-colors">
                Send Message
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Footer({ setView }) {
  return (
    <footer className="bg-slate-900 text-white pt-16 pb-8">
      <div className="max-w-6xl mx-auto px-5 grid sm:grid-cols-2 md:grid-cols-4 gap-10 mb-10">
        <div>
          <div className="font-bold text-lg mb-2">MK MOTORS</div>
          <p className="text-sm text-white/50">Find your next car.</p>
        </div>
        <FooterCol title="Company" links={[["About", "about"], ["Contact", "contact"], ["Services", "services"]]} setView={setView} />
        <FooterCol title="Inventory" links={[["All Cars", "inventory"], ["SUVs", "inventory"], ["Sedans", "inventory"], ["Trucks", "inventory"]]} setView={setView} />
        <FooterCol title="Support" links={[["Financing", "services"], ["Trade-In", "services"], ["Test Drive", "inventory"]]} setView={setView} />
      </div>
      <div className="max-w-6xl mx-auto px-5 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between gap-3 text-xs text-white/40">
        <span>© 2026 MK Motors. All rights reserved.</span>
        <div className="flex gap-5">
          <button onClick={() => setView("privacy")} className="hover:text-white/70 transition-colors">Privacy Policy</button>
          <button onClick={() => setView("terms")} className="hover:text-white/70 transition-colors">Terms of Use</button>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links, setView }) {
  return (
    <div>
      <div className="font-medium text-sm mb-3 text-white/80">{title}</div>
      <ul className="space-y-2">
        {links.map(([label, view]) => (
          <li key={label}>
            <button onClick={() => setView(view)} className="text-sm text-white/50 hover:text-white/80 transition-colors">{label}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", message: "" });
  const [status, setStatus] = useState("idle");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    if (!api.live()) {
      setTimeout(() => setStatus("done"), 400);
      return;
    }
    try {
      await api.submitLead("chat", form);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  const reset = () => { setForm({ name: "", message: "" }); setStatus("idle"); };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Chat with admin"}
        className="fixed bottom-20 md:bottom-6 right-5 z-50 w-14 h-14 rounded-full bg-blue-700 hover:bg-blue-800 text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div className="fixed bottom-36 md:bottom-24 right-5 z-50 w-[calc(100%-2.5rem)] max-w-sm bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden animate-[fadeUp_0.25s_ease]">
          <div className="bg-blue-700 text-white px-4 py-3 flex items-center gap-2">
            <MessageCircle size={17} />
            <div>
              <p className="text-sm font-semibold leading-tight">Chat with MK Motors</p>
              <p className="text-xs text-blue-100 leading-tight">We typically reply within a few hours</p>
            </div>
          </div>

          <div className="p-4">
            {status === "done" ? (
              <div className="text-center py-6 animate-[fadeUp_0.3s_ease]">
                <Check size={20} className="text-blue-700 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Message sent</p>
                <p className="text-xs text-gray-500 mt-1 mb-4">
                  {api.live() ? "An admin will get back to you shortly." : "Demo mode — this wasn't actually saved."}
                </p>
                <button onClick={reset} className="text-xs font-medium text-blue-700 hover:text-blue-800">Send another message</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-2.5">
                <input
                  required value={form.name} onChange={set("name")} placeholder="Your name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  required rows={3} value={form.message} onChange={set("message")} placeholder="What can we help with?"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit" disabled={status === "loading"}
                  className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2.5 transition-colors flex items-center justify-center gap-1.5"
                >
                  {status === "loading" ? "Sending…" : <>Send <Send size={13} /></>}
                </button>
                {status === "error" && <p className="text-xs text-red-600">Something went wrong — try again.</p>}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function MobileBar({ setView, onCall }) {
  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 flex text-xs font-medium">
      <button onClick={onCall} className="flex-1 flex flex-col items-center gap-1 py-2.5 text-gray-600"><Phone size={16} />Call</button>
      <button onClick={() => setView("inventory")} className="flex-1 flex flex-col items-center gap-1 py-2.5 text-gray-600 border-x border-gray-100"><Car size={16} />Browse Cars</button>
      <button onClick={() => setView("inventory")} className="flex-1 flex flex-col items-center gap-1 py-2.5 text-blue-700"><Calendar size={16} />Test Drive</button>
    </div>
  );
}

function LegalPage({ title }) {
  return (
    <div className="pt-28 pb-20 max-w-3xl mx-auto px-5">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">{title}</h1>
      <p className="text-gray-600 text-sm leading-relaxed">
        This is placeholder text for the {title.toLowerCase()} page. Replace this with your
        dealership's actual {title.toLowerCase()} before the site goes live — this section
        should cover how customer data is collected and used, financing disclosures, and any
        terms specific to vehicle purchases in your state or country.
      </p>
    </div>
  );
}

const MAX_PHOTOS_PER_VEHICLE = 5;

function ManageThumb({ entry, onRemove }) {
  const [errored, setErrored] = useState(false);
  const src = resolveUrl(imgSrc(entry));
  return (
    <div className="relative w-16 h-12 rounded border border-gray-200 overflow-hidden group bg-gray-50">
      {errored ? (
        <div className="w-full h-full flex items-center justify-center text-center px-1">
          <span className="text-[9px] leading-tight text-red-500">Failed to load</span>
        </div>
      ) : (
        <img src={src} alt="" onError={() => setErrored(true)} className="w-full h-full object-cover" />
      )}
      <button
        onClick={onRemove}
        aria-label="Remove photo"
        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X size={10} />
      </button>
    </div>
  );
}

function ManageRow({ vehicle, currency, onUpdatePrice, onUpdateDetails, onAddImage, onRemoveImage }) {
  const [priceInput, setPriceInput] = useState(String(vehicle.price));
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef(null);
  const atLimit = vehicle.images.length >= MAX_PHOTOS_PER_VEHICLE;

  const [details, setDetails] = useState({
    engine: vehicle.engine || "",
    transmission: vehicle.transmission || "Automatic",
    fuelType: vehicle.fuelType || "Gasoline",
    mileage: String(vehicle.mileage),
  });
  const setDetail = (k) => (e) => setDetails((d) => ({ ...d, [k]: e.target.value }));
  const [uploadError, setUploadError] = useState("");

  const savePrice = () => {
    const n = Number(priceInput);
    if (!isNaN(n) && n > 0) onUpdatePrice(vehicle.id, n);
  };

  const saveDetails = () => {
    const mileage = Number(details.mileage);
    onUpdateDetails(vehicle.id, {
      engine: details.engine,
      transmission: details.transmission,
      fuelType: details.fuelType,
      mileage: isNaN(mileage) ? vehicle.mileage : mileage,
    });
  };

  const handleAddUrl = async () => {
    setUploadError("");
    const result = await onAddImage(vehicle.id, urlInput);
    if (result?.ok) setUrlInput("");
    else setUploadError(result?.error || "Could not add that photo.");
  };

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploadError("");
    const result = await onAddImage(vehicle.id, file);
    if (!result?.ok) setUploadError(result?.error || "Upload failed.");
    e.target.value = "";
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="grid md:grid-cols-[100px_1fr_260px] gap-5 items-start">
        <div className="w-full h-20 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center">
          <VehicleImage vehicle={vehicle} className="w-full h-full" fallbackClassName="w-4/5 h-4/5" />
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-1">{vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}</h3>
          <p className="text-xs text-gray-400 mb-3">Currently showing: {money(vehicle.price, currency)} · {vehicle.images.length}/{MAX_PHOTOS_PER_VEHICLE} photos</p>

          <div className="flex flex-wrap gap-2 mb-2">
            {vehicle.images.length === 0 && (
              <span className="text-xs text-gray-400 italic">No photos added yet — using illustrated placeholder.</span>
            )}
            {vehicle.images.map((entry, i) => (
              <ManageThumb key={i} entry={entry} onRemove={() => onRemoveImage(vehicle.id, i, imgId(entry))} />
            ))}
          </div>

          {atLimit ? (
            <p className="text-xs text-amber-600">Maximum of {MAX_PHOTOS_PER_VEHICLE} photos reached — remove one to add another.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Or paste an image URL"
                  className="flex-1 min-w-[160px] text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddUrl}
                  className="text-sm font-medium border border-gray-300 hover:border-gray-400 rounded-lg px-4 py-2 transition-colors whitespace-nowrap"
                >
                  Add URL
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                <button
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  className="text-sm font-medium bg-blue-700 hover:bg-blue-800 text-white rounded-lg px-4 py-2 transition-colors whitespace-nowrap"
                >
                  Upload from device
                </button>
              </div>
              {uploadError && <p className="text-xs text-red-600 mt-1.5">{uploadError}</p>}
            </>
          )}
        </div>

        <div>
          <label className="block text-sm mb-1.5">
            <span className="block text-gray-600 mb-1">Price (USD)</span>
            <div className="flex gap-2">
              <input
                type="number"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={savePrice} className="text-sm font-medium border border-gray-300 hover:border-gray-400 rounded-lg px-4 py-2 transition-colors">
                Save
              </button>
            </div>
          </label>
          <p className="text-xs text-gray-400">Displayed as {money(Number(priceInput) || vehicle.price, currency)}</p>
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-500 mb-3">Vehicle details</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="block text-sm">
            <span className="block text-gray-500 mb-1 text-xs">Engine</span>
            <input value={details.engine} onChange={setDetail("engine")} placeholder="e.g. 2.5L 4-Cyl"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </label>
          <label className="block text-sm">
            <span className="block text-gray-500 mb-1 text-xs">Transmission</span>
            <select value={details.transmission} onChange={setDetail("transmission")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Automatic</option>
              <option>Manual</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="block text-gray-500 mb-1 text-xs">Fuel type</span>
            <select value={details.fuelType} onChange={setDetail("fuelType")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Gasoline</option>
              <option>Diesel</option>
              <option>Hybrid</option>
              <option>Electric</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="block text-gray-500 mb-1 text-xs">Mileage</span>
            <input type="number" value={details.mileage} onChange={setDetail("mileage")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </label>
        </div>
        <button onClick={saveDetails} className="mt-3 text-sm font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-4 py-2 transition-colors">
          Save vehicle details
        </button>
      </div>
    </div>
  );
}

function HeroImageManager({ heroImage, onSetUrl, onUploadFile }) {
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef(null);
  const [uploadError, setUploadError] = useState("");

  const handleAddUrl = async () => {
    setUploadError("");
    const result = await onSetUrl(urlInput);
    if (result?.ok) setUrlInput("");
    else setUploadError(result?.error || "Could not add that photo.");
  };

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploadError("");
    const result = await onUploadFile(file);
    if (!result?.ok) setUploadError(result?.error || "Upload failed.");
    e.target.value = "";
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
      <h3 className="font-semibold text-gray-900 mb-1">Homepage hero photo</h3>
      <p className="text-xs text-gray-400 mb-4">This is the large photo shown at the top of the homepage. For the most balanced result, use a landscape photo at least 1200×900px — it's cropped to fit automatically either way.</p>
      <div className="flex flex-col sm:flex-row gap-5 items-start">
        <div className="w-full sm:w-48 h-28 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200 shrink-0">
          {heroImage ? (
            <img src={resolveUrl(heroImage)} alt="Hero" className="w-full h-full object-cover" />
          ) : (
            <CarArt bodyType="SUV" className="w-4/5 h-4/5" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap gap-2">
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Or paste an image URL"
              className="flex-1 min-w-[160px] text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddUrl}
              className="text-sm font-medium border border-gray-300 hover:border-gray-400 rounded-lg px-4 py-2 transition-colors whitespace-nowrap"
            >
              Add URL
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            <button
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className="text-sm font-medium bg-blue-700 hover:bg-blue-800 text-white rounded-lg px-4 py-2 transition-colors whitespace-nowrap"
            >
              Upload from device
            </button>
          </div>
          {uploadError && <p className="text-xs text-red-600 mt-1.5">{uploadError}</p>}
        </div>
      </div>
    </div>
  );
}

function AdminLoginGate({ onLogin, error, loading }) {
  const [password, setPassword] = useState("");
  return (
    <div className="pt-28 pb-20 max-w-sm mx-auto px-5">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Admin login</h1>
      <p className="text-gray-500 text-sm mb-6">This site is connected to a live backend, so editing inventory requires the admin password.</p>
      <form onSubmit={(e) => { e.preventDefault(); onLogin(password); }} className="space-y-3">
        <Field label="Admin password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 transition-colors">
          {loading ? "Signing in…" : "Log in"}
        </button>
      </form>
    </div>
  );
}

function AddVehicleForm({ onAddVehicle, onIdentifyPhoto }) {
  const blank = { vin: "", year: "", make: "", model: "", trim: "", bodyType: "Sedan", price: "", mileage: "", engine: "", transmission: "Automatic", fuelType: "Gasoline", exteriorColor: "", interiorColor: "", description: "" };
  const [form, setForm] = useState(blank);
  const [vinLoading, setVinLoading] = useState(false);
  const [vinError, setVinError] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoNote, setPhotoNote] = useState("");
  const photoInputRef = useRef(null);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const lookupVin = async () => {
    const vin = form.vin.trim();
    if (vin.length !== 17) { setVinError("A VIN is exactly 17 characters."); return; }
    setVinLoading(true);
    setVinError("");
    try {
      const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`);
      const data = await res.json();
      const get = (name) => data.Results?.find((r) => r.Variable === name)?.Value || "";
      const year = get("Model Year");
      const make = get("Make");
      const model = get("Model");
      if (!make || !model) { setVinError("Couldn't find that VIN — you can still fill in the fields yourself."); return; }
      setForm((f) => ({
        ...f,
        year: year || f.year,
        make, model,
        trim: get("Trim") || f.trim,
        bodyType: get("Body Class")?.includes("SUV") ? "SUV" : get("Body Class")?.includes("Truck") ? "Truck" : get("Body Class")?.includes("Hatchback") ? "Hatchback" : get("Body Class")?.includes("Van") ? "Van" : "Sedan",
        engine: [get("Displacement (L)") && `${get("Displacement (L)")}L`, get("Engine Number of Cylinders") && `${get("Engine Number of Cylinders")}-Cyl`].filter(Boolean).join(" ") || f.engine,
        fuelType: get("Fuel Type - Primary")?.includes("Electric") ? "Electric" : get("Fuel Type - Primary")?.includes("Hybrid") ? "Hybrid" : get("Fuel Type - Primary")?.includes("Diesel") ? "Diesel" : "Gasoline",
        transmission: get("Transmission Style")?.includes("Manual") ? "Manual" : "Automatic",
      }));
    } catch {
      setVinError("Couldn't reach the VIN lookup service — you can still fill in the fields yourself.");
    } finally {
      setVinLoading(false);
    }
  };

  const handlePhotoFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setPhotoLoading(true);
    setPhotoError("");
    setPhotoNote("");
    const result = await onIdentifyPhoto(file);
    setPhotoLoading(false);
    e.target.value = "";
    if (!result?.ok) { setPhotoError(result?.error || "Could not identify that photo."); return; }
    const d = result.data || {};
    if (!d.make && !d.model) { setPhotoNote("Couldn't confidently identify that car — fill in the fields yourself."); return; }
    setForm((f) => ({
      ...f,
      year: d.year || f.year,
      make: d.make || f.make,
      model: d.model || f.model,
      bodyType: ["Sedan", "SUV", "Truck", "Hatchback", "Van"].includes(d.bodyType) ? d.bodyType : f.bodyType,
      exteriorColor: d.exteriorColor || f.exteriorColor,
    }));
    setPhotoNote("Filled in from the photo — double check before saving, especially the year.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError("");
    if (!form.year || !form.make || !form.model || !form.price || !form.mileage) {
      setSaveError("Year, make, model, price, and mileage are required.");
      return;
    }
    setSaving(true);
    const result = await onAddVehicle({
      year: Number(form.year), make: form.make, model: form.model, trim: form.trim, bodyType: form.bodyType,
      price: Number(form.price), mileage: Number(form.mileage), engine: form.engine, transmission: form.transmission,
      fuelType: form.fuelType, exteriorColor: form.exteriorColor, interiorColor: form.interiorColor, description: form.description,
    });
    setSaving(false);
    if (result?.ok) { setForm(blank); setOpen(false); }
    else setSaveError(result?.error || "Could not add this vehicle.");
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full mb-8 border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl py-6 text-sm font-medium text-gray-600 hover:text-blue-700 transition-colors">
        + Add a new vehicle
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Add a new vehicle</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
      </div>

      <div className="bg-blue-50 rounded-lg p-3 mb-4">
        <p className="text-xs font-medium text-gray-700 mb-2">Have the VIN? Paste it here to auto-fill year, make, model, and more.</p>
        <div className="flex gap-2">
          <input value={form.vin} onChange={set("vin")} placeholder="17-character VIN"
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="button" onClick={lookupVin} disabled={vinLoading}
            className="text-sm font-medium bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-lg px-4 py-2 transition-colors whitespace-nowrap">
            {vinLoading ? "Looking up…" : "Auto-fill"}
          </button>
        </div>
        {vinError && <p className="text-xs text-amber-600 mt-1.5">{vinError}</p>}
      </div>

      <div className="bg-purple-50 rounded-lg p-3 mb-4">
        <p className="text-xs font-medium text-gray-700 mb-2">Or take/upload a photo of the car and let AI guess the year, make, model, and color.</p>
        <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoFile} className="hidden" />
        <button type="button" onClick={() => photoInputRef.current && photoInputRef.current.click()} disabled={photoLoading}
          className="text-sm font-medium bg-purple-700 hover:bg-purple-800 disabled:opacity-60 text-white rounded-lg px-4 py-2 transition-colors">
          {photoLoading ? "Identifying…" : "Identify from photo"}
        </button>
        {photoError && <p className="text-xs text-red-600 mt-1.5">{photoError}</p>}
        {photoNote && !photoError && <p className="text-xs text-purple-700 mt-1.5">{photoNote}</p>}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
        <Field label="Year" type="number" required value={form.year} onChange={set("year")} />
        <Field label="Make" required value={form.make} onChange={set("make")} />
        <Field label="Model" required value={form.model} onChange={set("model")} />
        <Field label="Trim" value={form.trim} onChange={set("trim")} />
        <label className="block text-sm">
          <span className="block text-gray-600 mb-1">Body type</span>
          <select value={form.bodyType} onChange={set("bodyType")} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Sedan</option><option>SUV</option><option>Truck</option><option>Hatchback</option><option>Van</option>
          </select>
        </label>
        <Field label="Price (USD)" type="number" required value={form.price} onChange={set("price")} />
        <Field label="Mileage" type="number" required value={form.mileage} onChange={set("mileage")} />
        <Field label="Engine" value={form.engine} onChange={set("engine")} placeholder="e.g. 2.5L 4-Cyl" />
        <label className="block text-sm">
          <span className="block text-gray-600 mb-1">Transmission</span>
          <select value={form.transmission} onChange={set("transmission")} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Automatic</option><option>Manual</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="block text-gray-600 mb-1">Fuel type</span>
          <select value={form.fuelType} onChange={set("fuelType")} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Gasoline</option><option>Diesel</option><option>Hybrid</option><option>Electric</option>
          </select>
        </label>
        <Field label="Exterior color" value={form.exteriorColor} onChange={set("exteriorColor")} />
        <Field label="Interior color" value={form.interiorColor} onChange={set("interiorColor")} />
      </div>
      <label className="block text-sm mb-4">
        <span className="block text-gray-600 mb-1">Description</span>
        <textarea rows={2} value={form.description} onChange={set("description")}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </label>

      {saveError && <p className="text-sm text-red-600 mb-3">{saveError}</p>}
      <button type="submit" disabled={saving} className="bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-medium rounded-lg px-5 py-2.5 text-sm transition-colors">
        {saving ? "Adding…" : "Add vehicle"}
      </button>
      <p className="text-xs text-gray-400 mt-3">Add photos for it afterward from the list below, once it's saved.</p>
    </form>
  );
}

function ManageInventoryPage({ vehicles, currency, onUpdatePrice, onUpdateDetails, onAddImage, onRemoveImage, onAddVehicle, onIdentifyPhoto, heroImage, onSetHeroUrl, onUploadHeroFile, live, loggedIn, onLogin, loginError, loginLoading }) {
  if (live && !loggedIn) {
    return <AdminLoginGate onLogin={onLogin} error={loginError} loading={loginLoading} />;
  }

  return (
    <div className="pt-28 pb-20 max-w-4xl mx-auto px-5">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Manage inventory</h1>
      <p className="text-gray-500 mb-2">Update the hero photo, car prices, and car photos — changes appear across the site instantly.</p>
      {live ? (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 inline-block mb-8">
          Connected to your live backend — every change here is saved permanently.
        </p>
      ) : (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 inline-block mb-8">
          Running in demo mode (no backend connected) — edits reset if the page reloads. Set API_BASE near the top of the file to your deployed backend URL to make this permanent.
        </p>
      )}

      <HeroImageManager heroImage={heroImage} onSetUrl={onSetHeroUrl} onUploadFile={onUploadHeroFile} />

      <AddVehicleForm onAddVehicle={onAddVehicle} onIdentifyPhoto={onIdentifyPhoto} />

      <div className="space-y-4">
        {vehicles.map((v) => (
          <ManageRow key={v.id} vehicle={v} currency={currency} onUpdatePrice={onUpdatePrice} onUpdateDetails={onUpdateDetails} onAddImage={onAddImage} onRemoveImage={onRemoveImage} />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [view, setViewRaw] = useState("home");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [favorites, setFavorites] = useState(new Set());
  const [selectedId, setSelectedId] = useState(null);
  const [previousView, setPreviousView] = useState("home");
  const [testDriveVehicle, setTestDriveVehicle] = useState(null);
  const [testDriveOpen, setTestDriveOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState({ make: "", bodyType: "", year: "", maxPrice: "", transmission: "" });
  const [inventoryFilter, setInventoryFilter] = useState({ make: "", bodyType: "", transmission: "", maxPrice: "", minYear: "" });
  const [vehicles, setVehicles] = useState(VEHICLES);
  const [heroImage, setHeroImage] = useState("");
  const [adminToken, setAdminToken] = useState(null);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const setView = (v) => { setViewRaw(v); window.scrollTo({ top: 0, behavior: "auto" }); };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!api.live()) return;
    api.vehicles().then(setVehicles).catch(() => {});
    api.settings().then((s) => setHeroImage(s.heroImage || "")).catch(() => {});
  }, []);

  useEffect(() => {
    if (view === "inventory") {
      setInventoryFilter((f) => ({
        ...f,
        make: quickSearch.make || f.make,
        bodyType: quickSearch.bodyType || f.bodyType,
        maxPrice: quickSearch.maxPrice || f.maxPrice,
        transmission: quickSearch.transmission || f.transmission,
      }));
    }
  }, [view]);

  const toggleFav = (id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openDetails = (id) => {
    setPreviousView(view === "details" ? previousView : view);
    setSelectedId(id);
    setView("details");
  };
  const openTestDrive = (vehicle) => { setTestDriveVehicle(vehicle || null); setTestDriveOpen(true); };

  const handleLogin = async (password) => {
    setLoginLoading(true);
    setLoginError("");
    try {
      const { token } = await api.login(password);
      setAdminToken(token);
    } catch (err) {
      setLoginError(err.message || "Login failed.");
    } finally {
      setLoginLoading(false);
    }
  };

  const updatePrice = async (id, price) => {
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, price } : v)));
    if (api.live() && adminToken) {
      try { await api.updateVehicle(adminToken, id, { price }); }
      catch { }
    }
  };

  const updateDetails = async (id, fields) => {
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, ...fields } : v)));
    if (api.live() && adminToken) {
      try { await api.updateVehicle(adminToken, id, fields); }
      catch { }
    }
  };

  const addImage = async (id, urlOrFile) => {
    const isFile = urlOrFile instanceof File;
    if (!isFile && (!urlOrFile || !urlOrFile.trim())) return { ok: false, error: "Nothing to add." };

    if (api.live() && adminToken) {
      try {
        const result = isFile
          ? await api.uploadVehicleImage(adminToken, id, urlOrFile)
          : await api.addVehicleImageUrl(adminToken, id, urlOrFile.trim());
        setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, images: [...v.images, { url: result.url }] } : v)));
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err.message || "Upload failed." };
      }
    }
    try {
      const value = isFile ? await fileToDataUrl(urlOrFile) : urlOrFile.trim();
      setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, images: [...v.images, value] } : v)));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: "Could not read that file." };
    }
  };

  const removeImage = async (id, index, imageId) => {
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, images: v.images.filter((_, i) => i !== index) } : v)));
    if (api.live() && adminToken && imageId) {
      try { await api.removeVehicleImage(adminToken, id, index, imageId); }
      catch { }
    }
  };

  const setHeroUrl = async (url) => {
    if (!url || !url.trim()) return { ok: false, error: "Nothing to add." };
    if (api.live() && adminToken) {
      try { const r = await api.setSettingUrl(adminToken, "heroImage", url.trim()); setHeroImage(r.value); return { ok: true }; }
      catch (err) { return { ok: false, error: err.message || "Could not save." }; }
    }
    setHeroImage(url.trim());
    return { ok: true };
  };

  const uploadHeroFile = async (file) => {
    if (api.live() && adminToken) {
      try { const r = await api.uploadSettingImage(adminToken, "heroImage", file); setHeroImage(r.value); return { ok: true }; }
      catch (err) { return { ok: false, error: err.message || "Upload failed." }; }
    }
    try {
      setHeroImage(await fileToDataUrl(file));
      return { ok: true };
    } catch {
      return { ok: false, error: "Could not read that file." };
    }
  };

  const addVehicle = async (vehicleData) => {
    if (api.live() && adminToken) {
      try {
        const created = await api.createVehicle(adminToken, vehicleData);
        setVehicles((prev) => [...prev, created]);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err.message || "Could not add vehicle." };
      }
    }
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setVehicles((prev) => [...prev, { ...vehicleData, id, images: [] }]);
    return { ok: true };
  };

  const identifyPhoto = async (file) => {
    if (!api.live() || !adminToken) {
      return { ok: false, error: "Photo identification needs a live, logged-in backend connection." };
    }
    try {
      const data = await api.identifyPhoto(adminToken, file);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message || "Could not identify that photo." };
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === selectedId);

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif" }} className="min-h-screen bg-white text-slate-800">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .delay-0{transition-delay:0ms}.delay-1{transition-delay:80ms}.delay-2{transition-delay:160ms}.delay-3{transition-delay:240ms}
      `}</style>

      <Header view={view} setView={setView} currency={currency} setCurrency={setCurrency} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} scrolled={scrolled} />

      <main className="pb-14 md:pb-0">
        {view === "home" && (
          <>
            <Hero setView={setView} heroImage={heroImage} />
            <SearchPanel setView={setView} quickSearch={quickSearch} setQuickSearch={setQuickSearch} />
            <TrustSection />
            <FeaturedInventory vehicles={vehicles} favorites={favorites} toggleFav={toggleFav} onView={openDetails} currency={currency} setView={setView} />
            <NewArrivalsSignup />
            <BodyTypeStrip setView={setView} setInventoryFilter={setInventoryFilter} />
            <HowItWorks />
            <FinancingCTA setView={setView} />
            <ReviewsSection />
            <AboutPreview setView={setView} />
            <ContactCTA setView={setView} />
          </>
        )}

        {view === "inventory" && (
          <InventoryPage vehicles={vehicles} favorites={favorites} toggleFav={toggleFav} onView={openDetails} currency={currency} filter={inventoryFilter} setFilter={setInventoryFilter} />
        )}

        {view === "details" && (
          <VehicleDetailsPage vehicle={selectedVehicle} currency={currency} onTestDrive={openTestDrive} setView={setView} onBack={() => setView(previousView)} />
        )}

        {view === "services" && <ServicesPage setView={setView} currency={currency} />}
        {view === "about" && <AboutPage />}
        {view === "contact" && <ContactPage />}
        {view === "manage" && (
          <ManageInventoryPage
            vehicles={vehicles}
            currency={currency}
            onUpdatePrice={updatePrice}
            onUpdateDetails={updateDetails}
            onAddImage={addImage}
            onAddVehicle={addVehicle}
            onIdentifyPhoto={identifyPhoto}
            onRemoveImage={removeImage}
            heroImage={heroImage}
            onSetHeroUrl={setHeroUrl}
            onUploadHeroFile={uploadHeroFile}
            live={api.live()}
            loggedIn={Boolean(adminToken)}
            onLogin={handleLogin}
            loginError={loginError}
            loginLoading={loginLoading}
          />
        )}
        {view === "privacy" && <LegalPage title="Privacy Policy" />}
        {view === "terms" && <LegalPage title="Terms of Use" />}
      </main>

      <Footer setView={setView} />
      <MobileBar setView={setView} onCall={() => window.location.assign("tel:+15550000000")} />
      <ChatWidget />
      <TestDriveModal open={testDriveOpen} onClose={() => setTestDriveOpen(false)} vehicle={testDriveVehicle} />
    </div>
  );
                               }
