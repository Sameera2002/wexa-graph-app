import { GraphExplorer } from "@/components/GraphExplorer";

export default function ExplorerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Graph Explorer
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          The full service dependency graph, laid out with a force simulation. Red
          edges mark critical dependencies.
        </p>
      </div>
      <GraphExplorer />
    </div>
  );
}
