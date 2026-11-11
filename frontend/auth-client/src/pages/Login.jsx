import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";

export default function Login() {
  const { login, loginWithGoogle } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleGoogle = async (cred) => {
    const idToken = cred.credential;

    try {
      await loginWithGoogle(idToken);
    } catch (err) {
      console.log("Google login failed", err);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Login</h2>

      <input
        placeholder="email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        placeholder="password"
        type="password"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={() => login(email, password)}>
        Login
      </button>

      <hr />

      <GoogleLogin
        onSuccess={handleGoogle}
        onError={() => console.log("Google failed")}
      />
    </div>
  );
}