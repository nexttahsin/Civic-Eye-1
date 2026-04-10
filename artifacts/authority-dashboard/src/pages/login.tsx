import { Shield } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const email = `${username}@authority.nagarik.seba`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("ব্যবহারকারীর নাম বা পাসওয়ার্ড ভুল।");
      setLoading(false);
    } else {
      setLocation("/dashboard");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-900">
      <Card className="w-[400px] border-slate-700 bg-slate-900 text-slate-100 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-900/50 rounded-full flex items-center justify-center border border-blue-500/30">
            <Shield className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight text-white">নাগরিক সেবা</CardTitle>
            <CardDescription className="text-slate-400 mt-1">Authority Command Center</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-300">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                placeholder="Enter your username"
                data-testid="input-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                placeholder="••••••••"
                data-testid="input-password"
              />
            </div>
            
            {error && (
              <div className="text-sm text-red-400 font-medium text-center" data-testid="error-message">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white border-none"
              disabled={loading}
              data-testid="button-login"
            >
              {loading ? "Authenticating..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
