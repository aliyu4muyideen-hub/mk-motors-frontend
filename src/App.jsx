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
  updateVehicle: (token, id, fields) =>
    fetch(`${API_BASE}/api/vehicles/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(fields),
    }).then((r) => r.json()),
  addVehicleImageUrl: (token, id, url) =>
    fetch(`${API_BASE}/api/vehicles/${id}/images/url`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ url }),
    }).then((r) => r.json()),
  uploadVehicleImage: (token, id, file) => {
    const form = new FormData();
    form.append("photo", file);
    return fetch(`${API_BASE}/api/vehicles/${id}/images`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form,
    }).then((r) => r.json());
  },
  removeVehicleImage: (token, id, imageIndex, imageId) =>
    fetch(`${API_BASE}/api/vehicles/${id}/images/${imageId}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    }),
  setSettingUrl: (token, key, value) =>
    fetch(`${API_BASE}/api/settings/${key}`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ value }),
    }).then((r) => r.json()),
  uploadSettingImage: (token, key, file) => {
    const form = new FormData();
    form.append("photo", file);
    return fetch(`${API_BASE}/api/settings/${key}/image`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form,
    }).then((r) => r.json());
  },
  submitLead: (type, payload) =>
    fetch(`${API_BASE}/api/leads/${type}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    }).then(async (r) => { if (!r.ok) throw new Error((await r.json()).error || "Submission failed"); return r.json(); }),
  subscribe: (email) =>
    fetch(`${API_BASE}/api/subscribers`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
    }).then(async (r) => { if (!r.ok) throw new Error((await r.json()).error || "Subscription failed"); return r.json(); }),
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
      className={`transition-all duration-700 ease-out ${inView ? "opacity-100
