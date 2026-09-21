import { createFileRoute } from "@tanstack/react-router";
import { FactoryApp } from "@/components/factory/app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <FactoryApp />;
}
