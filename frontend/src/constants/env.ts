const getEnv = (key: string, defaultValue?: string): string => {
  const value = import.meta.env[key] || defaultValue;

  if (value === undefined) {
    throw Error(`Missing String environment variable for ${key}`);
  }

  return value;
};

export const API_URL = getEnv("VITE_API_URL");
