import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetBotConfig, useUpdateBotConfig } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings as SettingsIcon, Save, KeyRound, ShieldAlert, Search, CheckCircle2, Bell, Bot, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const configSchema = z.object({
  network: z.enum(["mainnet", "testnet"]),
  accountIndex: z.coerce.number().nullable().optional(),
  apiKeyIndex: z.coerce.number().nullable().optional(),
  privateKey: z.string().optional(),
  l1Address: z.string().optional(),
  notifyBotToken: z.string().optional(),
  notifyChatId: z.string().optional(),
  notifyOnBuy: z.boolean().optional(),
  notifyOnSell: z.boolean().optional(),
  notifyOnError: z.boolean().optional(),
  notifyOnStart: z.boolean().optional(),
  notifyOnStop: z.boolean().optional(),
});

type FormData = z.infer<typeof configSchema>;

export default function Settings() {
  const { toast } = useToast();
  const { data: config, isLoading } = useGetBotConfig();
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [detectedBalance, setDetectedBalance] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const updateMutation = useUpdateBotConfig({
    mutation: {
      onSuccess: () => {
        toast({ title: "Settings Saved", description: "Your configuration has been updated." });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to save settings", variant: "destructive" });
      }
    }
  });

  const form = useForm<FormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      network: "mainnet",
      accountIndex: null,
      apiKeyIndex: null,
      privateKey: "",
      l1Address: "",
      notifyBotToken: "",
      notifyChatId: "",
      notifyOnBuy: true,
      notifyOnSell: true,
      notifyOnError: true,
      notifyOnStart: true,
      notifyOnStop: false,
    }
  });

  useEffect(() => {
    if (config) {
      form.reset({
        network: config.network,
        accountIndex: config.accountIndex,
        apiKeyIndex: config.apiKeyIndex,
        l1Address: config.l1Address || "",
        privateKey: "",
        notifyBotToken: "",
        notifyChatId: (config as any).notifyChatId || "",
        notifyOnBuy: config.notifyOnBuy ?? true,
        notifyOnSell: config.notifyOnSell ?? true,
        notifyOnError: config.notifyOnError ?? true,
        notifyOnStart: config.notifyOnStart ?? true,
        notifyOnStop: config.notifyOnStop ?? false,
      });
    }
  }, [config, form]);

  const onSubmit = (data: FormData) => {
    const payload = { ...data };
    if (!payload.privateKey) delete payload.privateKey;
    if (!payload.notifyBotToken) delete payload.notifyBotToken;
    updateMutation.mutate({ data: payload });
  };

  const handleLookupAccount = async () => {
    const l1Address = form.getValues("l1Address");
    if (!l1Address || !l1Address.startsWith("0x")) {
      toast({ title: "Invalid Address", description: "Enter a valid L1 address starting with 0x", variant: "destructive" });
      return;
    }
    setIsLookingUp(true);
    setDetectedBalance(null);
    try {
      const res = await fetch(`/api/config/lookup-account?l1Address=${encodeURIComponent(l1Address)}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Account not found");
      }
      const data = await res.json();
      form.setValue("accountIndex", data.accountIndex);
      setDetectedBalance(data.availableBalance);
      toast({
        title: "Account Found",
        description: `Account Index: ${data.accountIndex} | Balance: ${parseFloat(data.availableBalance).toFixed(2)} USDC`,
      });
    } catch (err: any) {
      toast({ title: "Lookup Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      const res = await fetch("/api/config/test-notification", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "✅ Notifikasi Terkirim!", description: data.message });
      } else {
        toast({ title: "❌ Gagal Kirim Notifikasi", description: data.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">Configure Lighter.xyz API keys and network preferences</p>
      </header>

      {isLoading ? (
        <div className="space-y-6">
          {[1, 2].map(i => (
            <Card key={i} className="glass-panel border-border/50">
              <CardHeader>
                <div className="h-5 w-40 bg-primary/10 animate-pulse rounded" />
                <div className="h-4 w-64 bg-muted animate-pulse rounded mt-1" />
              </CardHeader>
              <CardContent className="space-y-5">
                {[1, 2, 3].map(j => (
                  <div key={j} className="space-y-2">
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-10 w-full bg-muted/50 animate-pulse rounded-lg" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="glass-panel border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" />
                API Credentials
              </CardTitle>
              <CardDescription>
                Obtain these from the Lighter.xyz interface. Required to sign transactions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {config?.hasPrivateKey && (
                <div className="bg-success/10 border border-success/30 text-success px-4 py-3 rounded-lg flex items-center gap-3 text-sm">
                  <ShieldAlert className="w-5 h-5" />
                  <div>
                    <strong>Secure Vault:</strong> A private key is currently configured and stored securely. You only need to enter it below if you want to change it.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Network Environment</Label>
                  <Select value={form.watch("network")} onValueChange={(v: any) => form.setValue("network", v)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mainnet">Mainnet</SelectItem>
                      <SelectItem value="testnet">Testnet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>L1 Address</Label>
                  <div className="flex gap-2">
                    <Input {...form.register("l1Address")} placeholder="0x..." className="bg-background font-mono flex-1" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleLookupAccount}
                      disabled={isLookingUp}
                      className="shrink-0 px-3"
                      title="Auto-detect Account Index from L1 Address"
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Click the search icon to auto-detect your Account Index.</p>
                </div>

                <div className="space-y-2">
                  <Label>Account Index</Label>
                  <div className="relative">
                    <Input type="number" {...form.register("accountIndex")} placeholder="e.g. 720746" className="bg-background font-mono" />
                    {detectedBalance !== null && (
                      <div className="flex items-center gap-1 text-xs text-success mt-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Detected — Balance: {parseFloat(detectedBalance).toFixed(4)} USDC
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>API Key Index</Label>
                  <Input type="number" {...form.register("apiKeyIndex")} placeholder="e.g. 7" className="bg-background font-mono" />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Private Key</Label>
                  <Input 
                    type="password" 
                    {...form.register("privateKey")} 
                    placeholder={config?.hasPrivateKey ? "••••••••••••••••••••••••••••••••" : "Enter private key..."} 
                    className="bg-background font-mono" 
                  />
                  <p className="text-xs text-muted-foreground">Keep this secure. It is required to sign orders on Lighter.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Telegram Notifications
              </CardTitle>
              <CardDescription>
                Configure your Telegram bot to receive trade alerts directly in Telegram.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5" /> Bot Token
                  </Label>
                  <Input
                    type="password"
                    {...form.register("notifyBotToken")}
                    placeholder={config?.hasNotifyBotToken ? "••••••••••••••••••••" : "123456:ABC-DEF..."}
                    className="bg-background font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    Get from <span className="text-primary">@BotFather</span> → /newbot
                    {config?.hasNotifyBotToken && <span className="text-success ml-2">✓ Configured</span>}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5" /> Chat ID
                  </Label>
                  <Input
                    {...form.register("notifyChatId")}
                    placeholder="e.g. 123456789"
                    className="bg-background font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Get from <span className="text-primary">@userinfobot</span> → your numeric ID
                  </p>
                </div>
              </div>
              <div className="border-t border-border/30 pt-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground mb-3">Notification triggers</p>
              {[
                { key: "notifyOnBuy" as const, label: "Buy Order", desc: "Notify when a BUY order is placed" },
                { key: "notifyOnSell" as const, label: "Sell Order", desc: "Notify when a SELL order is placed" },
                { key: "notifyOnError" as const, label: "Errors", desc: "Notify on order errors or failures" },
                { key: "notifyOnStart" as const, label: "Bot Started", desc: "Notify when a bot is started" },
                { key: "notifyOnStop" as const, label: "Bot Stopped / SL/TP", desc: "Notify when a bot stops or triggers SL/TP" },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <Switch
                    checked={form.watch(key) ?? true}
                    onCheckedChange={(v) => form.setValue(key, v)}
                  />
                </div>
              ))}
              </div>
              <div className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestNotification}
                  disabled={isTesting || !config?.hasNotifyBotToken}
                  className="gap-2"
                >
                  {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {isTesting ? "Mengirim..." : "Test Notifikasi"}
                </Button>
                {!config?.hasNotifyBotToken && (
                  <p className="text-xs text-muted-foreground mt-1">Simpan Bot Token dulu untuk mengaktifkan test.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              size="lg" 
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(var(--primary),0.3)]"
              disabled={updateMutation.isPending}
            >
              <Save className="w-5 h-5 mr-2" />
              {updateMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
