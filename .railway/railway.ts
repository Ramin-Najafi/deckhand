import { defineRailway, github, project, service } from "railway/iac";

export default defineRailway(() => {
  const deckhand = service("deckhand", {
    source: github("Ramin-Najafi/deckhand", { rootDirectory: "/api" }),
    replicas: { "iad": 1 },
  });

  return project("ingenious-joy", {
    resources: [deckhand],
  });
});
