import { createFileRoute } from "@tanstack/react-router";
import { BirthdayApp } from "@/components/birthday/BirthdayApp";
import { config } from "@/config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: config.ui.pageTitle },
      { name: "description", content: config.ui.pageDescription },
      { property: "og:title", content: config.ui.pageTitle },
      { property: "og:description", content: config.ui.pageDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <BirthdayApp />;
}
