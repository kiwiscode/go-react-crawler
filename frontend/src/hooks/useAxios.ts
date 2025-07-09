import { useEffect, useState } from "react";
import axios, { type Method } from "axios";
import { API_URL } from "../constants/env";

interface FetchParams {
  url: string;
  method: Method;
  data?: any;
  params?: any;
  headers?: any;
}

const useAxios = () => {
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  let controller = new AbortController();

  const axiosInstance = axios.create({
    baseURL: API_URL,
  });

  axiosInstance.interceptors.request.use(
    (config) => config,
    (err) => Promise.reject(err)
  );

  axiosInstance.interceptors.response.use(
    (res) => res,
    (err) => Promise.reject(err)
  );

  useEffect(() => {
    return () => {
      controller.abort();
    };
  }, []);

  const fetchData = async ({
    url,
    method,
    data = {},
    params = {},
    headers = {},
  }: FetchParams) => {
    setLoading(true);
    setError(null);

    controller.abort();
    controller = new AbortController();

    try {
      const res = await axiosInstance({
        url,
        method,
        data,
        params,
        headers,
        signal: controller.signal,
      });
      setResponse(res.data);
      return res.data;
    } catch (err: any) {
      console.log("error:", error);
      if (axios.isCancel(err)) {
        console.error("Request cancelled", err.message);
      } else {
        setError(
          err.response?.data?.message ||
            err.response?.data?.error ||
            err.response?.data?.errorMessage ||
            err.message ||
            "An error occurred"
        );
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { response, error, loading, fetchData };
};

export default useAxios;
