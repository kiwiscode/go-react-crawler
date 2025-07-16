/**
 * Custom React hook for making HTTP requests using Axios.
 * Handles loading state, error handling, and response data management.
 * Supports request cancellation to avoid memory leaks on component unmount.
 *
 * Features:
 * - Base URL preset from environment constant (API_URL)
 * - Request and response interceptors (currently pass-through, ready for extension)
 * - AbortController used to cancel ongoing requests on component unmount or new request
 * - Provides `fetchData` method with flexible params: url, method, data, params, headers
 * - Manages and exposes loading, error, and response states for easy UI integration
 *
 * Usage:
 * const { response, error, loading, fetchData } = useAxios();
 *
 * Example:
 * const fetchUser = async () => {
 *   try {
 *     const data = await fetchData({ url: '/user', method: 'GET' });
 *     console.log(data);
 *   } catch (e) {
 *     console.error(e);
 *   }
 * }
 *
 * @returns {Object} { response, error, loading, fetchData }
 */

import { useEffect, useState } from "react";
import axios, { type Method } from "axios";
import { API_URL } from "../constants/env";

// Parameters for the fetchData function, including URL, HTTP method, and optional data, query params, and headers
interface FetchParams {
  url: string;
  method: Method;
  data?: any;
  params?: any;
  headers?: any;
}

const useAxios = () => {
  // Return variable declarations
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Create an AbortController for cancellable requests
  let controller = new AbortController();

  // Create a pre-configured Axios instance with a base URL
  const axiosInstance = axios.create({
    baseURL: API_URL,
  });

  // Attach Axios request interceptor
  // Runs before every request is sent (can be used for auth headers, logging, etc.)
  axiosInstance.interceptors.request.use(
    (config) => config,
    (err) => Promise.reject(err)
  );

  // Attach Axios response interceptor
  // Runs after every response is received (can be used for logging, global error handling, etc.)
  axiosInstance.interceptors.response.use(
    (res) => res,
    (err) => Promise.reject(err)
  );

  // Cleanup effect to abort any ongoing request when the component unmounts
  useEffect(() => {
    return () => {
      controller.abort();
    };
  }, []);

  // The API call function takes url, method, data, params, and headers as parameters — we will provide the necessary values when calling it
  const fetchData = async ({
    url,
    method,
    data = {},
    params = {},
    headers = {},
  }: FetchParams) => {
    // Start loading immediately before the request begins
    setLoading(true);
    // and clear any existing errors
    setError(null);

    // Cancels the previous request if there is one
    controller.abort();
    // Then create a new AbortController → for this request
    controller = new AbortController();

    // Start a try block
    try {
      // Make an Axios request and pass the signal from AbortController to enable cancellation
      const res = await axiosInstance({
        url,
        method,
        data,
        params,
        headers,
        signal: controller.signal,
      });
      setResponse(res.data);
      // Extract only res.data from the returned response
      return res.data;
    } catch (err: any) {
      // Catch errors using the catch block
      if (axios.isCancel(err)) {
        // If the request was aborted, just log it to the console
        console.error("Request cancelled", err.message);
      } else {
        // If it's another error, set the error message to state so it can be used in the UI for user-friendly feedback
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
      // Turn off the loading state in all cases
      setLoading(false);
    }
  };

  return { response, error, loading, fetchData };
};

export default useAxios;
