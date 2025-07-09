import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthForm from "../forms/AuthForm";

const Main = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    navigate("/dashboard");
  }

  return (
    <div className="max-w-[1290px] mx-auto h-[100vh] flex flex-col justify-center items-center">
      <h1 className="text-[1.5rem] font-extrabold absolute left-[20px] top-[20px]">
        Web Crawler
      </h1>
      <div className="h-[100px]"></div>
      <AuthForm />
    </div>
  );
};

export default Main;
