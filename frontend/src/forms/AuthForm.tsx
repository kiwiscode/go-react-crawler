import React, { useState } from "react";
import RegisterForm from "./RegisterForm";
import LoginForm from "./LoginForm";

const AuthForm: React.FC = () => {
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  return (
    <>
      {authMode === "register" && <RegisterForm authMode={setAuthMode} />}
      {authMode === "login" && <LoginForm authMode={setAuthMode} />}
    </>
  );
};

export default AuthForm;
