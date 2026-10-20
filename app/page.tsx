 "use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, ShoppingCart, Package, Users, Settings, ScanLine,
  Trash2, CreditCard, Plus, Save, Search, Menu, X, TrendingUp, Boxes,
  ReceiptText, Upload, Pencil, CircleDollarSign, Cloud, Download, LogOut, LockKeyhole
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Product = { id: string; name: string; price: number; stock: number; barcode: string };
type CartItem = Product & { qty: number };
type Employee = { id: string; name: string; phone: string; role: string; active: boolean; method: "fixed"|"percent"|"tiered"|"combined"; rate: number; secondRate: number; tierLimit: number; tierRate: number };
type CommissionPayment = { id: string; employeeId: string; amount: number; method: string; note: string; createdAt: string };
type Sale = { id: string; total: number; deliveryFee?: number; commission: number; employeeId?: string; employeeName?: string; items: CartItem[]; createdAt: string; returnedAt?: string; returnReason?: string };

const money = (n: number) => new Intl.NumberFormat("en-PK", { maximumFractionDigits: 2 }).format(n);
const seedProducts: Product[] = [];

export default function Home() {
  const [tab, setTab] = useState("dashboard");
  const [authUser, setAuthUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [dataLoaded, setDataLoaded] = useState(!supabase);
  const [authEmail, setAuthEmail] = useState("Doraemon");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin"|"signup">("signin");
  const [authBusy, setAuthBusy] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payments, setPayments] = useState<CommissionPayment[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [employeeForm, setEmployeeForm] = useState({name:"",phone:"",role:"Salesman",method:"fixed" as Employee["method"],rate:"15",secondRate:"1",tierLimit:"50",tierRate:"15"});
  const [editingEmployee, setEditingEmployee] = useState<string|null>(null);
  const [payForm, setPayForm] = useState({employeeId:"",amount:"",method:"Cash",note:""});
  const [query, setQuery] = useState("");
  const [barcode, setBarcode] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [shopName, setShopName] = useState("LumaPOS Store");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [logo, setLogo] = useState("");
  const [commissionRate, setCommissionRate] = useState(2);
  const [poolRate, setPoolRate] = useState(0.5);
  const [notice, setNotice] = useState("");
  const [cloudStatus, setCloudStatus] = useState("Local mode");
  const [productForm, setProductForm] = useState({ name:"", price:"", stock:"", barcode:"" });
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [stickerShowPrice, setStickerShowPrice] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const [newAccountEmail, setNewAccountEmail] = useState("");
  const [newAccountPassword, setNewAccountPassword] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const [staffAccounts, setStaffAccounts] = useState<any[]>([]);
  const [staffForm, setStaffForm] = useState({name:"", email:"", password:"", permission:"cashier"});
  const [staffBusy, setStaffBusy] = useState(false);
  const isStaff = authUser?.app_metadata?.role === "staff";
  const ownerId = isStaff ? authUser?.app_metadata?.owner_id : authUser?.id;
  useEffect(() => { if (isStaff && !["dashboard","pos","history"].includes(tab) && !(authUser?.app_metadata?.permission === "manager" && tab === "inventory")) setTab("dashboard"); }, [isStaff, tab, authUser?.app_metadata?.permission]);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setAuthUser(data.session?.user ?? null);
      setAccountEmail(data.session?.user?.email ?? "");
      setAuthLoading(false);
      if (!data.session?.user) setDataLoaded(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setAuthUser(session?.user ?? null);
      setAccountEmail(session?.user?.email ?? "");
      setAuthLoading(false);
      if (!session?.user) setDataLoaded(false);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  const submitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setAuthBusy(true); setNotice("");
    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword });
        if (error) throw error;
        if (!data.session) setNotice("Account created. Check your email to confirm, then sign in.");
        else setNotice("Account created successfully.");
      } else {
        const identifier = authEmail.trim();
        const loginEmail = identifier.toLowerCase() === "doraemon" ? "doraemonpakistani0318@gmail.com" : identifier;
        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: authPassword });
        if (error) throw error;
      }
    } catch (err: any) { setNotice(err?.message || "Could not authenticate. Please try again."); }
    finally { setAuthBusy(false); }
  };

  const signOut = async () => { if (supabase) await supabase.auth.signOut(); setAuthUser(null); setDataLoaded(false); };

  useEffect(() => {
    if (!supabase || !authUser) return;
    let cancelled = false;
    setDataLoaded(false); setCloudStatus("Loading cloud data…");
    (async () => {
      const { data, error } = await supabase.from("shop_data").select("payload").eq("user_id", ownerId).maybeSingle();
      if (cancelled) return;
      if (error) { setCloudStatus("Cloud setup needed"); setNotice("Cloud data could not load. Check that supabase/schema.sql has been run."); setDataLoaded(true); return; }
      if (data?.payload) {
        const d = data.payload;
        if (Array.isArray(d.products)) setProducts(d.products);
        if (Array.isArray(d.sales)) setSales(d.sales);
        if (Array.isArray(d.employees)) setEmployees(d.employees);
        if (Array.isArray(d.payments)) setPayments(d.payments);
        if (d.settings) {
          setShopName(d.settings.shopName ?? "LumaPOS Store"); setAddress(d.settings.address ?? "");
          setPhone(d.settings.phone ?? ""); setLogo(d.settings.logo ?? "");
          setCommissionRate(d.settings.commissionRate ?? 2); setPoolRate(d.settings.poolRate ?? 0.5); setDeliveryEnabled(d.settings.deliveryEnabled ?? false); setDeliveryFee(String(d.settings.deliveryFee ?? 0)); setStickerShowPrice(d.settings.stickerShowPrice ?? false);
        }
      } else {
        const p = localStorage.getItem("lumapos_products"), s = localStorage.getItem("lumapos_sales"), settings = localStorage.getItem("lumapos_settings");
        const payload: any = { products: p ? JSON.parse(p) : [], sales: s ? JSON.parse(s) : [], employees: JSON.parse(localStorage.getItem("lumapos_employees")||"[]"), payments: JSON.parse(localStorage.getItem("lumapos_payments")||"[]"), settings: settings ? JSON.parse(settings) : {} };
        if (payload.products.length || payload.sales.length) {
          const { error: saveError } = await supabase.from("shop_data").upsert({ user_id: ownerId, payload, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
          if (saveError) setNotice("Local data loaded, but first cloud backup failed: " + saveError.message);
        }
      }
      if (!cancelled) { setDataLoaded(true); setCloudStatus("Cloud connected"); }
    })();
    return () => { cancelled = true; };
  }, [authUser?.id, ownerId]);

  useEffect(() => {
    if (!supabase || !authUser || !dataLoaded) return;
    const timer = window.setTimeout(async () => {
      const payload = { products, sales, employees, payments, settings: { shopName, address, phone, logo, commissionRate, poolRate, deliveryEnabled, deliveryFee: Number(deliveryFee)||0, stickerShowPrice } };
      const { error } = await supabase.from("shop_data").upsert({ user_id: ownerId, payload, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      setCloudStatus(error ? "Cloud save failed" : "Cloud saved");
      if (error) setNotice("Cloud save failed: " + error.message);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [authUser?.id, ownerId, dataLoaded, products, sales, employees, payments, shopName, address, phone, logo, commissionRate, poolRate, deliveryEnabled, deliveryFee, stickerShowPrice]);

  useEffect(() => {
    try {
      const p = localStorage.getItem("lumapos_products");
      const s = localStorage.getItem("lumapos_sales");
      const settings = localStorage.getItem("lumapos_settings");
      if (p) setProducts(JSON.parse(p));
      if (s) setSales(JSON.parse(s));
      const em = localStorage.getItem("lumapos_employees"); if (em) setEmployees(JSON.parse(em));
      const pay = localStorage.getItem("lumapos_payments"); if (pay) setPayments(JSON.parse(pay));
      if (settings) {
        const v = JSON.parse(settings);
        setShopName(v.shopName ?? "LumaPOS Store"); setAddress(v.address ?? "");
        setPhone(v.phone ?? ""); setLogo(v.logo ?? "");
        setCommissionRate(v.commissionRate ?? 2); setPoolRate(v.poolRate ?? 0.5); setDeliveryEnabled(v.deliveryEnabled ?? false); setDeliveryFee(String(v.deliveryFee ?? 0)); setStickerShowPrice(v.stickerShowPrice ?? false);
      }
    } catch { setNotice("Saved browser data could not be read."); }
  }, []);

  useEffect(() => {
    localStorage.setItem("lumapos_products", JSON.stringify(products));
  }, [products]);
  useEffect(() => { localStorage.setItem("lumapos_sales", JSON.stringify(sales)); }, [sales]);
  useEffect(() => { localStorage.setItem("lumapos_employees", JSON.stringify(employees)); }, [employees]);
  useEffect(() => { localStorage.setItem("lumapos_payments", JSON.stringify(payments)); }, [payments]);
  useEffect(() => {
    localStorage.setItem("lumapos_settings", JSON.stringify({shopName,address,phone,logo,commissionRate,poolRate,deliveryEnabled,deliveryFee:Number(deliveryFee)||0,stickerShowPrice}));
  }, [shopName,address,phone,logo,commissionRate,poolRate,deliveryEnabled,deliveryFee,stickerShowPrice]);

  const totalCart = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);
  const totalDue = totalCart + (deliveryEnabled ? Math.max(0, Number(deliveryFee)||0) : 0);
  const todaySales = sales.filter(s => new Date(s.createdAt).toDateString() === new Date().toDateString());
  const todayTotal = todaySales.reduce((sum, s) => sum + s.total, 0);
  const stockUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const stockValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);
  const commissionTotal = todaySales.reduce((sum, s) => sum + s.commission, 0);
  const filteredProducts = products.filter(p => `${p.name} ${p.barcode}`.toLowerCase().includes(query.toLowerCase()));

  const saveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const name = productForm.name.trim();
    const price = Number(productForm.price), stock = Number(productForm.stock);
    if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
      setNotice("Enter a product name, a valid price and a whole-number stock quantity."); return;
    }
    const code = productForm.barcode.trim() || `LP${Date.now().toString().slice(-9)}`;
    if (products.some(p => p.barcode === code && p.id !== editing)) { setNotice("That barcode is already assigned to another product."); return; }
    if (editing) setProducts(prev => prev.map(p => p.id === editing ? {...p, name, price, stock, barcode:code} : p));
    else setProducts(prev => [...prev, {id: crypto.randomUUID(), name, price, stock, barcode:code}]);
    setProductForm({name:"",price:"",stock:"",barcode:""}); setEditing(null); setNotice("Product saved.");
  };

  const editProduct = (p: Product) => {
    setEditing(p.id); setProductForm({name:p.name,price:String(p.price),stock:String(p.stock),barcode:p.barcode});
    setTab("inventory"); window.scrollTo({top:0,behavior:"smooth"});
  };
  const addToCart = (e: React.FormEvent) => {
    e.preventDefault();
    const q = barcode.trim().toLowerCase();
    if (!q) return;
    const p = products.find(x => x.barcode.toLowerCase() === q) || products.find(x => x.name.toLowerCase().includes(q));
    if (!p) { setNotice("Product not found. Add it in Inventory first."); return; }
    const inCart = cart.find(x => x.id === p.id)?.qty || 0;
    if (p.stock <= inCart) { setNotice("Not enough stock available."); setBarcode(""); return; }
    setCart(prev => {
      const exists = prev.find(x => x.id === p.id);
      return exists ? prev.map(x => x.id === p.id ? {...x,qty:x.qty+1}:x) : [...prev,{...p,qty:1}];
    });
    setBarcode(""); setNotice(`${p.name} added to cart.`);
  };
  const changeQty = (id: string, delta: number) => setCart(prev => prev.flatMap(item => {
    if (item.id !== id) return [item];
    const next = item.qty + delta;
    if (next < 1) return [];
    const product = products.find(p => p.id === id);
    if (product && next > product.stock) { setNotice("Quantity exceeds available stock."); return [item]; }
    return [{...item,qty:next}];
  }));
  const completeSale = async () => {
    if (!cart.length) { setNotice("Your cart is empty."); return; }
    if (cart.some(item => (products.find(p => p.id === item.id)?.stock ?? 0) < item.qty)) { setNotice("Stock changed; review your cart."); return; }
    const actualDeliveryFee = deliveryEnabled ? Math.max(0, Number(deliveryFee)||0) : 0;
    const total = totalCart + actualDeliveryFee;
    const employee = employees.find(e => e.id === selectedEmployee && e.active);
    let commission = total * commissionRate / 100;
    if (employee) {
      const count = sales.filter(s => s.employeeId === employee.id).length + 1;
      if (employee.method === "fixed") commission = employee.rate;
      if (employee.method === "percent") commission = total * employee.rate / 100;
      if (employee.method === "tiered") commission = count <= employee.tierLimit ? employee.rate : employee.tierRate;
      if (employee.method === "combined") commission = employee.rate + total * employee.secondRate / 100;
    }
    const sale: Sale = {id:crypto.randomUUID(),total,deliveryFee:actualDeliveryFee,commission,employeeId:employee?.id,employeeName:employee?.name,items:cart,createdAt:new Date().toISOString()};
    setProducts(prev => prev.map(p => { const item = cart.find(c => c.id === p.id); return item ? {...p,stock:p.stock-item.qty} : p; }));
    setSales(prev => [sale,...prev]); setCart([]); setNotice(`Sale completed — Rs. ${money(total)}. Commission: Rs. ${money(commission)}.`);
    if (supabase && authUser) setCloudStatus("Saving sale to cloud…");
  };
  const printSaleSlip = (sale: Sale) => {
    const safe = (v: string) => v.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"}[c] || c));
    const rows = sale.items.map(i => `<tr><td>${safe(i.name)}</td><td>${i.qty}</td><td>Rs. ${money(i.price)}</td><td>Rs. ${money(i.price*i.qty)}</td></tr>`).join("");
    const html = `<!doctype html><html><head><title>Sale receipt</title><style>@page{size:80mm auto;margin:4mm}body{font:12px Arial;color:#111}h2,p{text-align:center;margin:4px 0}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{padding:5px 2px;border-bottom:1px dashed #999;text-align:left;font-size:11px}.total{font-size:16px;font-weight:bold;text-align:right}.muted{text-align:center;color:#555;font-size:10px}</style></head><body><h2>${safe(shopName)}</h2><p>${safe(address)}</p><p>${safe(phone)}</p><hr><p>SALE RECEIPT</p><p>#${sale.id.slice(0,8).toUpperCase()}</p><p>${new Date(sale.createdAt).toLocaleString()}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><p style="text-align:right">Subtotal: Rs. ${money(sale.total-(sale.deliveryFee||0))}</p><p style="text-align:right">Delivery: Rs. ${money(sale.deliveryFee||0)}</p><p class="total">TOTAL: Rs. ${money(sale.total)}</p>${sale.returnedAt?'<p>RETURNED</p>':''}<hr><p class="muted">Thank you for shopping with us!</p><script>window.onload=()=>setTimeout(()=>window.print(),200)</script></body></html>`;
    const win = window.open("", "_blank", "width=420,height=720");
    if (!win) { setNotice("Allow pop-ups to print the receipt."); return; }
    win.document.write(html); win.document.close();
  };
  const returnSale = (sale: Sale) => {
    if (sale.returnedAt) { setNotice("This sale has already been returned."); return; }
    if (!confirm(`Return sale #${sale.id.slice(0,8).toUpperCase()} for Rs. ${money(sale.total)}? Items will be returned to stock and its commission deducted from the employee's next commission balance.`)) return;
    setProducts(prev => prev.map(p => { const returned = sale.items.find(i => i.id === p.id); return returned ? {...p, stock:p.stock+returned.qty} : p; }));
    setSales(prev => prev.map(s => s.id === sale.id ? {...s, returnedAt:new Date().toISOString(), returnReason:"Full sale return"} : s));
    setNotice(`Sale returned. Stock restored; Rs. ${money(sale.commission)} commission reversal applied.`);
  };
  const updateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !authUser) { setNotice("Sign in to Supabase before changing account credentials."); return; }
    if (!newAccountEmail.trim() && !newAccountPassword) { setNotice("Enter a new email and/or password."); return; }
    if (newAccountPassword && newAccountPassword.length < 8) { setNotice("Use a password of at least 8 characters."); return; }
    setAccountBusy(true); setNotice("");
    try {
      const updates: {email?:string;password?:string} = {};
      if (newAccountEmail.trim()) updates.email = newAccountEmail.trim();
      if (newAccountPassword) updates.password = newAccountPassword;
      const {data,error} = await supabase.auth.updateUser(updates);
      if (error) throw error;
      setAccountEmail(data.user?.email || accountEmail);
      setNewAccountEmail(""); setNewAccountPassword("");
      setNotice(updates.email ? "Account update requested. Supabase may require email confirmation before the new email becomes active." : "Password updated successfully.");
    } catch (err:any) { setNotice(err?.message || "Could not update account credentials."); }
    finally { setAccountBusy(false); }
  };
  const saveSettings = () => { setNotice(supabase && authUser ? "Shop settings saved; syncing to your cloud account." : "Shop settings saved on this device."); };
  const uploadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 2_000_000) { setNotice("Please choose a logo smaller than 2 MB."); return; }
    const reader = new FileReader(); reader.onload = () => setLogo(String(reader.result || "")); reader.readAsDataURL(file);
  };
  const exportData = () => {
    const blob = new Blob([JSON.stringify({products,sales,employees,payments,settings:{shopName,address,phone,logo,commissionRate,poolRate,deliveryEnabled,deliveryFee:Number(deliveryFee)||0,stickerShowPrice}},null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download="lumapos-backup.json"; a.click(); URL.revokeObjectURL(url);
  };
  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file=e.target.files?.[0]; if(!file)return;
    const reader=new FileReader(); reader.onload=()=>{try{const d=JSON.parse(String(reader.result)); if(!Array.isArray(d.products)||!Array.isArray(d.sales))throw Error(); setProducts(d.products);setSales(d.sales);setEmployees(Array.isArray(d.employees)?d.employees:[]);setPayments(Array.isArray(d.payments)?d.payments:[]);if(d.settings){setShopName(d.settings.shopName||shopName);setAddress(d.settings.address||"");setPhone(d.settings.phone||"");setLogo(d.settings.logo||"");setCommissionRate(d.settings.commissionRate??2);setPoolRate(d.settings.poolRate??0.5);setDeliveryEnabled(d.settings.deliveryEnabled??false);setDeliveryFee(String(d.settings.deliveryFee??0));setStickerShowPrice(d.settings.stickerShowPrice??false);}setNotice("Backup imported.");}catch{setNotice("Invalid backup file.");}};reader.readAsText(file);
  };

  const saveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeForm.name.trim() || Number(employeeForm.rate) < 0 || Number(employeeForm.secondRate) < 0) { setNotice("Enter a valid employee name and commission values."); return; }
    const item: Employee = { id: editingEmployee || crypto.randomUUID(), name: employeeForm.name.trim(), phone: employeeForm.phone.trim(), role: employeeForm.role, active: true, method: employeeForm.method, rate: Number(employeeForm.rate)||0, secondRate: Number(employeeForm.secondRate)||0, tierLimit: Math.max(1,Number(employeeForm.tierLimit)||50), tierRate: Number(employeeForm.tierRate)||0 };
    setEmployees(prev => editingEmployee ? prev.map(x => x.id===editingEmployee ? item : x) : [...prev,item]);
    setEmployeeForm({name:"",phone:"",role:"Salesman",method:"fixed",rate:"15",secondRate:"1",tierLimit:"50",tierRate:"15"}); setEditingEmployee(null); setNotice("Employee saved. It will sync with your shop data.");
  };
  const payCommission = (e: React.FormEvent) => {
    e.preventDefault(); const amount=Number(payForm.amount); const employee=employees.find(x=>x.id===payForm.employeeId);
    if (!employee || !Number.isFinite(amount) || amount<=0) { setNotice("Choose an employee and enter a payment amount."); return; }
    const outstanding = sales.filter(s=>s.employeeId===employee.id).reduce((n,s)=>n+s.commission*(s.returnedAt?-1:1),0)-payments.filter(p=>p.employeeId===employee.id).reduce((n,p)=>n+p.amount,0);
    if (amount > outstanding + 0.001) { setNotice("Payment cannot exceed the employee's remaining commission."); return; }
    setPayments(prev=>[{id:crypto.randomUUID(),employeeId:employee.id,amount,method:payForm.method,note:payForm.note,createdAt:new Date().toISOString()},...prev]); setPayForm({employeeId:employee.id,amount:"",method:"Cash",note:""}); setNotice("Commission payment recorded.");
  };

  const loadStaffAccounts = async () => {
    if (!supabase || !authUser || isStaff) return;
    setStaffBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/staff", { headers: { Authorization: `Bearer ${session?.access_token || ""}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not load staff accounts.");
      setStaffAccounts(body.staff || []);
    } catch (err: any) { setNotice(err.message || "Could not load staff accounts."); }
    finally { setStaffBusy(false); }
  };
  const createStaffAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || isStaff) return;
    if (staffForm.password.length < 8) { setNotice("Use a password with at least 8 characters."); return; }
    setStaffBusy(true); setNotice("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/staff", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` }, body: JSON.stringify(staffForm) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not create staff account.");
      setStaffForm({name:"",email:"",password:"",permission:"cashier"});
      setNotice("Staff login created. Share the email and temporary password privately.");
      await loadStaffAccounts();
    } catch (err: any) { setNotice(err.message || "Could not create staff account."); }
    finally { setStaffBusy(false); }
  };
  const toggleStaffAccount = async (id: string, active: boolean) => {
    if (!supabase || isStaff) return;
    setStaffBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/staff", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` }, body: JSON.stringify({ id, active }) });
      const body = await res.json(); if (!res.ok) throw new Error(body.error || "Could not update account.");
      await loadStaffAccounts(); setNotice(active ? "Staff account enabled." : "Staff account disabled.");
    } catch (err: any) { setNotice(err.message || "Could not update account."); }
    finally { setStaffBusy(false); }
  };

  const nav = [
    {id:"dashboard",label:"Dashboard",icon:LayoutDashboard},
    {id:"pos",label:"Point of Sale",icon:ShoppingCart},
    {id:"inventory",label:"Inventory",icon:Package},
    {id:"commissions",label:"Staff & Commissions",icon:Users},
    {id:"staff-accounts",label:"Staff Accounts",icon:LockKeyhole},
    {id:"history",label:"Sales History",icon:ReceiptText},
    {id:"settings",label:"Settings",icon:Settings},
  ].filter(n => !isStaff || ["dashboard","pos","history", ...(authUser?.app_metadata?.permission === "manager" ? ["inventory"] : [])].includes(n.id));
  const side = <><div className="brand"><div className="brand-icon">{logo ? <img src={logo} alt="Shop logo"/> : <Boxes size={23}/>}</div><div><strong>{shopName}</strong><small>SHOP MANAGEMENT</small></div></div><nav>{nav.map(n=>{const Icon=n.icon;return <button key={n.id} className={`nav-item ${tab===n.id?"active":""}`} onClick={()=>{setTab(n.id);setMobileNav(false)}}><Icon size={19}/><span>{n.label}</span>{n.id==="pos"&&cart.length>0&&<b className="nav-count">{cart.reduce((s,i)=>s+i.qty,0)}</b>}</button>})}</nav><div className="side-bottom"><div className="cloud-status"><span className={`status-dot ${supabase?"online":""}`}/><div><b>{supabase?"Cloud configured":"Local storage"}</b><small>{supabase?"Supabase connection set":"Data stays in this browser"}</small></div></div><p>© 2026 {shopName}</p></div></>;

  // Fail closed: never show the POS dashboard when Supabase is not configured.
  if (!supabase || authLoading || !authUser) {
    return <div className="auth-shell"><div className="auth-card"><div className="auth-logo"><LockKeyhole size={26}/></div><p className="eyebrow">LUMAPOS SECURE WORKSPACE</p><h1>{!supabase ? "Login setup required" : authMode === "signin" ? "Welcome back" : "Create your shop account"}</h1><p className="auth-subtitle">{!supabase ? "The POS is locked because cloud authentication is not configured. Add your Supabase project URL and public anon key in Netlify, then redeploy." : "Sign in to access your shop data securely across devices."}</p>{!supabase ? <div className="notice auth-notice" role="alert">Required Netlify environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. Then trigger a new production deploy. Do not add a service-role key to public variables.</div> : authLoading ? <p>Checking your session…</p> : <form onSubmit={submitAuth} className="auth-form"><label>{authMode === "signin" ? "Username or email" : "Email address"}<input type={authMode === "signin" ? "text" : "email"} required autoComplete={authMode === "signin" ? "username" : "email"} value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder={authMode === "signin" ? "Doraemon or you@example.com" : "you@example.com"}/></label><label>Password<input type="password" required minLength={6} autoComplete={authMode === "signin" ? "current-password" : "new-password"} value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="At least 6 characters"/></label><button className="primary-button" disabled={authBusy} type="submit">{authBusy ? "Please wait…" : authMode === "signin" ? "Sign in securely" : "Create account"}</button><button className="text-button auth-switch" type="button" onClick={()=>{setAuthMode(authMode === "signin" ? "signup" : "signin");setNotice("")}}>{authMode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}</button>{notice&&<p className="notice auth-notice">{notice}</p>}</form>}<p className="auth-foot">Your shop data is protected by account-based database policies.</p></div></div>;
  }
  if (supabase && authUser && !dataLoaded) return <div className="auth-shell"><div className="auth-card"><div className="auth-logo"><Cloud size={26}/></div><h1>Loading your shop</h1><p className="auth-subtitle">Syncing products, sales and settings from secure cloud storage…</p></div></div>;

  return <div className="app-shell">
    <aside className="sidebar desktop-side">{side}</aside>
    {mobileNav&&<><button className="scrim" aria-label="Close menu" onClick={()=>setMobileNav(false)}/><aside className="sidebar mobile-side"><button className="close-nav" onClick={()=>setMobileNav(false)}><X/></button>{side}</aside></>}
    <main className="main-area">
      <header className="topbar"><button className="icon-button mobile-menu" onClick={()=>setMobileNav(true)}><Menu/></button><div><div className="eyebrow">WORKSPACE / {tab.toUpperCase()}</div><h1>{nav.find(n=>n.id===tab)?.label}</h1></div><div className="top-actions">{supabase&&authUser&&<button className="icon-button" title="Sign out" onClick={signOut}><LogOut size={18}/></button>}<span className="date-pill">{new Date().toLocaleDateString("en-PK",{day:"numeric",month:"short",year:"numeric"})}</span><button className="avatar" title="Admin">A</button></div></header>
      {notice&&<div className="notice"><span>{notice}</span><button onClick={()=>setNotice("")} aria-label="Dismiss"><X size={16}/></button></div>}
      {tab==="dashboard"&&<section className="page-stack">
        <div className="welcome"><div><span className="welcome-kicker">YOUR BUSINESS AT A GLANCE</span><h2>Good to see you, {isStaff ? (authUser.user_metadata?.name || "Team member") : "Admin"} <span>✦</span></h2><p>Here’s what’s happening at your shop today.</p></div><button className="primary-button" onClick={()=>setTab("pos")}><Plus size={18}/> New sale</button></div>
        <div className="stats-grid">
          <Stat icon={CircleDollarSign} label="Today's Sales" value={`Rs. ${money(todayTotal)}`} hint={`${todaySales.length} completed sale${todaySales.length===1?"":"s"} today`} />
          <Stat icon={Package} label="Products" value={String(products.length)} hint={`${stockUnits} units currently in stock`} />
          <Stat icon={Boxes} label="Inventory Value" value={`Rs. ${money(stockValue)}`} hint="Based on current selling prices" />
          <Stat icon={TrendingUp} label="Staff Commission" value={`Rs. ${money(commissionTotal)}`} hint="Earned from today's sales" />
        </div>
        <div className="content-grid">
          <section className="panel"><div className="panel-heading"><div><h3>Recent sales</h3><p>Your latest completed transactions</p></div><button className="text-button" onClick={()=>setTab("history")}>View history <span>→</span></button></div>
            {sales.length===0?<Empty icon={ReceiptText} title="No sales yet" text="Completed transactions will appear here." action="Start a sale" onAction={()=>setTab("pos")}/>:<div className="table-wrap"><table><thead><tr><th>Transaction</th><th>Date & time</th><th>Items</th><th>Total</th></tr></thead><tbody>{sales.slice(0,5).map(s=><tr key={s.id}><td><b className="txn-id">#{s.id.slice(0,8).toUpperCase()}</b></td><td>{new Date(s.createdAt).toLocaleString()}</td><td>{s.items.reduce((n,i)=>n+i.qty,0)}</td><td className="amount">Rs. {money(s.total)} {s.returnedAt&&<span className="stock-pill out">Returned</span>}</td></tr>)}</tbody></table></div>}
          </section>
          <section className="panel quick-panel"><div className="panel-heading"><div><h3>Quick actions</h3><p>Get things done faster</p></div></div><button className="quick-action" onClick={()=>{setTab("pos");setNotice("")}}><span className="quick-icon purple"><ShoppingCart/></span><span><b>Start a sale</b><small>Scan items and checkout</small></span><span className="arrow">↗</span></button>{!isStaff&&<button className="quick-action" onClick={()=>{setTab("inventory");setEditing(null);setProductForm({name:"",price:"",stock:"",barcode:""})}}><span className="quick-icon blue"><Plus/></span><span><b>Add a product</b><small>Update your inventory</small></span><span className="arrow">↗</span></button>}{!isStaff&&<button className="quick-action" onClick={exportData}><span className="quick-icon green"><Download/></span><span><b>Export backup</b><small>Save a copy of your records</small></span><span className="arrow">↗</span></button>}</section>
        </div>
      </section>}
      {tab==="pos"&&<section className="page-stack"><div className="section-intro"><h2>Point of Sale</h2><p>Scan a barcode or search for a product to add it to the current order.</p></div><div className="pos-layout"><div className="panel scan-panel"><div className="panel-heading"><div><h3><ScanLine size={20}/> Add items</h3><p>Barcode scanner or product name</p></div><span className="live-tag">READY</span></div><form className="scan-form" onSubmit={addToCart}><div className="search-input"><ScanLine size={20}/><input autoFocus value={barcode} onChange={e=>setBarcode(e.target.value)} placeholder="Scan or type barcode / name…"/></div><button className="primary-button" type="submit">Add item</button></form><div className="hint">Tip: USB barcode scanners usually work like a keyboard. Scan the code, then press Enter.</div><h4 className="subheading">Available products</h4><div className="available-list">{products.filter(p=>p.stock>0).slice(0,8).map(p=><button key={p.id} className="available-item" onClick={()=>{setBarcode(p.barcode);}}><span className="product-initial">{p.name.slice(0,1).toUpperCase()}</span><span className="available-info"><b>{p.name}</b><small>{p.stock} in stock · {p.barcode}</small></span><b>Rs. {money(p.price)}</b><Plus size={16}/></button>)}</div></div>
        <div className="panel cart-panel"><div className="panel-heading"><div><h3>Current order</h3><p>{cart.reduce((s,i)=>s+i.qty,0)} item(s)</p></div><button className="text-button" onClick={()=>setCart([])}>Clear cart</button></div><div className="cart-list">{cart.length===0?<Empty icon={ShoppingCart} title="Your cart is empty" text="Scan a product to get started."/>:cart.map(item=><div className="cart-item" key={item.id}><div className="product-initial">{item.name.slice(0,1).toUpperCase()}</div><div className="cart-description"><b>{item.name}</b><small>Rs. {money(item.price)} each</small><div className="qty-control"><button onClick={()=>changeQty(item.id,-1)} aria-label="Decrease quantity">−</button><b>{item.qty}</b><button onClick={()=>changeQty(item.id,1)} aria-label="Increase quantity">+</button></div></div><div className="cart-price"><b>Rs. {money(item.price*item.qty)}</b><button className="remove-button" onClick={()=>setCart(prev=>prev.filter(x=>x.id!==item.id))} aria-label="Remove item"><Trash2 size={16}/></button></div></div>)}</div><div className="checkout"><label>Salesman (optional)<select value={selectedEmployee} onChange={e=>setSelectedEmployee(e.target.value)}><option value="">No employee assigned</option>{employees.filter(e=>e.active).map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label><div className="total-line"><span>Subtotal</span><b>Rs. {money(totalCart)}</b></div><label className="delivery-toggle"><span><input type="checkbox" checked={deliveryEnabled} onChange={e=>setDeliveryEnabled(e.target.checked)}/> Include delivery charge on this bill</span></label>{deliveryEnabled&&<label>Delivery fee (Rs.)<input type="number" onFocus={e=>{if(e.currentTarget.value.trim()!=="" && Number(e.currentTarget.value)===0)e.currentTarget.select();}} min="0" step="0.01" value={deliveryFee} onChange={e=>setDeliveryFee(e.target.value)}/></label>}{deliveryEnabled&&<div className="total-line"><span>Delivery</span><b>Rs. {money(Math.max(0,Number(deliveryFee)||0))}</b></div>}<div className="total-line muted"><span>Estimated commission</span><span>Rs. {money((()=>{const e=employees.find(x=>x.id===selectedEmployee&&x.active);if(!e)return totalCart*commissionRate/100;if(e.method==="fixed")return e.rate;if(e.method==="percent")return totalCart*e.rate/100;if(e.method==="tiered")return (sales.filter(s=>s.employeeId===e.id).length+1)<=e.tierLimit?e.rate:e.tierRate;return e.rate+totalCart*e.secondRate/100;})())}</span></div><div className="grand-total"><span>Total due</span><b>Rs. {money(totalDue)}</b></div><button className="checkout-button" disabled={!cart.length} onClick={completeSale}><CreditCard size={19}/> Complete sale</button><p className="checkout-note">Stock is deducted when the sale is completed.</p></div></div></div></section>}
      {tab==="inventory"&&<section className="page-stack"><div className="section-intro"><h2>Inventory management</h2><p>Add products, update prices and keep track of stock levels.</p></div><div className="panel form-panel"><div className="panel-heading"><div><h3><Plus size={20}/>{editing?"Edit product":"Add a new product"}</h3><p>Fields marked with * are required.</p></div>{editing&&<button className="text-button" onClick={()=>{setEditing(null);setProductForm({name:"",price:"",stock:"",barcode:""})}}>Cancel edit</button>}</div><form className="product-form" onSubmit={saveProduct}><label>Product name *<input required value={productForm.name} onChange={e=>setProductForm({...productForm,name:e.target.value})} placeholder="e.g. Cotton T-Shirt"/></label><label>Price (Rs.) *<input required min="0" type="number" onFocus={e=>{if(e.currentTarget.value.trim()!=="" && Number(e.currentTarget.value)===0)e.currentTarget.select();}} step="0.01" value={productForm.price} onChange={e=>setProductForm({...productForm,price:e.target.value})} placeholder="0.00"/></label><label>Stock quantity *<input required min="0" step="1" type="number" onFocus={e=>{if(e.currentTarget.value.trim()!=="" && Number(e.currentTarget.value)===0)e.currentTarget.select();}} value={productForm.stock} onChange={e=>setProductForm({...productForm,stock:e.target.value})} placeholder="0"/></label><label>Barcode<input value={productForm.barcode} onChange={e=>setProductForm({...productForm,barcode:e.target.value})} placeholder="Auto-generated if empty"/></label><button className="primary-button form-submit" type="submit"><Save size={17}/>{editing?"Update product":"Save product"}</button></form></div><StickerStudio products={products} showPrice={stickerShowPrice} setShowPrice={setStickerShowPrice} money={money}/><div className="panel"><div className="panel-heading inventory-heading"><div><h3>All products <span className="count-pill">{products.length}</span></h3><p>Review and manage every item in your store.</p></div><div className="small-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search products…"/></div></div>{filteredProducts.length===0?<Empty icon={Package} title="No products found" text={query?"Try a different search term.":"Add your first product using the form above."}/>:<div className="table-wrap"><table><thead><tr><th>Product</th><th>Barcode</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead><tbody>{filteredProducts.map(p=><tr key={p.id}><td><div className="table-product"><span className="product-initial">{p.name.slice(0,1).toUpperCase()}</span><b>{p.name}</b></div></td><td className="code-text">{p.barcode}</td><td>Rs. {money(p.price)}</td><td><span className={`stock-pill ${p.stock===0?"out":p.stock<5?"low":""}`}>{p.stock} units</span></td><td><div className="row-actions"><button onClick={()=>editProduct(p)} aria-label="Edit product"><Pencil size={16}/></button><button className="danger" onClick={()=>{if(confirm(`Delete ${p.name}?`))setProducts(prev=>prev.filter(x=>x.id!==p.id));}} aria-label="Delete product"><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div>}</div></section>}
      {tab==="commissions"&&<section className="page-stack"><div className="section-intro"><h2>Employees & commissions</h2><p>Add staff and choose fixed, percentage, tiered, or combined commission for each employee.</p></div>
      <div className="stats-grid compact-stats"><Stat icon={Users} label="Employees" value={String(employees.length)} hint={`${employees.filter(e=>e.active).length} active`}/><Stat icon={TrendingUp} label="Commission earned" value={`Rs. ${money(sales.reduce((n,s)=>n+s.commission*(s.returnedAt?-1:1),0))}`} hint="Across completed sales"/><Stat icon={CreditCard} label="Commission paid" value={`Rs. ${money(payments.reduce((n,p)=>n+p.amount,0))}`} hint="Recorded payments"/><Stat icon={CircleDollarSign} label="Outstanding" value={`Rs. ${money(Math.max(0,sales.reduce((n,s)=>n+s.commission*(s.returnedAt?-1:1),0)-payments.reduce((n,p)=>n+p.amount,0)))}`} hint="Unpaid employee commission"/></div>
      <div className="panel form-panel"><div className="panel-heading"><div><h3>{editingEmployee?"Edit employee":"Add employee"}</h3><p>Set commission method individually for each staff member.</p></div></div><form className="product-form" onSubmit={saveEmployee}><label>Full name *<input required value={employeeForm.name} onChange={e=>setEmployeeForm({...employeeForm,name:e.target.value})} placeholder="Employee name"/></label><label>Phone number<input value={employeeForm.phone} onChange={e=>setEmployeeForm({...employeeForm,phone:e.target.value})} placeholder="03xx-xxxxxxx"/></label><label>Role<select value={employeeForm.role} onChange={e=>setEmployeeForm({...employeeForm,role:e.target.value})}><option>Salesman</option><option>Sales Staff</option><option>Cashier</option><option>Stock Manager</option><option>Other</option></select></label><label>Commission method<select value={employeeForm.method} onChange={e=>setEmployeeForm({...employeeForm,method:e.target.value as Employee["method"]})}><option value="fixed">Fixed amount per sale</option><option value="percent">Percentage of sale</option><option value="tiered">Tiered per-sale amount</option><option value="combined">Fixed + percentage</option></select></label><label>{employeeForm.method==="percent"?"Percentage (%)":employeeForm.method==="combined"?"Fixed amount per sale (Rs.)":"Commission per sale (Rs.)"}<input type="number" onFocus={e=>{if(e.currentTarget.value.trim()!=="" && Number(e.currentTarget.value)===0)e.currentTarget.select();}} min="0" step="0.01" required value={employeeForm.rate} onChange={e=>setEmployeeForm({...employeeForm,rate:e.target.value})}/></label>{employeeForm.method==="combined"&&<label>Additional percentage (%)<input type="number" onFocus={e=>{if(e.currentTarget.value.trim()!=="" && Number(e.currentTarget.value)===0)e.currentTarget.select();}} min="0" step="0.1" value={employeeForm.secondRate} onChange={e=>setEmployeeForm({...employeeForm,secondRate:e.target.value})}/></label>}{employeeForm.method==="tiered"&&<><label>Up to how many sales?<input type="number" onFocus={e=>{if(e.currentTarget.value.trim()!=="" && Number(e.currentTarget.value)===0)e.currentTarget.select();}} min="1" value={employeeForm.tierLimit} onChange={e=>setEmployeeForm({...employeeForm,tierLimit:e.target.value})}/></label><label>Commission after limit (Rs./sale)<input type="number" onFocus={e=>{if(e.currentTarget.value.trim()!=="" && Number(e.currentTarget.value)===0)e.currentTarget.select();}} min="0" step="0.01" value={employeeForm.tierRate} onChange={e=>setEmployeeForm({...employeeForm,tierRate:e.target.value})}/></label></>}<button className="primary-button form-submit" type="submit"><Save size={17}/>{editingEmployee?"Update employee":"Save employee"}</button></form></div>
      <div className="panel"><div className="panel-heading"><div><h3>Employee list</h3><p>Commission earned, payments and outstanding balance.</p></div></div>{employees.length===0?<Empty icon={Users} title="No employees added yet" text="Add your first employee above to assign commissions at checkout."/>:<div className="table-wrap"><table><thead><tr><th>Employee</th><th>Role</th><th>Commission method</th><th>Earned</th><th>Paid</th><th>Balance</th><th>Actions</th></tr></thead><tbody>{employees.map(emp=>{const earned=sales.filter(s=>s.employeeId===emp.id).reduce((n,s)=>n+s.commission,0);const paid=payments.filter(p=>p.employeeId===emp.id).reduce((n,p)=>n+p.amount,0);const methodLabel={fixed:`Rs. ${money(emp.rate)} / sale`,percent:`${emp.rate}% of sale`,tiered:`Rs. ${money(emp.rate)} then Rs. ${money(emp.tierRate)}`,combined:`Rs. ${money(emp.rate)} + ${emp.secondRate}%`}[emp.method];return <tr key={emp.id}><td><b>{emp.name}</b><small className="table-subtext">{emp.phone||"No phone added"}</small></td><td>{emp.role}</td><td>{methodLabel}</td><td>Rs. {money(earned)}</td><td>Rs. {money(paid)}</td><td className="amount">Rs. {money(Math.max(0,earned-paid))}</td><td><div className="row-actions"><button onClick={()=>{setEditingEmployee(emp.id);setEmployeeForm({name:emp.name,phone:emp.phone,role:emp.role,method:emp.method,rate:String(emp.rate),secondRate:String(emp.secondRate),tierLimit:String(emp.tierLimit),tierRate:String(emp.tierRate)});window.scrollTo({top:0,behavior:"smooth"})}} aria-label="Edit employee"><Pencil size={16}/></button><button onClick={()=>setEmployees(prev=>prev.map(x=>x.id===emp.id?{...x,active:!x.active}:x))}>{emp.active?"Disable":"Enable"}</button><button className="danger" onClick={()=>{if(confirm(`Remove ${emp.name}? Existing sales history will remain.`))setEmployees(prev=>prev.filter(x=>x.id!==emp.id))}} aria-label="Delete employee"><Trash2 size={16}/></button></div></td></tr>})}</tbody></table></div>}</div>
      <div className="panel form-panel"><div className="panel-heading"><div><h3>Record commission payment</h3><p>Record full or partial payments against earned commission.</p></div></div><form className="product-form" onSubmit={payCommission}><label>Employee *<select required value={payForm.employeeId} onChange={e=>setPayForm({...payForm,employeeId:e.target.value})}><option value="">Choose employee</option>{employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label><label>Amount paid (Rs.) *<input required type="number" onFocus={e=>{if(e.currentTarget.value.trim()!=="" && Number(e.currentTarget.value)===0)e.currentTarget.select();}} min="0.01" step="0.01" value={payForm.amount} onChange={e=>setPayForm({...payForm,amount:e.target.value})}/></label><label>Payment method<select value={payForm.method} onChange={e=>setPayForm({...payForm,method:e.target.value})}><option>Cash</option><option>Bank Transfer</option><option>Other</option></select></label><label>Note (optional)<input value={payForm.note} onChange={e=>setPayForm({...payForm,note:e.target.value})} placeholder="e.g. Weekly payment"/></label><button className="primary-button form-submit" type="submit"><CreditCard size={17}/> Record payment</button></form></div>
      <div className="panel"><div className="panel-heading"><div><h3>Commission payment history</h3><p>Recorded payments by date.</p></div></div>{payments.length===0?<Empty icon={ReceiptText} title="No commission payments yet" text="Payments you record will appear here."/>:<div className="table-wrap"><table><thead><tr><th>Date</th><th>Employee</th><th>Method</th><th>Note</th><th>Amount</th></tr></thead><tbody>{payments.map(p=><tr key={p.id}><td>{new Date(p.createdAt).toLocaleString()}</td><td>{employees.find(e=>e.id===p.employeeId)?.name||"Removed employee"}</td><td>{p.method}</td><td>{p.note||"—"}</td><td className="amount">Rs. {money(p.amount)}</td></tr>)}</tbody></table></div>}</div></section>}
      {tab==="staff-accounts"&&!isStaff&&<section className="page-stack"><div className="section-intro"><h2>Staff login accounts</h2><p>Create separate logins for your employees. Never share your owner password.</p></div><div className="panel form-panel"><div className="panel-heading"><div><h3>Create employee login</h3><p>Each employee gets their own email and password.</p></div><Users size={22}/></div><form className="product-form" onSubmit={createStaffAccount}><label>Employee name<input required value={staffForm.name} onChange={e=>setStaffForm({...staffForm,name:e.target.value})} placeholder="Employee full name"/></label><label>Email address<input required type="email" value={staffForm.email} onChange={e=>setStaffForm({...staffForm,email:e.target.value})} placeholder="employee@example.com" autoComplete="off"/></label><label>Temporary password<input required minLength={8} type="password" value={staffForm.password} onChange={e=>setStaffForm({...staffForm,password:e.target.value})} placeholder="At least 8 characters" autoComplete="new-password"/></label><label>Access level<select value={staffForm.permission} onChange={e=>setStaffForm({...staffForm,permission:e.target.value})}><option value="cashier">Cashier — POS and sales history</option><option value="manager">Manager — POS, inventory and sales history</option></select></label><button className="primary-button form-submit" disabled={staffBusy} type="submit">{staffBusy?"Working…":"Create staff login"}</button></form><p className="field-help">Staff accounts are created in Supabase Auth. The employee should sign in with the email and temporary password, then change their password.</p></div><div className="panel"><div className="panel-heading"><div><h3>Your staff accounts</h3><p>Enable or disable an employee login.</p></div><button className="secondary-button" onClick={loadStaffAccounts} disabled={staffBusy}>Refresh list</button></div>{staffAccounts.length===0?<Empty icon={Users} title="No staff accounts loaded" text="Tap Refresh list to view accounts created for your shop."/>:<div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Access</th><th>Status</th><th>Action</th></tr></thead><tbody>{staffAccounts.map(a=><tr key={a.id}><td>{a.name}</td><td>{a.email}</td><td>{a.permission}</td><td>{a.active?"Active":"Disabled"}</td><td><button className="secondary-button" disabled={staffBusy} onClick={()=>toggleStaffAccount(a.id,!a.active)}>{a.active?"Disable":"Enable"}</button></td></tr>)}</tbody></table></div>}</div><div className="cloud-note"><LockKeyhole size={20}/><div><b>Important security note</b><p>This starter stores shop records in one shared JSON payload. The interface hides restricted pages, but that is not equivalent to database-enforced per-action permissions. Use this for a controlled small team only until the POS data model is separated into permission-protected tables.</p></div></div></section>}
      {tab==="history"&&<section className="page-stack"><div className="section-intro"><h2>Sales history</h2><p>Review completed transactions and their calculated commissions.</p></div><div className="stats-grid compact-stats"><Stat icon={ReceiptText} label="Total transactions" value={String(sales.length)} hint="All saved sales"/> <Stat icon={CircleDollarSign} label="Total revenue" value={`Rs. ${money(sales.reduce((sum,x)=>sum+(x.returnedAt?-x.total:x.total),0))}`} hint="Net of full returns"/> <Stat icon={TrendingUp} label="Total commissions" value={`Rs. ${money(sales.reduce((sum,x)=>sum+x.commission*(x.returnedAt?-1:1),0))}`} hint="Across all saved sales"/></div><div className="panel"><div className="panel-heading"><div><h3>All transactions</h3><p>Newest sales appear first.</p></div></div>{sales.length===0?<Empty icon={ReceiptText} title="No transactions yet" text="Complete a sale to see it here." action="Go to POS" onAction={()=>setTab("pos")}/>:<div className="table-wrap"><table><thead><tr><th>Sale ID</th><th>Date & time</th><th>Items</th><th>Commission</th><th>Delivery</th><th>Total</th><th>Status / actions</th></tr></thead><tbody>{sales.map(s=><tr key={s.id}><td className="txn-id">#{s.id.slice(0,8).toUpperCase()}</td><td>{new Date(s.createdAt).toLocaleString()}</td><td>{s.items.map(i=>`${i.name} × ${i.qty}`).join(", ")}{s.employeeName?` · ${s.employeeName}`:""}</td><td>Rs. {money(s.commission)}</td><td>Rs. {money(s.deliveryFee||0)}</td><td className="amount">Rs. {money(s.total)}</td><td><div className="row-actions"><button title="Print receipt" onClick={()=>printSaleSlip(s)}><ReceiptText size={16}/></button>{s.returnedAt?<span className="stock-pill out">Returned</span>:<button className="danger" title="Return sale" onClick={()=>returnSale(s)}><Download size={16}/></button>}</div></td></tr>)}</tbody></table></div>}</div><button className="secondary-button export-history" onClick={exportData}><Download size={17}/> Export all data</button></section>}
      {tab==="settings"&&<section className="page-stack"><div className="section-intro"><h2>Shop settings</h2><p>Personalize your workspace and manage your records.</p></div><div className="panel form-panel"><div className="panel-heading"><div><h3>Business profile</h3><p>These details sync to your account when cloud storage is configured.</p></div></div><div className="logo-setting"><div className="logo-preview">{logo?<img src={logo} alt="Shop logo preview"/>:<Boxes size={30}/>}</div><div><label className="secondary-button upload-button"><Upload size={17}/> Upload logo<input type="file" accept="image/*" onChange={uploadLogo} hidden/></label><p className="field-help">PNG or JPG, up to 2 MB. Optional.</p>{logo&&<button className="text-button" onClick={()=>setLogo("")}>Remove logo</button>}</div></div><div className="settings-fields"><label>Shop name<input value={shopName} onChange={e=>setShopName(e.target.value)} placeholder="Your shop name"/></label><label>Shop address<input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Address shown on receipts"/></label><label>Phone number<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="03xx-xxxxxxx"/></label></div><div className="settings-fields"><label><span><input type="checkbox" checked={deliveryEnabled} onChange={e=>setDeliveryEnabled(e.target.checked)}/> Enable delivery option by default</span></label><label>Default delivery fee (Rs.)<input type="number" onFocus={e=>{if(e.currentTarget.value.trim()!=="" && Number(e.currentTarget.value)===0)e.currentTarget.select();}} min="0" step="0.01" value={deliveryFee} onChange={e=>setDeliveryFee(e.target.value)}/></label><label><span><input type="checkbox" checked={stickerShowPrice} onChange={e=>setStickerShowPrice(e.target.checked)}/> Show price on barcode stickers by default</span></label></div><button className="primary-button" onClick={saveSettings}><Save size={17}/> Save settings</button></div><div className="panel form-panel"><div className="panel-heading"><div><h3>Login & security</h3><p>Change the email or password for your signed-in Supabase account.</p></div><LockKeyhole size={22}/></div><p className="field-help">Current account: <b>{accountEmail || authUser?.email || "Unknown"}</b>. Email changes may require confirmation. Your username alias is managed separately from your email.</p><form className="product-form" onSubmit={updateAccount}><label>New email address<input type="email" value={newAccountEmail} onChange={e=>setNewAccountEmail(e.target.value)} placeholder="Leave blank to keep current email" autoComplete="email"/></label><label>New password<input type="password" minLength={8} value={newAccountPassword} onChange={e=>setNewAccountPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password"/></label><button className="primary-button form-submit" type="submit" disabled={accountBusy}>{accountBusy?"Updating…":"Update login details"}</button></form><p className="field-help">If Supabase email confirmation is enabled, check the inbox for the confirmation link.</p></div><div className="panel form-panel"><div className="panel-heading"><div><h3>Backup & restore</h3><p>Keep a backup before changing device or browser.</p></div><Download size={22}/></div><div className="backup-actions"><button className="secondary-button" onClick={exportData}><Download size={17}/> Export backup (.json)</button><label className="secondary-button upload-button"><Upload size={17}/> Import backup<input type="file" accept="application/json,.json" onChange={importData} hidden/></label></div><p className="field-help">Importing replaces the current product and sales lists. Export first if you need to keep them.</p><div className="cloud-note"><Cloud size={20}/><div><b>{supabase&&authUser?"Secure cloud sync enabled":supabase?"Sign in to enable cloud sync":"Cloud sync not configured"}</b><p>{supabase&&authUser?"Products, sales and shop settings are saved to your account-scoped cloud record.":supabase?"Sign in to load and save your account data.":"The website currently saves to this browser. Configure Supabase to sync across phones and computers."}</p></div></div></div></section>}
      <footer className="footer"><span>{shopName} · Shop management</span><span>Made for your daily workflow</span></footer>
    </main>
  </div>;
}

function Stat({icon:Icon,label,value,hint}:any){return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={19}/></span></div><strong>{value}</strong><small>{hint}</small></div>}
function Empty({icon:Icon,title,text,action,onAction}:any){return <div className="empty-state"><span className="empty-icon"><Icon size={23}/></span><b>{title}</b><p>{text}</p>{action&&<button className="text-button" onClick={onAction}>{action} →</button>}</div>}


function StickerStudio({products,showPrice,setShowPrice,money}:{products:Product[];showPrice:boolean;setShowPrice:(v:boolean)=>void;money:(n:number)=>string}) {
  const [productId,setProductId]=useState(""); const [width,setWidth]=useState("50"); const [height,setHeight]=useState("30"); const [copies,setCopies]=useState("1"); const [format,setFormat]=useState("CODE128");
  const printLabels=()=>{const p=products.find(x=>x.id===productId);if(!p){alert("Choose a product first.");return;}if(!p.barcode){alert("This product has no barcode. Add one in Inventory first.");return;}const w=Math.max(10,Number(width)||50),h=Math.max(10,Number(height)||30),count=Math.min(500,Math.max(1,Number(copies)||1));const safeName=p.name.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]||c));const safeCode=p.barcode.replace(/[^a-zA-Z0-9. $/+%-]/g,"");const labels=Array.from({length:count},()=>`<div class="label"><b>${safeName}</b><svg class="barcode"></svg><small>${safeCode}</small>${showPrice?`<strong>Rs. ${money(p.price)}</strong>`:""}</div>`).join("");const html=`<!doctype html><html><head><title>LumaPOS Barcode Labels</title><style>@page{size:${w}mm ${h}mm;margin:0}body{margin:0;font-family:Arial}.label{width:${w}mm;height:${h}mm;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;padding:1mm;break-after:page}.label b{font-size:9pt;text-align:center}.label svg{width:92%;height:45%}.label small{font-size:8pt}.label strong{font-size:9pt}</style></head><body>${labels}<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script><script>window.onload=()=>{document.querySelectorAll('.label').forEach(el=>{try{JsBarcode(el.querySelector('svg'),'${safeCode}',{format:'${format}',displayValue:false,margin:0})}catch(e){el.querySelector('svg').outerHTML='<p>Barcode format invalid</p>'}});setTimeout(()=>window.print(),300)}</script></body></html>`;const win=window.open("","_blank");if(!win){alert("Allow pop-ups to print labels.");return;}win.document.write(html);win.document.close();};
  return <div className="panel form-panel"><div className="panel-heading"><div><h3>Barcode sticker printing</h3><p>Set any custom label size and choose whether to print the price.</p></div><ScanLine size={22}/></div><div className="product-form"><label>Product<select value={productId} onChange={e=>setProductId(e.target.value)}><option value="">Choose product</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} — {p.barcode||"No barcode"}</option>)}</select></label><label>Width (mm)<input type="number" onFocus={e=>{if(e.currentTarget.value.trim()!=="" && Number(e.currentTarget.value)===0)e.currentTarget.select();}} min="10" value={width} onChange={e=>setWidth(e.target.value)}/></label><label>Height (mm)<input type="number" onFocus={e=>{if(e.currentTarget.value.trim()!=="" && Number(e.currentTarget.value)===0)e.currentTarget.select();}} min="10" value={height} onChange={e=>setHeight(e.target.value)}/></label><label>Copies<input type="number" onFocus={e=>{if(e.currentTarget.value.trim()!=="" && Number(e.currentTarget.value)===0)e.currentTarget.select();}} min="1" max="500" value={copies} onChange={e=>setCopies(e.target.value)}/></label><label>Barcode format<select value={format} onChange={e=>setFormat(e.target.value)}><option value="CODE128">Code 128</option><option value="CODE39">Code 39</option><option value="EAN13">EAN-13</option><option value="UPC">UPC-A</option></select></label><label><span><input type="checkbox" checked={showPrice} onChange={e=>setShowPrice(e.target.checked)}/> Show price on sticker</span></label><button className="primary-button form-submit" type="button" onClick={printLabels}>Print stickers</button></div><p className="field-help">Printing uses your browser and printer driver. Exact size depends on printer settings and label stock.</p></div>;
}
