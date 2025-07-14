// I keep env files centrally in a constants folder for easier access and so I don’t have to keep writing import.meta.env all the time
const getEnv = (key: string, defaultValue?: string): string => {
  const value = import.meta.env[key] || defaultValue;

  if (value === undefined) {
    throw Error(`Missing String environment variable for ${key}`);
  }

  return value;
};

export const API_URL = getEnv("VITE_API_URL");
