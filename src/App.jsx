import ScientificCalculator from "./components/ScientificCalculator";

export default function App() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl p-4">
        <h1 className="text-2xl font-bold mb-4">Scientific Calculator</h1>
        <ScientificCalculator />
      </div>
    </main>
  );
}
