import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";
import useAxios from "../hooks/useAxios";
import { API_URL } from "../constants/env";
import LoadingSpinner from "../components/ui/loadingSpinner";

const Dashboard = () => {
  const { logout, getToken } = useAuth();
  const { loading, fetchData } = useAxios();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await fetchData({
          url: `${API_URL}/profile`,
          method: "GET",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        });

        setProfile(data.user);
      } catch (err) {
        console.error("Profile error:", err);
      }
    };

    fetchProfile();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-[1290px] mx-auto">
      <div className="p-6">
        <h1 className="text-xl font-bold mb-4">Your Dashboard</h1>
        {profile ? (
          <div className="mb-6">
            <p>
              <strong>Username:</strong> {profile.username}
            </p>
            <p>
              <strong>Email:</strong> {profile.email}
            </p>
          </div>
        ) : (
          <p>Profile not found.</p>
        )}
        <Button onClick={logout}>Log Out</Button>
      </div>
    </div>
  );
};

export default Dashboard;
