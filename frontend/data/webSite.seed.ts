export type UrlStatus = "queued" | "running" | "done" | "error";

export interface SelectedUrl {
  id: number;
  url: string;
  status: UrlStatus;
  should_pause: boolean;
}

export const seedData: SelectedUrl[] = [
  {
    id: 1,
    url: "https://www.example.com",
    status: "queued",
    should_pause: false,
  },
  {
    id: 2,
    url: "https://www.github.com",
    status: "queued",
    should_pause: false,
  },
  {
    id: 3,
    url: "https://www.stackoverflow.com",
    status: "queued",
    should_pause: false,
  },
  {
    id: 4,
    url: "https://www.medium.com",
    status: "queued",
    should_pause: false,
  },
  {
    id: 5,
    url: "https://www.reddit.com",
    status: "queued",
    should_pause: false,
  },
  {
    id: 6,
    url: "https://x.com",
    status: "queued",
    should_pause: false,
  },
  {
    id: 7,
    url: "https://x.com/messages",
    status: "queued",
    should_pause: false,
  },
  {
    id: 8,
    url: "https://x.com/home",
    status: "queued",
    should_pause: false,
  },
];
