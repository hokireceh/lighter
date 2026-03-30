import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AlertCircle, Bot, Lock } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(password);
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Login gagal");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Bot className="h-9 w-9 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Hokireceh<span className="text-primary">Pro</span></h1>
          <p className="text-muted-foreground text-sm">Automated Trading Bot untuk Lighter.xyz</p>
        </div>

        <Card>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Login
            </CardTitle>
            <CardDescription>
              Masukkan password yang kamu terima dari bot Telegram setelah pembayaran.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="text"
                  placeholder="Contoh: A1B2C3D4E5"
                  value={password}
                  onChange={(e) => setPassword(e.target.value.toUpperCase())}
                  className="font-mono tracking-widest text-center text-lg"
                  autoComplete="off"
                  autoFocus
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading || !password.trim()}>
                {loading ? "Memverifikasi..." : "Masuk"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>Belum punya password?</p>
          <p>
            Hubungi bot Telegram kami untuk berlangganan.
          </p>
        </div>
      </div>
    </div>
  );
}
