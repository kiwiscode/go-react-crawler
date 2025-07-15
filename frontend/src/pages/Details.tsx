import React, { useEffect, useState } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { API_URL } from "../constants/env";
import useAxios from "../hooks/useAxios";
import { useAuth } from "../context/AuthContext";
import { useParams } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";
import type { UrlData } from "../types/urlData";
import { formatDateEU } from "../utils/dateFormatter";
import { Button } from "../components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";

// Register required Chart.js components
ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

type Link = {
  url: string;
  statusCode?: number;
};

const Details: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const { error, loading, fetchData } = useAxios();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<UrlData | null>(null);
  const [chartType, setChartType] = useState<"bar" | "doughnut">("bar");
  const [internalPage, setInternalPage] = useState<number>(1);
  const [externalPage, setExternalPage] = useState<number>(1);
  const linksPerPage: number = 5;
  const [analysisLoading, setAnalysisLoading] = useState<boolean>(true);

  // Helper function for link pagination
  const paginate = (links: Link[], page: number) => {
    const start = (page - 1) * linksPerPage;
    return links?.slice(start, start + linksPerPage);
  };

  // Calculate total pages for pagination
  const totalInternalPages = Math.ceil(
    analysis?.internal_links?.length / linksPerPage
  );
  const totalExternalPages = Math.ceil(
    analysis?.external_links?.length / linksPerPage
  );

  // Fetch analysis details on component mount
  useEffect(() => {
    const fetchAnalysisDetails = async () => {
      try {
        const res = await fetchData({
          url: `${API_URL}/analyses/${id}`,
          method: "GET",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        });

        console.log("response:", res);

        const data: UrlData = res.data;
        setAnalysis(data);

        setTimeout(() => {
          setAnalysisLoading(false);
        }, 500);
      } catch (err) {
        // Error is already handled by useAxios
      }
    };

    fetchAnalysisDetails();
  }, [id]);

  if (analysisLoading)
    return (
      <div className="min-h-dvh w-full flex justify-center items-center">
        <LoadingSpinner />
      </div>
    );

  // Loading & Error States
  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;
  if (!analysis) return <div>No data found.</div>;

  // Chart data configuration
  const chartData = {
    labels: ["Internal Links", "External Links"],
    datasets: [
      {
        label: "Links count",
        data: [analysis.internal_links_count, analysis.external_links_count],
        backgroundColor: ["#36A2EB", "#FF6384"],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "bottom" as const },
      tooltip: { enabled: true },
    },
  };

  return (
    <div className="w-full min-h-screen px-4 py-6 sm:px-8 md:px-10 bg-white dark:bg-[#111]">
      <div className="max-w-[1290px] mx-auto flex flex-col gap-6">
        {/* Back to Dashboard */}
        <div
          className="flex items-center gap-2 mb-4 cursor-pointer text-blue-600 hover:text-blue-800"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft size={20} />
          <span className="underline">Back</span>
        </div>

        {/* Analysis Details */}
        <h1 className="text-[2em]">Details View for Analysis #{analysis.id}</h1>
        <p>
          <strong>URL:</strong> {analysis.url}
        </p>
        <div className="flex gap-3">
          <strong>Status:</strong> <StatusBadge status={analysis.status} />
        </div>
        <p>
          <strong>HTML Version:</strong> {analysis.html_version || "Unknown"}
        </p>
        <p>
          <strong>Last Updated:</strong>{" "}
          {analysis.updated_at ? formatDateEU(analysis.updated_at) : "Unknown"}
        </p>

        {/* Chart Switch Buttons */}
        <div className="flex justify-start gap-3 mt-4">
          <Button
            variant={chartType === "bar" ? "default" : "outline"}
            onClick={() => setChartType("bar")}
          >
            Bar Chart
          </Button>
          <Button
            variant={chartType === "doughnut" ? "default" : "outline"}
            onClick={() => setChartType("doughnut")}
          >
            Donut Chart
          </Button>
        </div>

        {/* Chart */}
        <div style={{ marginTop: 20 }}>
          {chartType === "bar" ? (
            <Bar data={chartData} options={chartOptions} />
          ) : (
            <Doughnut data={chartData} options={chartOptions} />
          )}
        </div>

        {/* Internal & External Links with Pagination */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-6">
          {/* Internal Links */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Internal Links</h2>
              <span className="text-sm text-muted-foreground">
                {analysis.internal_links_count}
              </span>
            </div>
            <ul className="max-h-48 overflow-auto border rounded-md p-2 bg-white dark:bg-[#111]">
              {paginate(analysis?.internal_links, internalPage)?.map(
                (link, i) => (
                  <li
                    key={i}
                    className="truncate py-1 border-b last:border-b-0"
                  >
                    {link.url}
                  </li>
                )
              )}
            </ul>
            {/* Pagination Buttons */}
            <div className="flex justify-between mt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={internalPage === 1}
                onClick={() => setInternalPage(internalPage - 1)}
              >
                Prev
              </Button>
              <span className="self-center text-sm text-muted-foreground">
                {internalPage} / {totalInternalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={internalPage === totalInternalPages}
                onClick={() => setInternalPage(internalPage + 1)}
              >
                Next
              </Button>
            </div>
          </section>

          {/* External Links */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">External Links</h2>
              <span className="text-sm text-muted-foreground">
                {analysis.external_links_count}
              </span>
            </div>
            <ul className="max-h-48 overflow-auto border rounded-md p-2 bg-white dark:bg-[#111]">
              {paginate(analysis.external_links, externalPage)?.map(
                (link, i) => (
                  <li
                    key={i}
                    className="truncate py-1 border-b last:border-b-0"
                  >
                    {link.url}
                  </li>
                )
              )}
            </ul>
            {/* Pagination Buttons */}
            <div className="flex justify-between mt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={externalPage === 1}
                onClick={() => setExternalPage(externalPage - 1)}
              >
                Prev
              </Button>
              <span className="self-center text-sm text-muted-foreground">
                {externalPage} / {totalExternalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={externalPage === totalExternalPages}
                onClick={() => setExternalPage(externalPage + 1)}
              >
                Next
              </Button>
            </div>
          </section>
        </div>

        {/* Broken Links Section */}
        <div style={{ marginTop: 40 }}>
          <h2>Broken Links ({analysis.inaccessible_links_count})</h2>
          {analysis?.inaccessible_links?.length === 0 ? (
            <p>No broken links found.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th
                    style={{
                      borderBottom: "1px solid #ccc",
                      textAlign: "left",
                    }}
                  >
                    URL
                  </th>
                  <th
                    style={{
                      borderBottom: "1px solid #ccc",
                      textAlign: "left",
                    }}
                  >
                    Status Code
                  </th>
                </tr>
              </thead>
              <tbody>
                {analysis?.inaccessible_links?.map(
                  (link: { url: string; statusCode?: number }, i: number) => (
                    <tr key={i}>
                      <td style={{ padding: "8px 0" }}>
                        {link.url ?? "Unknown"}
                      </td>
                      <td style={{ padding: "8px 0" }}>
                        {link.statusCode ?? "Unknown"}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Details;
