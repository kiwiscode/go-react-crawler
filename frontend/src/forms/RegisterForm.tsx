import React, { useState } from "react";
import { Input } from "../components/ui/input.tsx";
import { Button } from "../components/ui/button.js";
import { Label } from "../components/ui/label.js";
import { API_URL } from "../constants/env.ts";
import useAxios from "../hooks/useAxios.ts";
import { useAuth } from "../context/AuthContext.tsx";
import { useNavigate } from "react-router-dom";

// Set the authMode when using the auth form, triggered by the click event on the 'Already have an account' section
interface RegisterFormProps {
  authMode: (mode: "login") => void;
}

// Register form input data type definition
interface RegisterFormData {
  username: string;
  email: string;
  password: string;
}

// Pass authMode as a prop
const RegisterForm: React.FC<RegisterFormProps> = ({ authMode }) => {
  const { setToken } = useAuth();
  const navigate = useNavigate();
  const { error, loading, fetchData } = useAxios();

  // Input data
  const [formData, setFormData] = useState<RegisterFormData>({
    username: "",
    email: "",
    password: "",
  });

  // Update form state when input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submission, call register API and process response
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    // Use e.preventDefault(); to prevent the default page reload behavior
    e.preventDefault();

    try {
      // Get the fetchData async function from useAxios use it to send a request to the /register route.
      const data = await fetchData({
        url: `${API_URL}/register`,
        // Set the method to POST
        method: "POST",
        // and pass the input data from the form as the request data
        data: formData,
      });

      // If the response status from /register is 200,
      if (data?.status === 200) {
        // Manually show the initial seed data to the user — this data gives them some ideas for getting started. And store the state that keeps this information in localStorage — no need to put extra load on the database backend
        localStorage.setItem("showSeed", JSON.stringify(true));
        // save the token to localStorage using setToken from useAuth
        setToken(data.token);
        // after the user registers, save the token immediately and then redirect to the dashboard
        // The dashboard is a protected route, and since the token is saved in localStorage,
        // the token state currently holds a value, allowing access to the protected route
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Register error:", err);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center px-4 sm:px-6">
      <div className="w-full max-w-md bg-white dark:bg-[#111111] shadow-md rounded-2xl p-6 sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Create an account
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Start analyzing URLs
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              placeholder="john_doe"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Submitting..." : "Register"}
          </Button>
        </form>

        {error && (
          <p className="text-red-500 mt-4 text-sm text-center">{error}</p>
        )}

        <p className="text-center text-sm mt-6 text-gray-600 dark:text-gray-400">
          Already have an account?{" "}
          <span
            // The button click event used to switch from the register form to the login form triggers authMode, and the mode value is passed to the parent AuthForm.tsx
            onClick={() => authMode("login")}
            className="text-blue-600 hover:underline cursor-pointer"
          >
            Log in
          </span>
        </p>
      </div>
    </div>
  );
};

export default RegisterForm;
