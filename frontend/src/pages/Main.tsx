import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthForm from "../forms/AuthForm";

const Main = () => {
  const navigate = useNavigate();
  // Use the useAuth hook from the context to get the isAuthenticated variable, and if the user is authenticated, redirect them to their dashboard instead of the homepage
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    navigate("/dashboard");
  }

  return (
    // To maintain a nicer appearance and consistent width, the maximum width of this website page is set to max-w-[1290px]. Using mx-auto centers the content on larger screens
    <div className="max-w-[1290px] mx-auto h-[100vh] flex flex-col justify-center items-center">
      <h1 className="text-[1.5rem] font-extrabold absolute left-[20px] top-[20px]">
        Web Crawler
      </h1>
      <div className="h-[100px]"></div>
      {/* On the first page, display the AuthForm component. The AuthForm component internally contains two different forms: register and login forms, and users can switch between them */}
      <AuthForm />
    </div>
  );
};

export default Main;
