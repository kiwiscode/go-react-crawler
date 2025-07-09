import React, { useState } from "react";
import { Input } from "../components/ui/input.tsx";
import { Button } from "../components/ui/button.js";
import { Label } from "../components/ui/label.js";
import { API_URL } from "../constants/env.ts";
import useAxios from "../hooks/useAxios.ts";
import { useAuth } from "../context/AuthContext.tsx";
import { useNavigate } from "react-router-dom";

interface RegisterFormProps {
  authMode: (mode: "login") => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ authMode }) => {
  const { setToken } = useAuth();
  const navigate = useNavigate();
  const { error, loading, fetchData } = useAxios();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const data = await fetchData({
        url: `${API_URL}/register`,
        method: "POST",
        data: formData,
      });

      if (data?.status === 200) {
        console.log("data:", data);
        setToken(data.token);
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Register error:", err);
    }
  };

  return (
    <>
      <div className="mb-[3.5rem] text-5xl font-medium">Create an account</div>
      <form
        onSubmit={handleSubmit}
        className="max-w-[300px] w-full flex flex-col gap-[1.5rem]"
      >
        <div className="flex flex-col gap-[6px]">
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

        <div className="flex flex-col gap-[6px]">
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

        <div className="flex flex-col gap-[6px]">
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
      {error && <p className="text-red-500 mt-[1.5rem] text-[14px]">{error}</p>}
      <p className="text-center text-[16px] mt-[1.5rem]">
        Already have an account?{" "}
        <span
          onClick={() => authMode("login")}
          className="hover:underline cursor-pointer text-[#3e68ff]"
        >
          Log in
        </span>
      </p>
    </>
  );
};

export default RegisterForm;
