import { useEffect, useState, type JSX } from "react";
// Since the stars don't have unique IDs, use the UUID package to generate uuidv4 unique IDs in the map
import { v4 as uuidv4 } from "uuid";

// Define the shape structure of the Star object.
interface Star {
  id: number;
  size: number;
  top: string;
  left: string;
  duration: number;
  delay: number;
  direction: "topLeft" | "topRight";
}

// Generate an array of 'count' Star objects with random properties
const generateStars = (count: number): Star[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    size: Math.random() * 2 + 1, // 1–3px
    top: `${Math.random() * 50}%`,
    left: `${Math.random() * 100}%`,
    duration: Math.random() * 3 + 4,
    delay: Math.random() * 4,
    direction: Math.random() > 0.5 ? "topLeft" : "topRight",
  }));
};

function NotFound(): JSX.Element {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    // Reflect the 'not-found' visit in localStorage
    localStorage.setItem("not-found", "true");
    // Generate 30 stars
    setStars(generateStars(30));
    // Every 4 seconds, update stars:
    // Set up an interval for continuous checking
    const interval = setInterval(() => {
      setStars((prev) => [...prev.slice(-20), ...generateStars(10)]);
    }, 4000);

    // Clear interval on component unmount to avoid memory leaks
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-black text-white flex items-center justify-center">
      {/* Background Image */}
      <div className="absolute inset-0 bg-space"></div>

      {/* Falling Stars */}
      <div className="absolute inset-0 overflow-hidden">
        {stars.map((star) => (
          <div
            key={uuidv4()}
            className={`absolute ${
              star.direction === "topLeft"
                ? "animate-fall-topLeft"
                : "animate-fall-topRight"
            }`}
            style={{
              top: star.top,
              left: star.left,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDuration: `${star.duration}s`,
              animationDelay: `${star.delay}s`,
            }}
          >
            <div className="h-full w-full rounded-full bg-white opacity-80" />
          </div>
        ))}
      </div>

      {/* UFO */}
      <div className="ufo">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/8794272-p5k6GdbD8O2RIat5GWtUGJGkDgXoxf.png"
          alt="UFO"
          width={300}
          height={150}
        />
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-2 text-7xl font-bold text-white header-">404</h1>
        <p className="mb-8 text-xl text-gray-300 paragraph-">
          Oops! Looks like this page got lost in space
        </p>
        <a
          href="/"
          className="px-6 py-3 text-white bg-purple-600 rounded-lg hover:bg-purple-700"
          style={{ fontFamily: "Merriweather, serif" }}
        >
          Return Home
        </a>
      </div>
    </div>
  );
}

export default NotFound;
