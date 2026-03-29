import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Users, Plus, RefreshCw, Trash2, Calendar, Shield, Monitor, CreditCard, Megaphone } from "lucide-react";
import { formatWIBDate } from "@/lib/utils";

interface AdminUser {
  id: number;
  telegramId: string;
  telegramUsername: string | null;
  telegramName: string | null;
  password: string;
  plan: string;
  expiresAt: string;
  isActive: boolean;
  isExpired: boolean;
  createdAt: string;
}

interface AdminStrategy {
  id: number;
  name: string;
  type: string;
  marketSymbol: string;
  isActive: boolean;
  isRunning: boolean;
  realizedPnl: number;
  totalOrders: number;
  successfulOrders: number;
  updatedAt: string;
  user: { id: number; telegramName: string | null; telegramUsername: string | null; telegramId: string } | null;
}

interface AdminPayment {
  id: number;
  donationId: string;
  telegramId: string;
  telegramName: string;
  telegramUsername: string | null;
  plan: string;
  amount: number;
  expiresAt: string;
  createdAt: string;
}

const PLAN_LABELS: Record<string, string> = { "30d": "30 Hari", "60d": "60 Hari", "90d": "90 Hari" };

export default function Admin() {
  const [adminPassword, setAdminPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [strategies, setStrategies] = useState<AdminStrategy[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [newTelegramId, setNewTelegramId] = useState("");
  const [newTelegramName, setNewTelegramName] = useState("");
  const [newPlan, setNewPlan] = useState("30d");
  const [addLoading, setAddLoading] = useState(false);

  const [extendId, setExtendId] = useState<number | null>(null);
  const [extendDays, setExtendDays] = useState("30");

  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ sent: number; failed: number } | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  function authHeaders() {
    return { Authorization: `Bearer ${adminPassword}`, "Content-Type": "application/json" };
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    const res = await fetch("/api/admin/users", { headers: authHeaders() });
    if (res.ok) {
      setIsAuthenticated(true);
      const data = await res.json();
      setUsers(data.users ?? []);
    } else {
      setAuthError("Password admin salah");
    }
  }

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", { headers: authHeaders() });
      if (!res.ok) throw new Error("Unauthorized");
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [adminPassword]);

  const fetchStrategies = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/all-strategies", { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setStrategies(data.strategies ?? []);
    } catch { }
  }, [adminPassword]);

  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/payments", { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setPayments(data.payments ?? []);
    } catch { }
  }, [adminPassword]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStrategies();
      fetchPayments();
    }
  }, [isAuthenticated]);

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ telegramId: newTelegramId, telegramName: newTelegramName, plan: newPlan }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Gagal menambah user");
      setNewTelegramId(""); setNewTelegramName(""); setNewPlan("30d");
      await fetchUsers();
    } catch (e: any) { setError(e.message); } finally { setAddLoading(false); }
  }

  async function deactivateUser(id: number) {
    await fetch(`/api/admin/users/${id}`, { method: "DELETE", headers: authHeaders() });
    await fetchUsers();
  }

  async function permanentDeleteUser(id: number) {
    await fetch(`/api/admin/users/${id}?permanent=true`, { method: "DELETE", headers: authHeaders() });
    setConfirmDeleteId(null);
    await fetchUsers();
  }

  async function extendUser(id: number) {
    const days = parseInt(extendDays);
    if (!days || days <= 0) return;
    await fetch(`/api/admin/users/${id}`, {
      method: "PUT", headers: authHeaders(),
      body: JSON.stringify({ extendDays: days }),
    });
    setExtendId(null);
    await fetchUsers();
  }

  async function resetPassword(id: number) {
    await fetch(`/api/admin/users/${id}`, {
      method: "PUT", headers: authHeaders(),
      body: JSON.stringify({ resetPassword: true }),
    });
    await fetchUsers();
  }

  async function handleBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!broadcastMsg.trim()) return;
    setBroadcastLoading(true);
    setBroadcastResult(null);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ message: broadcastMsg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBroadcastResult({ sent: data.sent, failed: data.failed });
      setBroadcastMsg("");
    } catch (e: any) { setError(e.message); } finally { setBroadcastLoading(false); }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Admin Panel</CardTitle>
            <CardDescription>Masukkan password admin untuk melanjutkan.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>Admin Password</Label>
                <Input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} autoFocus />
              </div>
              {authError && (
                <div className="flex items-center gap-2 text-destructive text-sm"><AlertCircle className="h-4 w-4" />{authError}</div>
              )}
              <Button type="submit" className="w-full">Login Admin</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeUsers = users.filter((u) => u.isActive && !u.isExpired).length;
  const expiredUsers = users.filter((u) => u.isExpired).length;
  const runningBots = strategies.filter((s) => s.isRunning).length;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6" /> Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Kelola LighterBot</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { fetchUsers(); fetchStrategies(); fetchPayments(); }} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold">{users.length}</p><p className="text-sm text-muted-foreground">Total User</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-green-600">{activeUsers}</p><p className="text-sm text-muted-foreground">Aktif</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-red-500">{expiredUsers}</p><p className="text-sm text-muted-foreground">Expired</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-blue-500">{runningBots}</p><p className="text-sm text-muted-foreground">Bot Running</p></CardContent></Card>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-3 py-2 rounded">
            <AlertCircle className="h-4 w-4" />{error}
            <button onClick={() => setError("")} className="ml-auto text-xs underline">Dismiss</button>
          </div>
        )}

        <Tabs defaultValue="users">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users" className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Users</TabsTrigger>
            <TabsTrigger value="monitor" className="flex items-center gap-1"><Monitor className="h-3.5 w-3.5" /> Monitor Bot</TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" /> Payments</TabsTrigger>
            <TabsTrigger value="broadcast" className="flex items-center gap-1"><Megaphone className="h-3.5 w-3.5" /> Broadcast</TabsTrigger>
          </TabsList>

          {/* ===== USERS TAB ===== */}
          <TabsContent value="users" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Plus className="h-4 w-4" /> Tambah User Manual</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={addUser} className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-32 space-y-1">
                    <Label className="text-xs">Telegram ID</Label>
                    <Input placeholder="123456789" value={newTelegramId} onChange={(e) => setNewTelegramId(e.target.value)} required />
                  </div>
                  <div className="flex-1 min-w-32 space-y-1">
                    <Label className="text-xs">Nama (opsional)</Label>
                    <Input placeholder="Nama user" value={newTelegramName} onChange={(e) => setNewTelegramName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Paket</Label>
                    <Select value={newPlan} onValueChange={setNewPlan}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30d">30 Hari</SelectItem>
                        <SelectItem value="60d">60 Hari</SelectItem>
                        <SelectItem value="90d">90 Hari</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={addLoading || !newTelegramId}>{addLoading ? "..." : "Tambah"}</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" /> Daftar User ({users.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Belum ada user</p>
                ) : (
                  <div className="space-y-3">
                    {users.map((u) => (
                      <div key={u.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm">{u.telegramName || `User-${u.telegramId}`}
                              {u.telegramUsername && <span className="text-muted-foreground ml-1">@{u.telegramUsername}</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">ID: {u.telegramId}</p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant={u.isExpired ? "destructive" : "default"} className="text-xs">
                              {u.isExpired ? "Expired" : u.isActive ? "Aktif" : "Nonaktif"}
                            </Badge>
                            <Badge variant="outline" className="text-xs">{PLAN_LABELS[u.plan] || u.plan}</Badge>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="font-mono bg-muted px-2 py-0.5 rounded">{u.password}</span>
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> s/d {formatWIBDate(u.expiresAt)}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {extendId === u.id ? (
                            <div className="flex gap-2 items-center">
                              <Input type="number" className="w-20 h-7 text-xs" value={extendDays} onChange={(e) => setExtendDays(e.target.value)} min="1" />
                              <span className="text-xs text-muted-foreground">hari</span>
                              <Button size="sm" className="h-7 text-xs" onClick={() => extendUser(u.id)}>Konfirmasi</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setExtendId(null)}>Batal</Button>
                            </div>
                          ) : confirmDeleteId === u.id ? (
                            <div className="flex gap-2 items-center">
                              <span className="text-xs text-destructive font-medium">Hapus permanen?</span>
                              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => permanentDeleteUser(u.id)}>Ya, Hapus</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setConfirmDeleteId(null)}>Batal</Button>
                            </div>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setExtendId(u.id); setExtendDays("30"); }}>
                                <Calendar className="h-3 w-3 mr-1" /> Perpanjang
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => resetPassword(u.id)}>Reset Password</Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs text-orange-500 border-orange-500/30 hover:bg-orange-500/10" onClick={() => deactivateUser(u.id)}>
                                Nonaktifkan
                              </Button>
                              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => setConfirmDeleteId(u.id)}>
                                <Trash2 className="h-3 w-3 mr-1" /> Hapus Permanen
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== MONITOR BOT TAB ===== */}
          <TabsContent value="monitor" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Monitor className="h-4 w-4" /> Semua Strategi ({strategies.length})</CardTitle>
                <CardDescription>Strategi dari seluruh user</CardDescription>
              </CardHeader>
              <CardContent>
                {strategies.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Belum ada strategi</p>
                ) : (
                  <div className="space-y-2">
                    {strategies.map((s) => (
                      <div key={s.id} className="border rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${s.isRunning ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} />
                            <span className="font-medium text-sm truncate">{s.name}</span>
                            <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{s.marketSymbol}</span>
                            <span className="text-xs uppercase text-primary font-bold">{s.type}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 ml-4">
                            {s.user ? `${s.user.telegramName || s.user.telegramId}${s.user.telegramUsername ? ` @${s.user.telegramUsername}` : ""}` : "No user"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className={s.realizedPnl >= 0 ? "text-green-600" : "text-red-500"}>
                            PnL: {s.realizedPnl >= 0 ? "+" : ""}{s.realizedPnl.toFixed(4)}
                          </span>
                          <span className="text-muted-foreground">{s.successfulOrders}/{s.totalOrders} orders</span>
                          <Badge variant={s.isRunning ? "default" : "secondary"} className="text-xs">
                            {s.isRunning ? "Running" : "Stopped"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== PAYMENTS TAB ===== */}
          <TabsContent value="payments" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><CreditCard className="h-4 w-4" /> Pending Payments ({payments.length})</CardTitle>
                <CardDescription>Transaksi Saweria yang sedang menunggu konfirmasi</CardDescription>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Tidak ada pending payment</p>
                ) : (
                  <div className="space-y-2">
                    {payments.map((p) => (
                      <div key={p.id} className="border rounded-lg p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-sm">{p.telegramName}</span>
                            {p.telegramUsername && <span className="text-muted-foreground ml-1 text-xs">@{p.telegramUsername}</span>}
                          </div>
                          <Badge variant="outline" className="text-xs">{PLAN_LABELS[p.plan] || p.plan}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span>ID: {p.telegramId}</span>
                          <span>Rp {p.amount.toLocaleString("id")}</span>
                          <span>Donation: {p.donationId}</span>
                          <span>Expires: {formatWIBDate(p.expiresAt)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">Created: {formatWIBDate(p.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== BROADCAST TAB ===== */}
          <TabsContent value="broadcast" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Megaphone className="h-4 w-4" /> Broadcast ke Semua User</CardTitle>
                <CardDescription>Kirim pesan Telegram ke semua user aktif</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBroadcast} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Pesan</Label>
                    <Textarea
                      placeholder="Tulis pesan broadcast di sini... (mendukung Markdown)"
                      value={broadcastMsg}
                      onChange={(e) => setBroadcastMsg(e.target.value)}
                      rows={5}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Mendukung format Markdown Telegram: *bold*, _italic_, `kode`</p>
                  </div>
                  {broadcastResult && (
                    <div className="bg-green-500/10 border border-green-500/30 text-green-600 rounded-lg p-3 text-sm">
                      ✓ Terkirim ke {broadcastResult.sent} user. Gagal: {broadcastResult.failed}
                    </div>
                  )}
                  <Button type="submit" disabled={broadcastLoading || !broadcastMsg.trim()} className="w-full">
                    {broadcastLoading ? "Mengirim..." : `Kirim ke ${activeUsers} User Aktif`}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
