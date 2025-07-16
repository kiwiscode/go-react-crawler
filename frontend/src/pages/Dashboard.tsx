import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";
import useAxios from "../hooks/useAxios";
import { API_URL } from "../constants/env";
import LoadingSpinner from "../components/LoadingSpinner";
import Table from "../components/Table";
import { Pause, Play, RefreshCcw, Trash2, X } from "lucide-react";
import type { UrlData } from "../types/urlData";
import StatusBadge from "../components/StatusBadge";
import { Input } from "../components/ui/input";
import { seedData } from "../../data/webSite.seed";

// Define URL statuses as string literals: queued, running, done, error
type UrlStatus = "queued" | "running" | "done" | "error";

// Create an interface for selected URL with basic info: id, url, status, should_pause
interface SelectedUrl {
  id: number;
  url: string;
  status: UrlStatus;
  should_pause: boolean;
}

const Dashboard = () => {
  // Get logout function from useAuth to handle user logout
  // Use getToken to retrieve the stored token from the browser
  // This token will be used in API requests for authentication purposes
  const { logout, getToken } = useAuth();

  // Import useAxios hook
  // Extract fetchData method from useAxios for making API calls
  const { fetchData } = useAxios();

  // Initially, the profile loading state is true to show loading bar on first load
  // After the component mounts, useEffect sets loading state to false
  // This toggles the UI from loading bar to the actual profile content
  const [profileLoading, setProfileLoading] = useState<boolean>(true);

  // urls prop will be passed to the Table component
  // These URLs are set inside the fetchProfile function when the page first loads
  // This way, the Table can access the URLs belonging to the user and render them accordingly.
  const [urls, setUrls] = useState<UrlData[]>([]);

  // We assign the data received from fetchProfile to the profile state, enabling us to render the username and email accordingly
  const [profile, setProfile] = useState<any>(null);

  // This state holds the URL we want to analyze and will update based on the input value from the user
  const [url, setUrl] = useState<string>("");

  // State that stores the loading status of the button used to analyze the selected URLs
  const [analyzeLoading, setAnalyzeLoading] = useState<boolean>(false);

  // This state initially holds seed data, which can be modified later
  // It contains the URLs rendered on this page and the data to be sent in API calls
  const [selectedUrls, setSelectedUrls] = useState<SelectedUrl[]>([]);
  const [sendURLs, setToSendURLs] = useState<string[]>([]);

  const [errorMessage, setErrorMessage] = useState<string>("");

  // To prevent the toggle state from being manipulated by the user
  const [isToggling, setIsToggling] = useState<boolean>(false);

  // A regex to validate whether a website input is in the correct format.
  const webSiteRegex =
    /^(https?:\/\/)([\w\-]+\.)+[\w\-]{2,}(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/;

  const [addUrlError, setAddUrlError] = useState<string>("");

  // Get user profile
  const fetchProfile = async () => {
    try {
      const data = await fetchData({
        url: `${API_URL}/profile`,
        method: "GET",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      setUrls(data.urls);
      setProfile(data.user);

      setTimeout(() => {
        setProfileLoading(false);
      }, 500);
    } catch (err) {
      console.error("Profile error:", err);
    }
  };

  useEffect(() => {
    // Show seedData only once on first mount
    if (
      selectedUrls.length === 0 &&
      (localStorage.getItem("showSeed") === "true" || urls.length === 0)
    ) {
      setSelectedUrls(seedData);
    }
  }, []);

  // Add the URLs coming from the seed data to setToSendURLs
  useEffect(() => {
    const urls = seedData.map((item) => item.url);
    setToSendURLs(urls);
  }, []);

  // Trim the URL from the input to remove spaces, then add it to both selectedURLs and setToSendURLs
  const handleAddUrl = () => {
    // If there are analyzed URLs, do not perform the new URL addition
    if (analyzeLoading) return;
    setAddUrlError("");
    setErrorMessage("");
    const trimmedUrl = url.trim();
    if (
      trimmedUrl &&
      webSiteRegex.test(trimmedUrl) &&
      !selectedUrls.find((u) => u.url === trimmedUrl)
    ) {
      // The reason for having both selectedURLs and toSendURLs is that one is mainly for the API call, while the other is primarily for rendering the UI
      setSelectedUrls((prev) => [
        ...prev,
        { id: -1, url: trimmedUrl, status: "queued", should_pause: false },
      ]);
      setToSendURLs((prev) => [...prev, trimmedUrl]);
      setUrl("");
    } else {
      if (!selectedUrls.find((u) => u.url === trimmedUrl)) {
        // A URL cannot be added to the list unless it passes the regex check
        setAddUrlError("Invalid URL. Please enter a valid website address.");
      } else {
        // The same URL cannot be added again
        setAddUrlError("This URL is already in the list.");
      }
    }
  };

  // URLs added to the list can be deleted using the trash bin icon
  const handleRemoveSelectedUrl = (urlToRemove: string) => {
    // Update both URL holder states simultaneously
    setSelectedUrls((prev) => prev.filter((u) => u.url !== urlToRemove));
    setToSendURLs((prev) => prev.filter((u) => u !== urlToRemove));
  };

  // This function starts the bulk analysis — it initiates the analysis of all URLs inside sendURLs at once. Each URL goes through status transitions: first queued, then running, and finally either done or error
  const startBulkAnalysis = async () => {
    // State changes and error resets for UI improvements
    setAnalyzeLoading(true);
    setErrorMessage("");
    setAddUrlError("");

    let failedURLs: string[] = [];
    try {
      // create urls
      const res = await fetchData({
        url: `${API_URL}/analyses/create`,
        method: "POST",
        data: {
          urls: sendURLs,
        },
        headers: {
          // Pass the token in the headers
          // The expected token from us in the backend connection middleware
          Authorization: `Bearer ${getToken()}`,
        },
      });

      // If data exists, use it; otherwise, use an empty array to prevent errors in map functions
      const created = res.data || [];
      const exist = res.existURLs || [];
      const failed = res.failedURLs || [];

      // Save ids
      const createdIds = created.map((item: any) => item.id);
      const existIds = exist.map((item: any) => item.id);

      // Save failed urls
      failedURLs = failed.map((item: any) => item.url);

      // Spread into one array all ids
      const ids = [...createdIds, ...existIds];

      // Spread the elements to a single variable
      const combined = [...created, ...exist];

      // Update the selected URLs displayed in the UI
      setSelectedUrls(combined);

      // Queue one by one
      setTimeout(async () => {
        const res = await fetchData({
          url: `${API_URL}/analyses/queued`,
          method: "POST",
          data: {
            ids: ids,
          },
          headers: {
            // Pass the token in the headers
            // The expected token from us in the backend connection middleware
            Authorization: `Bearer ${getToken()}`,
          },
        });

        // Expected response from the backend:
        //     c.JSON(http.StatusOK, gin.H{
        // "message": "Updated URLs",
        // "data": updatedURLs,
        // })
        // Using this data, we keep the status updated during the 'queued → running → done / error' process each time
        setSelectedUrls(res.data);
      }, 300);

      // Run one by one
      setTimeout(async () => {
        const res = await fetchData({
          url: `${API_URL}/analyses/running`,
          method: "POST",
          data: {
            ids: ids,
          },
          headers: {
            // Pass the token in the headers
            // The expected token from us in the backend connection middleware
            Authorization: `Bearer ${getToken()}`,
          },
        });

        // Expected response from the backend:
        //     c.JSON(http.StatusOK, gin.H{
        // "message": "Updated URLs",
        // "data": updatedURLs,
        // })
        // Using this data, we keep the status updated during the 'queued → running → done / error' process each time
        setSelectedUrls(res.data);
      }, 1000);

      // Get the results one by one as done or error
      setTimeout(async () => {
        const res = await fetchData({
          url: `${API_URL}/analyses/result`,
          method: "POST",
          data: {
            ids: ids,
            failedURLs: failedURLs,
          },
          headers: {
            // Pass the token in the headers
            // The expected token from us in the backend connection middleware
            Authorization: `Bearer ${getToken()}`,
          },
        });

        // Get the items with status 'done' and save all their URLs into this variable
        const analyzedURLs = res.data
          ?.filter((item: any) => item.status === "done")
          .map((item: any) => item.url);

        // Save the URLs of items that are not 'done' yet into this variable so we can continue working with them, as their process is still ongoing
        const filteredUrls = sendURLs.filter(
          (url) => !analyzedURLs.includes(url)
        );
        setToSendURLs(filteredUrls);

        // Similarly, save the unfinished items into selectedURLs as well
        setSelectedUrls(res.data.filter((item: any) => item.status !== "done"));

        // Refresh the profile to get the latest information
        fetchProfile();

        localStorage.setItem("showSeed", JSON.stringify(false));
        // UI Elements update
        setErrorMessage("");
        setAnalyzeLoading(false);
      }, 5000);
    } catch (error: any) {
      // Error handling
      setAnalyzeLoading(false);
      console.error("error:", error);

      if (error?.status === 500) {
        setErrorMessage(error.response.data.error);
      } else if (error?.status === 409) {
        if (selectedUrls.length > 1) {
          setErrorMessage(`Some URLs have already been analyzed`);
        } else {
          setErrorMessage("This URL has already been analyzed.");
        }
      } else {
        setSelectedUrls([]);
        setToSendURLs([]);
      }
    }
  };

  // To stop or start URLs that are currently in the running state
  const toggleShouldPause = async (id: number) => {
    // To prevent the toggle state from being manipulated by the user
    if (isToggling) return;
    setIsToggling(true);
    try {
      // State changes and error resets for UI improvements
      setAnalyzeLoading(false);
      setErrorMessage("");
      setAddUrlError("");

      // toggle url should_pause value
      const data = await fetchData({
        url: `${API_URL}/analyses/${id}/toggle_should_pause`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      // Update the selected URLs shown in the UI based on the should_pause field
      setSelectedUrls((prev) =>
        prev.map((item) =>
          item.id === data.id
            ? { ...item, should_pause: data.should_pause }
            : item
        )
      );

      // Fetch the active (current) profile
      fetchProfile();

      const shouldPause = data.should_pause;

      // If shouldPause is false, then running and done/error statuses can be checked
      if (!shouldPause) {
        // Activate loading since the analysis has restarted
        setAnalyzeLoading(true);
        setTimeout(async () => {
          const res = await fetchData({
            url: `${API_URL}/analyses/running`,
            method: "POST",
            data: {
              ids: [id],
            },
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
          });

          // Update the selected URLs shown in the UI based on the ids field
          const updatedURLId = res.data[0].id;
          setSelectedUrls((prevSelected) =>
            prevSelected.map((urlObj) =>
              urlObj.id === updatedURLId ? res.data[0] : urlObj
            )
          );

          // Fetch the active (current) profile
          fetchProfile();
        }, 600);

        setTimeout(async () => {
          const res = await fetchData({
            url: `${API_URL}/analyses/result`,
            method: "POST",
            data: {
              ids: [id],
            },
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
          });

          const { url, status } = res.data[0];

          // Update the selected URLs shown in the UI based on the url and status field
          setToSendURLs((prevSendURLs) =>
            prevSendURLs.filter((u) => u !== url || status !== "done")
          );

          if (status === "done") {
            setSelectedUrls((prevSelectedURLs) =>
              prevSelectedURLs.filter((item) => item.url !== url)
            );
          }

          if (status === "error") {
            setSelectedUrls((prev) =>
              prev.map((item) =>
                item.url === url ? { ...item, status: "error" } : item
              )
            );
          }

          // Fetch the active (current) profile
          fetchProfile();

          // UI Elements update
          setErrorMessage("");
          setAnalyzeLoading(false);
        }, 5000);
      }
    } catch (error) {
      setAnalyzeLoading(false);

      console.error("error:", error);
    } finally {
      setIsToggling(false);
    }
  };

  // The storage location and types of the data to be received from the Table child component within the state
  const [togglePayload, setTogglePayload] = useState({
    id: null as number | null,
    shouldPause: false,
    data: null as any,
    url: "",
    status: "",
  });

  // A function that performs partial updates on the togglePayload state
  const giveTogglePayload = (payload: Partial<typeof togglePayload>) => {
    setTogglePayload((prev) => ({ ...prev, ...payload }));
  };

  // An effect that runs every time the state change
  useEffect(() => {
    const { id, shouldPause, data, url, status } = togglePayload;

    if (id === null) return;

    setSelectedUrls((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, should_pause: shouldPause } : item
      )
    );

    if (!shouldPause) {
      if (data) {
        setSelectedUrls((prevSelected) =>
          prevSelected.map((urlObj) => (urlObj.id === id ? data : urlObj))
        );
      }

      if (url && status) {
        setToSendURLs((prevSendURLs) =>
          prevSendURLs.filter((u) => u !== url || status !== "done")
        );

        if (status === "done") {
          setSelectedUrls((prevSelectedURLs) =>
            prevSelectedURLs.filter((item) => item && item.url !== url)
          );
        }

        if (status === "error") {
          setSelectedUrls((prev) =>
            prev.map((item) =>
              item.url === url ? { ...item, status: "error" } : item
            )
          );
        }

        fetchProfile();
      }
    }
  }, [togglePayload]);

  // Receive the selected and deleted URLs from the Table child component, and if those URLs exist in the selectedUrls list, remove them from both selectedUrls and sendUrls
  const getDeletedURLs = (data: string[]) => {
    if (data) {
      console.log("data received:", data);

      setToSendURLs((prev) =>
        prev.filter((url: string) => !data.includes(url))
      );
      setSelectedUrls((prev) =>
        prev.filter((item: SelectedUrl) => !data.includes(item.url))
      );
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  console.log("selected urls:", selectedUrls);
  console.log("to send urls:", sendURLs);

  if (profileLoading)
    return (
      <div className="min-h-dvh w-full flex justify-center items-center">
        <LoadingSpinner />
      </div>
    );

  return (
    <div className="w-full min-h-screen px-4 py-6 sm:px-8 md:px-10 bg-white dark:bg-[#111]">
      <div className="max-w-[1290px] mx-auto flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <h1 className="text-2xl font-bold">Your Dashboard</h1>
          <Button
            onClick={logout}
            variant="destructive"
            className="mt-4 sm:mt-0"
          >
            Log Out
          </Button>
        </div>

        {/* Profile Info */}
        <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg shadow">
          {profile ? (
            <>
              <p>
                <strong>Username:</strong> {profile.username}
              </p>
              <p>
                <strong>Email:</strong> {profile.email}
              </p>
            </>
          ) : (
            <p>Profile not found.</p>
          )}
        </div>

        {/* URL Analyze Input */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <Input
              type="text"
              placeholder="Enter URL (must start with http:// or https://)"
              value={url}
              onChange={(e) => {
                setAddUrlError("");
                setUrl(e.target.value);
              }}
              className="w-full sm:w-[400px] rounded-[4px]"
              style={{
                border: "1px solid rgba(0,0,0,0.1)",
                fontSize: "14px",
                backgroundColor: "transparent",
              }}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleAddUrl}
                disabled={!url.trim() || analyzeLoading}
                variant="secondary"
              >
                Add to List
              </Button>
            </div>
          </div>
          {addUrlError && url && (
            <p className="text-red-500 mt-4 text-sm text-center">
              {addUrlError}
            </p>
          )}

          {/* Selected URL List */}
          {selectedUrls.length > 0 && (
            <div className="relative border rounded-md p-4 bg-gray-50 dark:bg-[#1e1e1e] overflow-y-auto max-h-[600px]">
              <span
                onClick={() => {
                  setSelectedUrls([]);
                  setToSendURLs([]);
                }}
                className="absolute right-[16px] cursor-pointer"
              >
                <X />
              </span>
              <h2 className="font-semibold mb-2 mt-[32px]">Selected URLs</h2>
              <ul className="space-y-2">
                {selectedUrls.map((u, index) => (
                  <li
                    key={index}
                    className="flex items-center border-b pb-1 gap-2"
                  >
                    <span className="w-1/2 text-sm break-all truncate">
                      {u.url}
                    </span>
                    <div className="w-1/4 flex items-center gap-3 justify-center ">
                      <button
                        onClick={() => {
                          if (u.status !== "done") {
                            toggleShouldPause(u.id);
                          }
                        }}
                        className={`flex gap-3 items-center ${
                          u.status === "done" && "cursor-default"
                        }`}
                      >
                        {u.should_pause && u.status !== "error" ? (
                          <>
                            <div className="flex items-center gap-1 text-xs px-2 py-[2px] bg-yellow-100 text-yellow-700 rounded-full">
                              <Pause className="w-3.5 h-3.5" />
                              Paused
                            </div>
                            <Play size={16} color="green" />
                          </>
                        ) : (
                          <>
                            <StatusBadge status={u.status} />
                            <>
                              {u.status === "error" ? (
                                <RefreshCcw size={16} color="#008236" />
                              ) : (
                                <Pause
                                  size={16}
                                  color="#f5a623"
                                  className={`${
                                    u.status !== "queued" && u.status !== "done"
                                      ? ""
                                      : "hidden"
                                  }`}
                                />
                              )}
                            </>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="w-1/4 flex justify-end">
                      <button
                        className="cursor-pointer"
                        onClick={() => {
                          handleRemoveSelectedUrl(u.url);
                        }}
                      >
                        <Trash2 size={16} color="#c10007" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {selectedUrls.length ? (
          <>
            <Button
              className="max-w-[200px]"
              disabled={analyzeLoading}
              onClick={startBulkAnalysis}
            >
              {analyzeLoading ? "Analyzing..." : "Analyze Selected URLs"}
            </Button>

            {errorMessage && (
              <p className="text-red-500 mt-4 text-sm text-center">
                {errorMessage}
              </p>
            )}
          </>
        ) : null}

        <Table
          refreshDashboardStatus={getDeletedURLs}
          urls={urls}
          fetchProfile={fetchProfile}
          giveTogglePayload={giveTogglePayload}
        />
      </div>
    </div>
  );
};

export default Dashboard;
