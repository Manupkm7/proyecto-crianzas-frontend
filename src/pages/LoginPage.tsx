import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { Field, Input } from "../components/FormControls";
import styles from "./css/forms.module.css";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, login, error } = useAuth();

  const [email, setEmail] = useState("admin@crianza.local");
  const [password, setPassword] = useState("");

  // Si ya está logueado, lo mandamos directo al inicio.
  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
      navigate("/");
    } catch {
      // El error ya está en el estado del contexto (AuthContext.error)
    }
  }

  return (
    <div className={styles.public}>
      <section className={styles.publicCard}>
        <div className={styles.center}>
          <h1 className={styles.title}>Sistema de Apoyo a la Crianza</h1>
          <p className={styles.subtitle}>Municipalidad — Panel de gestión</p>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}

          <Field label="Correo electrónico">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Contraseña">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Button type="submit">Iniciar sesión</Button>
        </form>
        <Link to="/login/institucional" className={styles.hintLink}>
          ¿Sos una institución? Ingresá por acá
        </Link>
      </section>
    </div>
  );
}
