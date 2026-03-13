"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const endpoint = isLogin
        ? "http://localhost:4000/api/auth/login"
        : "http://localhost:4000/api/auth/register";

      const body = isLogin
        ? { email, password }
        : { username, email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Something went wrong.");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch {
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--cream)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px",
      }}
    >
      <div
        style={{
          width: "420px",
          background: "#fff",
          borderRadius: 12,
          padding: "40px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.1)",
          border: "1px solid rgba(139,105,20,0.2)",
        }}
      >
        <h2
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "var(--navy)",
            marginBottom: 10,
          }}
        >
          {isLogin ? "Login to E-Bench" : "Create Account"}
        </h2>

        <p
          style={{
            fontSize: 14,
            color: "var(--text-light)",
            marginBottom: 25,
          }}
        >
          Access AI powered legal intelligence
        </p>

        {!isLogin && (
          <input
            placeholder="Full Name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle}
          />
        )}

        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        {error && (
          <p style={{ color: "#c0392b", fontSize: 13, marginBottom: 8 }}>
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            background: "linear-gradient(135deg,#8B6914,#C4963A)",
            color: "#fff",
            border: "none",
            padding: "12px",
            borderRadius: 6,
            fontWeight: 600,
            marginTop: 10,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Please wait..." : isLogin ? "Login" : "Register"}
        </button>

        <div
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: 14,
          }}
        >
          {isLogin ? "Don't have an account?" : "Already have an account?"}

          <span
            onClick={() => { setIsLogin(!isLogin); setError(""); }}
            style={{
              marginLeft: 6,
              color: "#C4963A",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {isLogin ? "Register" : "Login"}
          </span>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "12px",
  borderRadius: 6,
  border: "1px solid #ddd",
  fontSize: 14,
};