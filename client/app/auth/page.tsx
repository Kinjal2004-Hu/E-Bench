"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [userType, setUserType] = useState<"user" | "consultant">("user");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [barRegistration, setBarRegistration] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [professionalSummary, setProfessionalSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const themeColor = "#C8B48A";
  const themeDark = "#8D7A55";
  const themeBorder = "#E7D9BE";

  const resetForm = () => {
    setUsername("");
    setEmail("");
    setPassword("");
    setLicenseNumber("");
    setBarRegistration("");
    setSpecialization("");
    setProfessionalSummary("");
    setError("");
  };

  const handleSubmit = async () => {
    setError("");

    if (!email || !password || (!isLogin && !username)) {
      setError("Please fill all required fields.");
      return;
    }

    if (
      userType === "consultant" &&
      !isLogin &&
      (!licenseNumber || !barRegistration || !specialization)
    ) {
      setError("Please complete all consultant fields.");
      return;
    }

    try {
      setLoading(true);

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      let endpoint = "";
      let payload = {};

      if (userType === "user" && isLogin) {
        endpoint = "/api/auth/login-user";
        payload = { email, password };
      }

      if (userType === "user" && !isLogin) {
        endpoint = "/api/auth/register-user";
        payload = { fullName: username, email, password };
      }

      if (userType === "consultant" && isLogin) {
        endpoint = "/api/auth/login-consultant";
        payload = { email, password };
      }

      if (userType === "consultant" && !isLogin) {
        endpoint = "/api/auth/register-consultant";
        payload = {
          fullName: username,
          email,
          password,
          licenseNumber,
          barRegistration,
          specialization,
          professionalSummary,
        };
      }

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      localStorage.setItem("userType", userType);

      resetForm();
      router.push(userType === "consultant" ? "/lawyer-dashboard" : "/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
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
          width: "100%",
          maxWidth: "500px",
          background: "#fff",
          borderRadius: 12,
          padding: "40px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.1)",
          border: `1px solid ${themeBorder}`,
        }}
      >
        {/* User Type Toggle */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "30px",
            borderBottom: `2px solid ${themeBorder}`,
            paddingBottom: "16px",
          }}
        >
          <button
            onClick={() => setUserType("user")}
            style={{
              flex: 1,
              padding: "10px",
              background: userType === "user" ? themeColor : "transparent",
              color: userType === "user" ? "#fff" : themeDark,
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >
            User
          </button>
          <button
            onClick={() => setUserType("consultant")}
            style={{
              flex: 1,
              padding: "10px",
              background: userType === "consultant" ? themeColor : "transparent",
              color: userType === "consultant" ? "#fff" : themeDark,
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >
            Consultant
          </button>
        </div>

        <h2
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: themeDark,
            marginBottom: 10,
          }}
        >
          {isLogin 
            ? `Login as ${userType === "consultant" ? "Consultant" : "User"}`
            : `Register as ${userType === "consultant" ? "Consultant" : "User"}`
          }
        </h2>

        <p
          style={{
            fontSize: 14,
            color: "var(--text-light)",
            marginBottom: 25,
          }}
        >
          {userType === "consultant" 
            ? "Access advanced legal tools and connect with clients"
            : "Access AI powered legal intelligence"
          }
        </p>

        {error && (
          <div
            style={{
              marginBottom: 12,
              background: "#FDF1F1",
              color: "#A33A3A",
              border: "1px solid #F1D0D0",
              borderRadius: 6,
              padding: "10px 12px",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {/* Full Name - shown only on register */}
        {!isLogin && (
          <input
            placeholder="Full Name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle}
          />
        )}

        {/* Email */}
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        {/* Password */}
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        {/* Consultant-specific fields */}
        {userType === "consultant" && !isLogin && (
          <>
            <input
              placeholder="License Number"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Bar Registration"
              value={barRegistration}
              onChange={(e) => setBarRegistration(e.target.value)}
              style={inputStyle}
            />
            <select
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              style={{
                ...inputStyle,
                cursor: "pointer",
              }}
            >
              <option value="" disabled>
                Select Specialization
              </option>
              <option value="criminal">Criminal Law</option>
              <option value="civil">Civil Law</option>
              <option value="corporate">Corporate Law</option>
              <option value="family">Family Law</option>
              <option value="intellectual">Intellectual Property</option>
              <option value="labor">Labor Law</option>
              <option value="tax">Tax Law</option>
              <option value="other">Other</option>
            </select>
            <textarea
              placeholder="Professional Summary (Max 200 characters)"
              maxLength={200}
              value={professionalSummary}
              onChange={(e) => setProfessionalSummary(e.target.value)}
              style={{
                ...inputStyle,
                minHeight: "80px",
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
          </>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            background: `linear-gradient(135deg, ${themeDark}, ${themeColor})`,
            color: "#fff",
            border: "none",
            padding: "12px",
            borderRadius: 6,
            fontWeight: 600,
            marginTop: 16,
            cursor: "pointer",
            transition: "all 0.3s ease",
            fontSize: 16,
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 8px 16px rgba(200, 180, 138, 0.3)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {loading ? "Please wait..." : isLogin ? "Login" : "Register"}
        </button>

        {/* Toggle Login/Register */}
        <div
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: 14,
          }}
        >
          {isLogin ? "Don't have an account?" : "Already have an account?"}

          <span
            onClick={() => {
              setIsLogin(!isLogin);
              resetForm();
            }}
            style={{
              marginLeft: 6,
              color: themeColor,
              cursor: "pointer",
              fontWeight: 600,
              transition: "color 0.3s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = themeDark;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = themeColor;
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
  border: "1px solid #E7D9BE",
  fontSize: 14,
  boxSizing: "border-box" as const,
};