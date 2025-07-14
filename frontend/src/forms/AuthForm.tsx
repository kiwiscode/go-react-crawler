import React, { useState } from "react";
import RegisterForm from "./RegisterForm";
import LoginForm from "./LoginForm";

// The AuthForm.tsx component that contains two child components
const AuthForm: React.FC = () => {
  // Use the authMode state to decide whether to display the register or login form
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  return (
    <>
      {/* Pass the 'setAuthMode' function as a prop to child components to allow them to switch the form mode between "login" and "register". 
    This enables the user to toggle between the login and register forms. */}
      {authMode === "register" && <RegisterForm authMode={setAuthMode} />}
      {authMode === "login" && <LoginForm authMode={setAuthMode} />}
    </>
  );
};

export default AuthForm;
