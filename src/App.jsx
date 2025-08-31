import ScientificCalculator from "./components/ScientificCalculator";

export default function App() {
  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center">
      <div className="mx-auto max-w-5xl p-4 w-full">
        {/* Centered Title */}
        <h1 className="text-2xl font-bold mb-4 text-center">Scientific Calculator</h1>

        <ScientificCalculator />
      </div>
    </main>
  );
}
